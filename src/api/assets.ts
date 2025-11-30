// AI Influencer - Assets API
// Handles listing and managing generated content (images, audio, video)
// NOTE: This is a NEW project, completely separate from ai-singer-studio

import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { getAuth } from '../middleware/auth';
import { getDb } from '../middleware/db';
import * as schema from '../db/schema';
import type { AppContext } from './types';

const app = new Hono<AppContext>();

/**
 * GET /assets - List user's generated content
 * Query params:
 *   - type: filter by asset type (image, audio, video)
 *   - singerId: filter by singer
 *   - limit: results per page (default: 50, max: 100)
 *   - offset: pagination offset
 */
app.get('/', async (c) => {
  try {
    const auth = getAuth(c);
    const db = getDb(c);

    // Parse query parameters
    const type = c.req.query('type') as 'image' | 'audio' | 'video' | undefined;
    const singerId = c.req.query('singerId');
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
    const offset = parseInt(c.req.query('offset') || '0');

    console.log('[ASSETS API] Fetching assets:', {
      userId: auth.userId,
      type,
      singerId,
      limit,
      offset,
    });

    // Build query conditions
    const conditions = [eq(schema.assets.userId, auth.userId)];

    if (type) {
      conditions.push(eq(schema.assets.type, type));
    }

    if (singerId) {
      conditions.push(eq(schema.assets.singerId, singerId));
    }

    // Fetch assets
    const assets = await db
      .select({
        id: schema.assets.id,
        type: schema.assets.type,
        provider: schema.assets.provider,
        url: schema.assets.cdnUrl,
        metadata: schema.assets.metadata,
        createdAt: schema.assets.createdAt,
        singerId: schema.assets.singerId,
        singerName: schema.singers.name,
      })
      .from(schema.assets)
      .leftJoin(schema.singers, eq(schema.assets.singerId, schema.singers.id))
      .where(and(...conditions))
      .orderBy(desc(schema.assets.createdAt))
      .limit(limit)
      .offset(offset);

    // Parse metadata JSON strings and add proxyManifestUrl for segmented videos
    const origin = c.req.header('origin') || '';
    // NOTE: Update the production URL after deploying your worker
    const apiBase = origin.includes('localhost')
      ? 'http://localhost:8787'
      : `https://${c.req.header('host') || 'localhost:8787'}`;

    const assetsWithParsedMetadata = await Promise.all(assets.map(async (asset) => {
      const parsedMetadata = asset.metadata ? JSON.parse(asset.metadata) : null;

      // FIX #53: For segmented video assets, find the job and build proxy manifest URL
      let proxyManifestUrl = null;
      if (asset.type === 'video' && parsedMetadata?.isSegmented) {
        // Look up the job that created this asset
        const [job] = await db
          .select({ id: schema.jobs.id })
          .from(schema.jobs)
          .where(eq(schema.jobs.resultAssetId, asset.id))
          .limit(1);

        if (job) {
          proxyManifestUrl = `${apiBase}/api/manifest/${job.id}`;
          console.log('[ASSETS API] Video asset', asset.id, 'has manifest URL:', proxyManifestUrl);
        }
      }

      return {
        ...asset,
        metadata: parsedMetadata,
        proxyManifestUrl, // FIX #53: Include proxy manifest URL for music videos with audio sync
      };
    }));

    // Get total count for pagination
    const [countResult] = await db
      .select({ count: schema.assets.id })
      .from(schema.assets)
      .where(and(...conditions));

    console.log('[ASSETS API] Found assets:', assetsWithParsedMetadata.length);

    return c.json({
      assets: assetsWithParsedMetadata,
      pagination: {
        total: assets.length,
        limit,
        offset,
        hasMore: assets.length === limit,
      },
    });
  } catch (error) {
    console.error('[ASSETS API] Error:', error);
    return c.json(
      {
        error: 'Failed to fetch assets',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /assets/audio/:singerId - Get audio assets for a specific singer
 * Returns all audio files created for this singer (used by song selector)
 */
app.get('/audio/:singerId', async (c) => {
  try {
    const auth = getAuth(c);
    const db = getDb(c);
    const singerId = c.req.param('singerId');

    console.log('[ASSETS API] Fetching audio assets for singer:', singerId);

    // Verify singer ownership
    const [singer] = await db
      .select()
      .from(schema.singers)
      .where(
        and(
          eq(schema.singers.id, singerId),
          eq(schema.singers.userId, auth.userId)
        )
      )
      .limit(1);

    if (!singer) {
      return c.json({ error: 'Singer not found' }, 404);
    }

    // Fetch songs from songs table (joined with assets for audio URL)
    // FIX: Only join the latest COMPLETED job to prevent duplicates
    const songsData = await db
      .select({
        songId: schema.songs.id,
        title: schema.songs.title,
        duration: schema.songs.duration,
        genre: schema.songs.genre,
        createdAt: schema.songs.createdAt,
        jobId: schema.jobs.id,
        assetId: schema.jobs.resultAssetId,
      })
      .from(schema.songs)
      .leftJoin(
        schema.jobs,
        and(
          eq(schema.songs.id, schema.jobs.songId),
          eq(schema.jobs.status, 'completed')
        )
      )
      .where(
        and(
          eq(schema.songs.userId, auth.userId),
          eq(schema.songs.singerId, singerId),
          eq(schema.songs.status, 'completed')
        )
      )
      .orderBy(desc(schema.songs.createdAt))
      .limit(100);

    // Deduplicate songs (in case a song has multiple completed jobs)
    // Keep only the first occurrence of each unique songId
    const uniqueSongsData = songsData.reduce((acc, song) => {
      if (!acc.some(s => s.songId === song.songId)) {
        acc.push(song);
      }
      return acc;
    }, [] as typeof songsData);

    // Get asset URLs for each song
    const songs = await Promise.all(
      uniqueSongsData.map(async (song) => {
        let audioUrl = null;
        let storageKey = null;

        if (song.assetId) {
          const [asset] = await db
            .select({
              cdnUrl: schema.assets.cdnUrl,
              storageKey: schema.assets.storageKey,
            })
            .from(schema.assets)
            .where(eq(schema.assets.id, song.assetId))
            .limit(1);

          if (asset) {
            audioUrl = asset.cdnUrl;
            storageKey = asset.storageKey;
          }
        }

        return {
          id: song.songId,
          name: song.title || `Song ${song.songId.slice(-8)}`,
          duration: song.duration ? Math.floor(song.duration / 1000) : 30, // Convert ms to seconds
          createdAt: new Date(song.createdAt).toISOString(),
          storageKey: storageKey || '',
          audioUrl: audioUrl || '',
        };
      })
    );

    console.log('[ASSETS API] Found', songs.length, 'audio assets for singer');

    return c.json({ songs });
  } catch (error) {
    console.error('[ASSETS API] Error fetching audio assets:', error);
    return c.json(
      {
        error: 'Failed to fetch audio assets',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /assets/:id - Get specific asset details
 */
app.get('/:id', async (c) => {
  try {
    const auth = getAuth(c);
    const db = getDb(c);
    const assetId = c.req.param('id');

    const [asset] = await db
      .select({
        id: schema.assets.id,
        type: schema.assets.type,
        provider: schema.assets.provider,
        url: schema.assets.cdnUrl,
        r2Key: schema.assets.storageKey,
        metadata: schema.assets.metadata,
        provenance: schema.assets.provenance,
        createdAt: schema.assets.createdAt,
        singerId: schema.assets.singerId,
        singerName: schema.singers.name,
      })
      .from(schema.assets)
      .leftJoin(schema.singers, eq(schema.assets.singerId, schema.singers.id))
      .where(
        and(
          eq(schema.assets.id, assetId),
          eq(schema.assets.userId, auth.userId)
        )
      )
      .limit(1);

    if (!asset) {
      return c.json({ error: 'Asset not found' }, 404);
    }

    // Parse JSON strings
    const assetWithParsedData = {
      ...asset,
      metadata: asset.metadata ? JSON.parse(asset.metadata) : null,
      provenance: asset.provenance ? JSON.parse(asset.provenance) : null,
    };

    return c.json({ asset: assetWithParsedData });
  } catch (error) {
    console.error('[ASSETS API] Error:', error);
    return c.json(
      {
        error: 'Failed to fetch asset',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * DELETE /assets/:id - Delete an asset
 */
app.delete('/:id', async (c) => {
  try {
    const auth = getAuth(c);
    const db = getDb(c);
    const assetId = c.req.param('id');

    // Check ownership
    const [asset] = await db
      .select()
      .from(schema.assets)
      .where(
        and(
          eq(schema.assets.id, assetId),
          eq(schema.assets.userId, auth.userId)
        )
      )
      .limit(1);

    if (!asset) {
      return c.json({ error: 'Asset not found' }, 404);
    }

    // Delete from database
    await db
      .delete(schema.assets)
      .where(eq(schema.assets.id, assetId));

    // TODO: Delete from R2 storage
    // const storageService = new StorageService(c.env.R2_BUCKET);
    // await storageService.delete(asset.r2Key);

    console.log('[ASSETS API] Deleted asset:', assetId);

    return c.json({ success: true, message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('[ASSETS API] Error:', error);
    return c.json(
      {
        error: 'Failed to delete asset',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /assets/stats - Get user's content statistics
 */
app.get('/stats', async (c) => {
  try {
    const auth = getAuth(c);
    const db = getDb(c);

    // Get counts by type
    const assets = await db
      .select({
        type: schema.assets.type,
        id: schema.assets.id,
      })
      .from(schema.assets)
      .where(eq(schema.assets.userId, auth.userId));

    const stats = {
      total: assets.length,
      images: assets.filter(a => a.type === 'image').length,
      videos: assets.filter(a => a.type === 'video').length,
      audio: assets.filter(a => a.type === 'audio').length,
    };

    return c.json({ stats });
  } catch (error) {
    console.error('[ASSETS API] Error:', error);
    return c.json(
      {
        error: 'Failed to fetch stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;

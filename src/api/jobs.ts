// AI Influencer - Jobs API
// Handles job tracking and status monitoring
// NOTE: This is a NEW project, completely separate from ai-singer-studio

import { Hono } from 'hono';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { getAuth } from '../middleware/auth';
import { getDb } from '../middleware/db';
import * as schema from '../db/schema';
import type { AppContext } from './types';

const app = new Hono<AppContext>();

/**
 * GET /jobs - List user's generation jobs
 * Query params:
 *   - status: filter by status (pending, processing, completed, failed, cancelled)
 *   - type: filter by job type (image, song, video)
 *   - singerId: filter by singer
 *   - limit: results per page (default: 50, max: 100)
 *   - offset: pagination offset
 */
app.get('/', async (c) => {
  try {
    const auth = getAuth(c);
    const db = getDb(c);

    // Parse query parameters
    const status = c.req.query('status') as 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | undefined;
    const type = c.req.query('type') as 'image' | 'song' | 'video' | undefined;
    const singerId = c.req.query('singerId');
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
    const offset = parseInt(c.req.query('offset') || '0');

    console.log('[JOBS API] Fetching jobs:', {
      userId: auth.userId,
      userIdLength: auth.userId.length,
      userIdFirst20: auth.userId.substring(0, 20),
      status,
      type,
      singerId,
      limit,
      offset,
    });

    // Build query conditions
    const conditions = [eq(schema.jobs.userId, auth.userId)];

    console.log('[JOBS API] Query userId:', auth.userId);

    if (status) {
      conditions.push(eq(schema.jobs.status, status));
    }

    if (type) {
      conditions.push(eq(schema.jobs.type, type));
    }

    if (singerId) {
      conditions.push(eq(schema.jobs.singerId, singerId));
    }

    // Fetch jobs with singer and asset info
    const jobs = await db
      .select({
        id: schema.jobs.id,
        type: schema.jobs.type,
        provider: schema.jobs.provider,
        status: schema.jobs.status,
        progress: schema.jobs.progress,
        error: schema.jobs.error,
        createdAt: schema.jobs.createdAt,
        updatedAt: schema.jobs.updatedAt,
        singerId: schema.jobs.singerId,
        singerName: schema.singers.name,
        resultAssetId: schema.jobs.resultAssetId,
        assetUrl: schema.assets.cdnUrl,
      })
      .from(schema.jobs)
      .leftJoin(schema.singers, eq(schema.jobs.singerId, schema.singers.id))
      .leftJoin(schema.assets, eq(schema.jobs.resultAssetId, schema.assets.id))
      .where(and(...conditions))
      .orderBy(desc(schema.jobs.createdAt))
      .limit(limit)
      .offset(offset);

    console.log('[JOBS API] Found jobs:', jobs.length);

    // DEBUG: Try direct query without joins to see if that's the issue
    const directJobs = await db
      .select()
      .from(schema.jobs)
      .where(eq(schema.jobs.userId, auth.userId))
      .limit(10);

    console.log('[JOBS API] Direct query (no joins) found:', directJobs.length, 'jobs');
    if (directJobs.length > 0) {
      console.log('[JOBS API] First job userId:', directJobs[0].userId);
      console.log('[JOBS API] First job ID:', directJobs[0].id);
    }

    return c.json({
      jobs,
      pagination: {
        total: jobs.length,
        limit,
        offset,
        hasMore: jobs.length === limit,
      },
    });
  } catch (error) {
    console.error('[JOBS API] Error:', error);
    return c.json(
      {
        error: 'Failed to fetch jobs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /jobs/:id - Get specific job details and status
 */
app.get('/:id', async (c) => {
  try {
    const auth = getAuth(c);
    const db = getDb(c);
    const jobId = c.req.param('id');

    const [job] = await db
      .select({
        id: schema.jobs.id,
        type: schema.jobs.type,
        provider: schema.jobs.provider,
        status: schema.jobs.status,
        progress: schema.jobs.progress,
        error: schema.jobs.error,
        operationId: schema.jobs.operationId,
        createdAt: schema.jobs.createdAt,
        updatedAt: schema.jobs.updatedAt,
        singerId: schema.jobs.singerId,
        singerName: schema.singers.name,
        resultAssetId: schema.jobs.resultAssetId,
        assetUrl: schema.assets.cdnUrl,
        assetType: schema.assets.type,
        // FIX #53: Include asset metadata for music video manifest + audio sync
        assetMetadata: schema.assets.metadata,
      })
      .from(schema.jobs)
      .leftJoin(schema.singers, eq(schema.jobs.singerId, schema.singers.id))
      .leftJoin(schema.assets, eq(schema.jobs.resultAssetId, schema.assets.id))
      .where(
        and(
          eq(schema.jobs.id, jobId),
          eq(schema.jobs.userId, auth.userId)
        )
      )
      .limit(1);

    if (!job) {
      return c.json({ error: 'Job not found' }, 404);
    }

    // FIX #53: Log job data for debugging audio sync
    console.log('[JOBS API] Job lookup result:', {
      jobId,
      status: job.status,
      resultAssetId: job.resultAssetId,
      assetUrl: job.assetUrl,
      assetType: job.assetType,
      hasAssetMetadata: !!job.assetMetadata,
      assetMetadataRaw: job.assetMetadata?.substring?.(0, 200) || job.assetMetadata,
    });

    // FIX #53: Parse asset metadata to extract manifestUrl for music videos
    let parsedMetadata = null;
    if (job.assetMetadata) {
      try {
        parsedMetadata = typeof job.assetMetadata === 'string'
          ? JSON.parse(job.assetMetadata)
          : job.assetMetadata;
        console.log('[JOBS API] Parsed metadata:', {
          isSegmented: parsedMetadata?.isSegmented,
          manifestUrl: parsedMetadata?.manifestUrl,
          segmentCount: parsedMetadata?.segmentCount,
          totalDurationMs: parsedMetadata?.totalDurationMs,
        });
      } catch (e) {
        console.warn('[JOBS API] Failed to parse asset metadata:', e);
      }
    } else {
      console.log('[JOBS API] No assetMetadata found on job - manifestUrl will be null');
    }

    // FIX #53B: Return proxy URL instead of direct R2 URL to bypass CORS
    // Frontend calls /api/manifest/:jobId which proxies to R2 with proper CORS headers
    let proxyManifestUrl = null;
    if (parsedMetadata?.isSegmented && jobId) {
      // Build proxy URL based on current request origin
      // NOTE: Update the production URL after deploying your worker
      const origin = c.req.header('origin') || '';
      const apiBase = origin.includes('localhost')
        ? 'http://localhost:8787'  // Local dev
        : `https://${c.req.header('host') || 'localhost:8787'}`;  // Production (dynamic)
      proxyManifestUrl = `${apiBase}/api/manifest/${jobId}`;
      console.log('[JOBS API] Using proxy manifest URL:', proxyManifestUrl);
    }

    return c.json({
      job: {
        ...job,
        // FIX #53B: Return proxy URL for manifest to bypass CORS
        manifestUrl: proxyManifestUrl,
        isSegmented: parsedMetadata?.isSegmented || false,
        totalDurationMs: parsedMetadata?.totalDurationMs || null,
      }
    });
  } catch (error) {
    console.error('[JOBS API] Error:', error);
    return c.json(
      {
        error: 'Failed to fetch job',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * DELETE /jobs/:id - Cancel a job
 * FIX #25 & #27: Mark jobs as cancelled instead of deleting
 * Prevents zombie processing and wasted compute costs
 */
app.delete('/:id', async (c) => {
  try {
    const auth = getAuth(c);
    const db = getDb(c);
    const jobId = c.req.param('id');

    // Check ownership
    const [job] = await db
      .select()
      .from(schema.jobs)
      .where(
        and(
          eq(schema.jobs.id, jobId),
          eq(schema.jobs.userId, auth.userId)
        )
      )
      .limit(1);

    if (!job) {
      return c.json({ error: 'Job not found' }, 404);
    }

    // Don't allow cancelling already completed/failed/cancelled jobs
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return c.json(
        {
          error: `Cannot cancel ${job.status} job`,
          status: job.status
        },
        400
      );
    }

    // Mark as cancelled (don't delete to maintain history)
    // FIX #25: Queue consumers will check this flag before expensive operations
    await db
      .update(schema.jobs)
      .set({
        status: 'cancelled',
        error: 'Cancelled by user',
        updatedAt: Date.now(),
      })
      .where(eq(schema.jobs.id, jobId));

    console.log('[JOBS API] Cancelled job:', jobId, 'previous status:', job.status);

    // FIX HIGH #2: Cleanup R2 objects and cancel Kie.ai operations
    // Run cleanup in background (don't block response)
    const env = c.env as any;
    if (env.KIE_API_KEY && env.VIDEO_ASSETS) {
      console.log('[JOBS API] Starting background cleanup for cancelled job:', jobId);
      c.executionCtx.waitUntil(
        (async () => {
          try {
            const { cleanupFailedJob } = await import('../lib/cleanup');
            await cleanupFailedJob(db, jobId, env.KIE_API_KEY, env.VIDEO_ASSETS);
            console.log('[JOBS API] ✅ Cleanup completed for cancelled job:', jobId);
          } catch (cleanupError) {
            console.error('[JOBS API] ⚠️ Cleanup failed for cancelled job:', jobId, cleanupError);
            // Don't fail the request - cleanup is best-effort
          }
        })()
      );
    }

    return c.json({
      success: true,
      message: 'Job cancelled successfully',
      previousStatus: job.status
    });
  } catch (error) {
    console.error('[JOBS API] Error:', error);
    return c.json(
      {
        error: 'Failed to cancel job',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /jobs/stats - Get user's job statistics
 */
app.get('/stats', async (c) => {
  try {
    const auth = getAuth(c);
    const db = getDb(c);

    // Get counts by status
    const jobs = await db
      .select({
        status: schema.jobs.status,
        type: schema.jobs.type,
        id: schema.jobs.id,
      })
      .from(schema.jobs)
      .where(eq(schema.jobs.userId, auth.userId));

    const stats = {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      cancelled: jobs.filter(j => j.status === 'cancelled').length, // FIX #25
      byType: {
        image: jobs.filter(j => j.type === 'image').length,
        song: jobs.filter(j => j.type === 'song').length,
        video: jobs.filter(j => j.type === 'video').length,
      },
    };

    return c.json({ stats });
  } catch (error) {
    console.error('[JOBS API] Error:', error);
    return c.json(
      {
        error: 'Failed to fetch job stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /jobs/:id/retry - Retry a failed job
 */
app.post('/:id/retry', async (c) => {
  try {
    const auth = getAuth(c);
    const db = getDb(c);
    const jobId = c.req.param('id');

    // Check ownership and status
    const [job] = await db
      .select()
      .from(schema.jobs)
      .where(
        and(
          eq(schema.jobs.id, jobId),
          eq(schema.jobs.userId, auth.userId)
        )
      )
      .limit(1);

    if (!job) {
      return c.json({ error: 'Job not found' }, 404);
    }

    if (job.status !== 'failed') {
      return c.json(
        { error: 'Only failed jobs can be retried' },
        400
      );
    }

    // Reset job to pending
    await db
      .update(schema.jobs)
      .set({
        status: 'pending',
        progress: 0,
        error: null,
        updatedAt: Date.now(),
      })
      .where(eq(schema.jobs.id, jobId));

    // TODO: Re-queue the job
    // await jobQueue.enqueue(jobId);

    console.log('[JOBS API] Retried job:', jobId);

    return c.json({
      success: true,
      message: 'Job queued for retry',
      jobId,
    });
  } catch (error) {
    console.error('[JOBS API] Error:', error);
    return c.json(
      {
        error: 'Failed to retry job',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;

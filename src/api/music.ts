// AI Singer Studio - Music Generation API
// Studio Mode: Professional music creation workflow with version history

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getAuth } from '../middleware/auth';
import { getDb } from '../middleware/db';
import * as schema from '../db/schema';
import { JobManager } from '../services/jobs';
import { createElevenLabsAdapter } from '../providers/elevenlabs';
import type { AppContext } from './types';

const app = new Hono<AppContext>();

/**
 * Schema Definitions
 */

// Create new song
const createSongSchema = z.object({
  singerId: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  genre: z.string().max(50).optional(),
  mood: z.array(z.string()).max(5).optional(),
  bpm: z.number().min(40).max(200).default(120),
  key: z.string().max(20).default('C major'),
});

// Add/update lyrics
const updateLyricsSchema = z.object({
  text: z.string().min(1).max(10000),
  sections: z.array(z.object({
    type: z.enum(['intro', 'verse', 'chorus', 'bridge', 'outro', 'pre-chorus', 'post-chorus']),
    name: z.string().max(50).optional(),
    text: z.string(),
    order: z.number(),
  })).optional(),
  language: z.string().max(10).default('en'),
  writtenBy: z.string().max(100).optional(),
});

// Define song structure
const updateStructureSchema = z.object({
  structure: z.array(z.object({
    type: z.enum(['intro', 'verse', 'chorus', 'bridge', 'outro', 'pre-chorus', 'post-chorus']),
    name: z.string().max(50).optional(),
    order: z.number(),
    durationMs: z.number().optional(),
    notes: z.string().max(500).optional(),
  })),
});

// Generate audio version
const generateVersionSchema = z.object({
  prompt: z.string().min(10).max(1000),
  lyricVersionId: z.string().optional(),
  vocalSettings: z.object({
    emotion: z.enum(['neutral', 'happy', 'sad', 'angry', 'fearful', 'surprised']).optional(),
    delivery: z.enum(['natural', 'expressive', 'dramatic', 'soft', 'powerful']).optional(),
    effects: z.array(z.enum(['reverb', 'delay', 'chorus', 'distortion'])).optional(),
  }).optional(),
  mixSettings: z.object({
    instrumentalVolume: z.number().min(0).max(1).default(0.7),
    vocalVolume: z.number().min(0).max(1).default(1.0),
    masteringStyle: z.enum(['clean', 'warm', 'bright', 'punchy']).default('clean'),
  }).optional(),
  stylePreset: z.string().max(100).optional(),
});

/**
 * POST /music/songs - Create new song
 */
app.post('/songs', zValidator('json', createSongSchema), async (c) => {
  try {
    const auth = getAuth(c);
    const db = getDb(c);
    const input = c.req.valid('json');

    console.log('[MUSIC] 🎵 Creating new song:', input.title);

    // Verify singer ownership
    const [singer] = await db
      .select()
      .from(schema.singers)
      .where(
        and(
          eq(schema.singers.id, input.singerId),
          eq(schema.singers.userId, auth.userId)
        )
      )
      .limit(1);

    if (!singer) {
      return c.json({ error: 'Singer not found' }, 404);
    }

    // Create song
    const songId = nanoid();
    const now = Date.now();

    await db.insert(schema.songs).values({
      id: songId,
      userId: auth.userId,
      singerId: input.singerId,
      title: input.title,
      description: input.description,
      genre: input.genre,
      mood: input.mood ? JSON.stringify(input.mood) : null,
      bpm: input.bpm,
      key: input.key,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    });

    // Fetch created song
    const [song] = await db
      .select()
      .from(schema.songs)
      .where(eq(schema.songs.id, songId))
      .limit(1);

    console.log('[MUSIC] ✅ Song created:', songId);

    return c.json({ song }, 201);
  } catch (error) {
    console.error('[MUSIC] ❌ Create song error:', error);
    return c.json(
      { error: 'Failed to create song', message: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * GET /music/songs - List user's songs
 */
app.get('/songs', async (c) => {
  try {
    const auth = getAuth(c);
    const db = getDb(c);

    const singerId = c.req.query('singerId');
    const status = c.req.query('status');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    console.log('[MUSIC] 📋 Listing songs for user:', auth.userId);

    // Build query conditions
    const conditions = [eq(schema.songs.userId, auth.userId)];
    if (singerId) {
      conditions.push(eq(schema.songs.singerId, singerId));
    }
    if (status) {
      conditions.push(eq(schema.songs.status, status));
    }

    const songs = await db
      .select()
      .from(schema.songs)
      .where(and(...conditions))
      .orderBy(desc(schema.songs.createdAt))
      .limit(limit)
      .offset(offset);

    console.log('[MUSIC] ✅ Found', songs.length, 'songs');

    return c.json({ songs });
  } catch (error) {
    console.error('[MUSIC] ❌ List songs error:', error);
    return c.json({ error: 'Failed to list songs' }, 500);
  }
});

/**
 * GET /music/songs/:id - Get song details with versions
 */
app.get('/songs/:id', async (c) => {
  try {
    const auth = getAuth(c);
    const db = getDb(c);
    const songId = c.req.param('id');

    console.log('[MUSIC] 🔍 Fetching song:', songId);

    // Get song
    const [song] = await db
      .select()
      .from(schema.songs)
      .where(
        and(
          eq(schema.songs.id, songId),
          eq(schema.songs.userId, auth.userId)
        )
      )
      .limit(1);

    if (!song) {
      return c.json({ error: 'Song not found' }, 404);
    }

    // Get all versions
    const versions = await db
      .select()
      .from(schema.songVersions)
      .where(eq(schema.songVersions.songId, songId))
      .orderBy(desc(schema.songVersions.versionNumber));

    // Get lyrics if exists
    const [lyrics] = await db
      .select()
      .from(schema.lyrics)
      .where(eq(schema.lyrics.songId, songId))
      .limit(1);

    let lyricVersions = [];
    if (lyrics) {
      lyricVersions = await db
        .select()
        .from(schema.lyricVersions)
        .where(eq(schema.lyricVersions.lyricsId, lyrics.id))
        .orderBy(desc(schema.lyricVersions.versionNumber));
    }

    // Get structure sections
    const sections = await db
      .select()
      .from(schema.sections)
      .where(eq(schema.sections.songVersionId, song.activeVersionId || ''))
      .orderBy(schema.sections.order);

    console.log('[MUSIC] ✅ Song fetched with', versions.length, 'versions');

    return c.json({
      song,
      versions,
      lyrics: lyrics || null,
      lyricVersions,
      sections,
    });
  } catch (error) {
    console.error('[MUSIC] ❌ Get song error:', error);
    return c.json({ error: 'Failed to get song' }, 500);
  }
});

/**
 * POST /music/songs/:id/lyrics - Add/update lyrics
 */
app.post('/songs/:id/lyrics', zValidator('json', updateLyricsSchema), async (c) => {
  try {
    const auth = getAuth(c);
    const db = getDb(c);
    const songId = c.req.param('id');
    const input = c.req.valid('json');

    console.log('[MUSIC] 📝 Updating lyrics for song:', songId);

    // Verify song ownership
    const [song] = await db
      .select()
      .from(schema.songs)
      .where(
        and(
          eq(schema.songs.id, songId),
          eq(schema.songs.userId, auth.userId)
        )
      )
      .limit(1);

    if (!song) {
      return c.json({ error: 'Song not found' }, 404);
    }

    // Get or create lyrics entity
    let [lyrics] = await db
      .select()
      .from(schema.lyrics)
      .where(eq(schema.lyrics.songId, songId))
      .limit(1);

    if (!lyrics) {
      const lyricsId = nanoid();
      await db.insert(schema.lyrics).values({
        id: lyricsId,
        songId,
        createdAt: Date.now(),
      });

      [lyrics] = await db
        .select()
        .from(schema.lyrics)
        .where(eq(schema.lyrics.id, lyricsId))
        .limit(1);
    }

    // Get current version count
    const existingVersions = await db
      .select()
      .from(schema.lyricVersions)
      .where(eq(schema.lyricVersions.lyricsId, lyrics.id));

    const versionNumber = existingVersions.length + 1;

    // Create new lyric version
    const lyricVersionId = nanoid();
    await db.insert(schema.lyricVersions).values({
      id: lyricVersionId,
      lyricsId: lyrics.id,
      versionNumber,
      text: input.text,
      sections: input.sections ? JSON.stringify(input.sections) : null,
      language: input.language,
      writtenBy: input.writtenBy,
      tokenCount: input.text.split(/\s+/).length,
      createdAt: Date.now(),
    });

    // Update lyrics active version
    await db
      .update(schema.lyrics)
      .set({ activeVersionId: lyricVersionId })
      .where(eq(schema.lyrics.id, lyrics.id));

    // Update song timestamp
    await db
      .update(schema.songs)
      .set({ updatedAt: Date.now() })
      .where(eq(schema.songs.id, songId));

    console.log('[MUSIC] ✅ Lyrics updated, version:', versionNumber);

    return c.json({ lyricVersionId, versionNumber });
  } catch (error) {
    console.error('[MUSIC] ❌ Update lyrics error:', error);
    return c.json({ error: 'Failed to update lyrics' }, 500);
  }
});

/**
 * POST /music/songs/:id/structure - Define song structure
 */
app.post('/songs/:id/structure', zValidator('json', updateStructureSchema), async (c) => {
  try {
    const auth = getAuth(c);
    const db = getDb(c);
    const songId = c.req.param('id');
    const input = c.req.valid('json');

    console.log('[MUSIC] 🎼 Updating structure for song:', songId);

    // Verify song ownership
    const [song] = await db
      .select()
      .from(schema.songs)
      .where(
        and(
          eq(schema.songs.id, songId),
          eq(schema.songs.userId, auth.userId)
        )
      )
      .limit(1);

    if (!song) {
      return c.json({ error: 'Song not found' }, 404);
    }

    // Update song structure metadata
    await db
      .update(schema.songs)
      .set({
        structure: JSON.stringify(input.structure),
        updatedAt: Date.now(),
      })
      .where(eq(schema.songs.id, songId));

    console.log('[MUSIC] ✅ Structure updated with', input.structure.length, 'sections');

    return c.json({ success: true, sectionCount: input.structure.length });
  } catch (error) {
    console.error('[MUSIC] ❌ Update structure error:', error);
    return c.json({ error: 'Failed to update structure' }, 500);
  }
});

/**
 * POST /music/songs/:id/generate - Generate audio version
 */
app.post('/songs/:id/generate', zValidator('json', generateVersionSchema), async (c) => {
  try {
    const auth = getAuth(c);
    const db = getDb(c);
    const songId = c.req.param('id');
    const input = c.req.valid('json');

    console.log('[MUSIC] 🎤 Generating version for song:', songId);

    // Verify song ownership
    const [song] = await db
      .select()
      .from(schema.songs)
      .where(
        and(
          eq(schema.songs.id, songId),
          eq(schema.songs.userId, auth.userId)
        )
      )
      .limit(1);

    if (!song) {
      return c.json({ error: 'Song not found' }, 404);
    }

    // Get singer for voice settings
    const [singer] = await db
      .select()
      .from(schema.singers)
      .where(eq(schema.singers.id, song.singerId))
      .limit(1);

    if (!singer) {
      return c.json({ error: 'Singer not found' }, 404);
    }

    // Get current version count
    const existingVersions = await db
      .select()
      .from(schema.songVersions)
      .where(eq(schema.songVersions.songId, songId));

    const versionNumber = existingVersions.length + 1;

    // Get lyrics if lyricVersionId provided
    let lyrics = null;
    if (input.lyricVersionId) {
      [lyrics] = await db
        .select()
        .from(schema.lyricVersions)
        .where(eq(schema.lyricVersions.id, input.lyricVersionId))
        .limit(1);
    }

    // Enhance prompt with singer's style and song metadata
    const voiceSettings = singer.voiceSettings ? JSON.parse(singer.voiceSettings) : null;
    const stylePreferences = singer.stylePreferences ? JSON.parse(singer.stylePreferences) : null;

    let enhancedPrompt = input.prompt;
    if (stylePreferences) {
      const { enhancePromptWithVoiceStyle } = await import('../lib/voice-style');
      enhancedPrompt = enhancePromptWithVoiceStyle(input.prompt, stylePreferences);
    }

    // Add musical context
    enhancedPrompt += ` [BPM: ${song.bpm}, Key: ${song.key}, Genre: ${song.genre || 'unspecified'}]`;

    // Create job for generation
    const elevenLabsAdapter = createElevenLabsAdapter(c.env.ELEVENLABS_API_KEY);
    const jobManager = new JobManager(db, c.env.JOB_QUEUE, {
      elevenlabs: elevenLabsAdapter,
    } as any);

    const job = await jobManager.createJob(
      auth.userId,
      song.singerId,
      'audio',
      'elevenlabs',
      {
        prompt: enhancedPrompt,
        lyrics: lyrics?.text,
        genre: song.genre,
        mood: song.mood ? JSON.parse(song.mood) : undefined,
        metadata: {
          songId,
          versionNumber,
          voiceId: voiceSettings?.voiceId,
          voiceStyle: stylePreferences,
          vocalSettings: input.vocalSettings,
          mixSettings: input.mixSettings,
          stylePreset: input.stylePreset,
        },
      } as any
    );

    // Create song version record
    const versionId = nanoid();
    await db.insert(schema.songVersions).values({
      id: versionId,
      songId,
      versionNumber,
      status: 'generating',
      prompt: enhancedPrompt,
      lyricVersionId: input.lyricVersionId,
      structure: song.structure,
      vocalSettings: input.vocalSettings ? JSON.stringify(input.vocalSettings) : null,
      mixSettings: input.mixSettings ? JSON.stringify(input.mixSettings) : null,
      voiceSettings: voiceSettings ? JSON.stringify(voiceSettings) : null,
      stylePreset: input.stylePreset,
      jobId: job.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update song status
    await db
      .update(schema.songs)
      .set({
        status: 'generating',
        activeVersionId: versionId,
        updatedAt: Date.now(),
      })
      .where(eq(schema.songs.id, songId));

    console.log('[MUSIC] ✅ Version generation started:', versionNumber);

    return c.json(
      {
        versionId,
        versionNumber,
        jobId: job.id,
        status: 'generating',
        estimatedCompletionSeconds: 60,
      },
      202
    );
  } catch (error) {
    console.error('[MUSIC] ❌ Generate version error:', error);
    return c.json({ error: 'Failed to generate version' }, 500);
  }
});

/**
 * POST /music/songs/:id/versions/:versionId/activate - Set active version
 */
app.post('/songs/:id/versions/:versionId/activate', async (c) => {
  try {
    const auth = getAuth(c);
    const db = getDb(c);
    const songId = c.req.param('id');
    const versionId = c.req.param('versionId');

    console.log('[MUSIC] 🔄 Activating version:', versionId);

    // Verify song ownership
    const [song] = await db
      .select()
      .from(schema.songs)
      .where(
        and(
          eq(schema.songs.id, songId),
          eq(schema.songs.userId, auth.userId)
        )
      )
      .limit(1);

    if (!song) {
      return c.json({ error: 'Song not found' }, 404);
    }

    // Verify version exists
    const [version] = await db
      .select()
      .from(schema.songVersions)
      .where(
        and(
          eq(schema.songVersions.id, versionId),
          eq(schema.songVersions.songId, songId)
        )
      )
      .limit(1);

    if (!version) {
      return c.json({ error: 'Version not found' }, 404);
    }

    // Update song active version
    await db
      .update(schema.songs)
      .set({
        activeVersionId: versionId,
        updatedAt: Date.now(),
      })
      .where(eq(schema.songs.id, songId));

    console.log('[MUSIC] ✅ Version activated:', versionId);

    return c.json({ success: true, activeVersionId: versionId });
  } catch (error) {
    console.error('[MUSIC] ❌ Activate version error:', error);
    return c.json({ error: 'Failed to activate version' }, 500);
  }
});

/**
 * DELETE /music/songs/:id - Delete song
 */
app.delete('/songs/:id', async (c) => {
  try {
    const auth = getAuth(c);
    const db = getDb(c);
    const songId = c.req.param('id');

    console.log('[MUSIC] 🗑️ Deleting song:', songId);

    // Verify song ownership
    const [song] = await db
      .select()
      .from(schema.songs)
      .where(
        and(
          eq(schema.songs.id, songId),
          eq(schema.songs.userId, auth.userId)
        )
      )
      .limit(1);

    if (!song) {
      return c.json({ error: 'Song not found' }, 404);
    }

    // Delete song (cascade will handle related records)
    await db
      .delete(schema.songs)
      .where(eq(schema.songs.id, songId));

    console.log('[MUSIC] ✅ Song deleted');

    return c.json({ success: true });
  } catch (error) {
    console.error('[MUSIC] ❌ Delete song error:', error);
    return c.json({ error: 'Failed to delete song' }, 500);
  }
});

export default app;

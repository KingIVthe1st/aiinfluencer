// AI Singer Studio - Content Generation API

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, and } from 'drizzle-orm';
import { getAuth } from '../middleware/auth';
import { getDb } from '../middleware/db';
import {
  generateImageSchema,
  generateAudioSchema,
  generateVideoSchema,
  type GenerateImageInput,
  type GenerateAudioInput,
  type GenerateVideoInput,
} from './schemas';
import * as schema from '../db/schema';
import { JobManager } from '../services/jobs';
import { QuotaService, getQuotaLimits } from '../services/quota';
import { createGeminiAdapter } from '../providers/gemini';
import { createElevenLabsAdapter } from '../providers/elevenlabs';
import { createSora2Adapter } from '../providers/sora2';
import { createVeo3Adapter } from '../providers/veo3';
import { createOpenAIDalleAdapter } from '../providers/openai-dalle';
import type { AppContext } from './types';

const app = new Hono<AppContext>();

/**
 * POST /generate/image - Generate AI image
 */
app.post('/image', zValidator('json', generateImageSchema), async (c) => {
  try {
    console.log('[GENERATE IMAGE] 🎨 Starting image generation');

    const auth = getAuth(c);
    const db = getDb(c);
    console.log('[GENERATE IMAGE] ✅ Auth retrieved:', auth.userId);

    const input = c.req.valid('json') as GenerateImageInput;
    console.log('[GENERATE IMAGE] 📝 Input:', JSON.stringify(input));

    // Check singer ownership (optional for preview mode)
    let singer: typeof schema.singers.$inferSelect | undefined;

    if (input.singerId) {
      const [foundSinger] = await db
        .select()
        .from(schema.singers)
        .where(
          and(
            eq(schema.singers.id, input.singerId),
            eq(schema.singers.userId, auth.userId)
          )
        )
        .limit(1);

      if (!foundSinger) {
        console.log('[GENERATE IMAGE] ⚠️  Singer not found (continuing without singer):', input.singerId);
        // Continue without singer instead of failing - allows generation with invalid/stale singer IDs
        singer = undefined;
      } else {
        singer = foundSinger;
        console.log('[GENERATE IMAGE] ✅ Singer found:', singer.name);
      }
    } else {
      console.log('[GENERATE IMAGE] 🎨 Preview mode (no singer associated)');
    }

    // Get user's subscription tier
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, auth.userId))
      .limit(1);

    const tier = user?.subscriptionTier || 'starter';
    console.log('[GENERATE IMAGE] 📊 User tier:', tier);

    // TEMPORARY: Bypass quota checking until Durable Object is fixed
    console.log('[GENERATE IMAGE] ⚠️ Quota checking bypassed (Durable Object fix in progress)');
    const quotaCheck = {
      allowed: true,
      remaining: 50, // Starter tier default
      resetAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      limit: 50,
    };

    // Skip quota consumption temporarily
    // const quotaService = new QuotaService(c.env.QUOTA_MANAGER, tier);
    // const quotaCheck = await quotaService.checkQuota(auth.userId, 'image');
    // if (!quotaCheck.allowed) { ... }
    // await quotaService.consumeQuota(auth.userId, 'image');

    console.log('[GENERATE IMAGE] ✅ Quota check bypassed (allowed for testing)');

    // Create job - Using OpenAI DALL-E 3 instead of Gemini
    const dalleAdapter = createOpenAIDalleAdapter(c.env.OPENAI_API_KEY);
    const jobManager = new JobManager(db, c.env.JOB_QUEUE, {
      'openai-dalle': dalleAdapter,
    } as any);

    console.log('[GENERATE IMAGE] 🔨 Creating job (using OpenAI DALL-E 3)');

    const job = await jobManager.createJob(
      auth.userId,
      input.singerId || null, // null for preview mode
      'image',
      'openai-dalle', // Using OpenAI DALL-E 3
      {
        prompt: input.prompt,
        stylePrompt: input.stylePrompt,
        aspectRatio: input.aspectRatio,
        negativePrompt: input.negativePrompt,
        referenceImageUrls: singer?.referenceImageUrl ? [singer.referenceImageUrl] : undefined,
      } as any
    );

    console.log('[GENERATE IMAGE] ✅ Job created:', job.id);

    return c.json(
      {
        jobId: job.id,
        status: job.status,
        estimatedCompletionSeconds: 30,
      },
      202
    );
  } catch (error) {
    console.error('[GENERATE IMAGE] ❌ Error:', error);
    console.error('[GENERATE IMAGE] ❌ Stack:', error instanceof Error ? error.stack : 'No stack trace');
    return c.json(
      {
        error: 'Failed to generate image',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /generate/audio - Generate AI audio/song
 */
app.post('/audio', zValidator('json', generateAudioSchema), async (c) => {
  try {
    console.log('[GENERATE AUDIO] 🎵 Starting audio generation');

    const auth = getAuth(c);
    const db = getDb(c);
    console.log('[GENERATE AUDIO] ✅ Auth retrieved:', auth.userId);

    const input = c.req.valid('json') as GenerateAudioInput;
    console.log('[GENERATE AUDIO] 📝 Input:', JSON.stringify(input));

    // Check singer ownership (LENIENT - allow generation even if singer not found)
    let singer: typeof schema.singers.$inferSelect | undefined;

    const [foundSinger] = await db
      .select()
      .from(schema.singers)
      .where(
        and(
          eq(schema.singers.id, input.singerId),
          eq(schema.singers.userId, auth.userId)
        )
      )
      .limit(1);

    if (!foundSinger) {
      console.log('[GENERATE AUDIO] ⚠️  Singer not found (continuing without singer):', input.singerId);
      // Continue without singer instead of failing - allows generation with generic voice
      singer = undefined;
    } else {
      singer = foundSinger;
      console.log('[GENERATE AUDIO] ✅ Singer found:', singer.name);
    }

  // Get user's subscription tier
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, auth.userId))
    .limit(1);

  const tier = user?.subscriptionTier || 'starter';

    // TEMPORARY: Bypass quota checking until Durable Object is fixed
    console.log('[GENERATE AUDIO] ⚠️ Quota checking bypassed (Durable Object fix in progress)');
    // const quotaService = new QuotaService(c.env.QUOTA_MANAGER, tier);
    // const quotaCheck = await quotaService.checkQuota(auth.userId, 'song');
    // if (!quotaCheck.allowed) { ... }
    // await quotaService.consumeQuota(auth.userId, 'song');

    const voiceSettings = singer?.voiceSettings
      ? JSON.parse(singer.voiceSettings)
      : null;

    // Extract voice style preferences for consistent vocals
    const stylePreferences = singer?.stylePreferences
      ? JSON.parse(singer.stylePreferences)
      : null;

    // Enhance prompt with voice style description
    // This ensures consistent vocal characteristics across all generations
    let enhancedPrompt = input.prompt;
    if (stylePreferences) {
      const { enhancePromptWithVoiceStyle } = await import('../lib/voice-style');
      enhancedPrompt = enhancePromptWithVoiceStyle(input.prompt, stylePreferences);
      console.log(`[GENERATE AUDIO] Enhanced prompt with voice style: "${enhancedPrompt}"`);
    } else {
      console.log('[GENERATE AUDIO] No voice style preferences, using original prompt');
    }

    // Create job
    const elevenLabsAdapter = createElevenLabsAdapter(c.env.ELEVENLABS_API_KEY);
    const jobManager = new JobManager(db, c.env.JOB_QUEUE, {
      'elevenlabs-music': elevenLabsAdapter,
    } as any);

    console.log('[GENERATE AUDIO] 🔨 Creating job with ElevenLabs');

    const job = await jobManager.createJob(
      auth.userId,
      input.singerId, // Keep original singerId for tracking, even if singer not found
      'audio',
      'elevenlabs-music', // Fixed: Match queue consumer provider name
      {
        prompt: enhancedPrompt, // Use enhanced prompt with voice style
        durationMs: input.durationSeconds ? input.durationSeconds * 1000 : undefined,
        lyrics: input.lyrics,
        genre: input.genre,
        mood: input.mood,
        metadata: {
          mode: input.mode,
          name: input.songName, // Song name provided by user
          voiceId: voiceSettings?.voiceId,
          voiceStyle: stylePreferences, // Store for reference
        },
      } as any
    );

    console.log('[GENERATE AUDIO] ✅ Job created:', job.id);

    return c.json(
      {
        jobId: job.id,
        status: job.status,
        estimatedCompletionSeconds: 60,
      },
      202
    );
  } catch (error) {
    console.error('[GENERATE AUDIO] ❌ Error:', error);
    console.error('[GENERATE AUDIO] ❌ Stack:', error instanceof Error ? error.stack : 'No stack trace');
    return c.json(
      {
        error: 'Failed to generate audio',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /generate/video - Generate AI video
 */
app.post('/video', zValidator('json', generateVideoSchema), async (c) => {
  try {
    console.log('[GENERATE VIDEO] 🎬 Starting video generation');

    const auth = getAuth(c);
    const db = getDb(c);
    const input = c.req.valid('json') as GenerateVideoInput;

    console.log('[GENERATE VIDEO] ✅ Auth retrieved:', auth.userId);
    console.log('[GENERATE VIDEO] 📝 Input:', JSON.stringify(input));

    // Check singer ownership
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
      console.log('[GENERATE VIDEO] ❌ Singer not found:', input.singerId);
      return c.json({ error: 'Singer not found' }, 404);
    }

    console.log('[GENERATE VIDEO] ✅ Singer found:', singer.name);

    // Get user's subscription tier
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, auth.userId))
      .limit(1);

    const tier = user?.subscriptionTier || 'starter';
    console.log('[GENERATE VIDEO] 📊 User tier:', tier);

    // TEMPORARY: Bypass quota checking until Durable Object is fixed
    console.log('[GENERATE VIDEO] ⚠️ Quota checking bypassed (Durable Object fix in progress)');

    // **MUSIC VIDEO MODE** - Multi-stage workflow with audio chunking
    if (input.mode === 'music-video') {
      console.log('[GENERATE VIDEO] 🎵 Music video mode activated');

      // Validate songId is provided
      if (!input.songId) {
        console.log('[GENERATE VIDEO] ❌ Missing songId for music video mode');
        return c.json({ error: 'songId is required for music-video mode' }, 400);
      }

      // Get song and verify ownership
      const [songData] = await db
        .select({
          songId: schema.songs.id,
          title: schema.songs.title,
          duration: schema.songs.duration,
          singerId: schema.songs.singerId,
          jobId: schema.jobs.id,
          assetId: schema.jobs.resultAssetId,
        })
        .from(schema.songs)
        .leftJoin(schema.jobs, eq(schema.songs.id, schema.jobs.songId))
        .where(
          and(
            eq(schema.songs.id, input.songId),
            eq(schema.songs.singerId, input.singerId)
          )
        )
        .limit(1);

      if (!songData) {
        console.log('[GENERATE VIDEO] ❌ Song not found:', input.songId);
        return c.json({ error: 'Song not found' }, 404);
      }

      // Get audio URL from assets table
      let audioUrl = null;
      if (songData.assetId) {
        const [asset] = await db
          .select({
            cdnUrl: schema.assets.cdnUrl,
          })
          .from(schema.assets)
          .where(eq(schema.assets.id, songData.assetId))
          .limit(1);

        if (asset) {
          audioUrl = asset.cdnUrl;
        }
      }

      if (!audioUrl) {
        console.log('[GENERATE VIDEO] ❌ Song has no audio URL');
        return c.json({ error: 'Song audio not available' }, 400);
      }

      console.log('[GENERATE VIDEO] ✅ Song found:', songData.title, '| Audio URL:', audioUrl);

      // Use audioUrl and songData for video generation
      const song = { ...songData, audioUrl };

      // Create job record first
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = Date.now();

      await db.insert(schema.jobs).values({
        id: jobId,
        userId: auth.userId,
        singerId: input.singerId,
        songId: input.songId, // Link to song
        type: 'video',
        provider: 'kie-wan25',
        status: 'pending',
        progress: 0,
        params: JSON.stringify({
          prompt: input.prompt,
          aspectRatio: input.aspectRatio,
          chunkDurationSeconds: input.chunkDurationSeconds || 4, // FIX #41: Default to 4s
          mode: 'music-video',
        }),
        createdAt: now,
        updatedAt: now,
      });

      console.log('[GENERATE VIDEO] ✅ Job created:', jobId);

      // Initialize music video service
      const { MusicVideoService } = await import('../services/music-video');
      const musicVideoService = new MusicVideoService(c.env.KIE_API_KEY, c.env.BROWSER);

      console.log('[GENERATE VIDEO] 🎬 Initializing music video workflow');

      // FIX #46: Use profileImageUrl as fallback when referenceImageUrl is null
      // Also include singer's appearance/description in the prompt for character consistency
      const characterImageUrl = singer.referenceImageUrl || singer.profileImageUrl || '';
      const singerAppearance = singer.appearance || singer.description || '';

      // Enhance prompt with singer's appearance for better character consistency
      const enhancedPrompt = singerAppearance
        ? `${input.prompt}. The singer looks like: ${singerAppearance}`
        : input.prompt;

      console.log('[GENERATE VIDEO] 🎭 Character setup:', {
        hasCharacterImage: !!characterImageUrl,
        imageSource: singer.referenceImageUrl ? 'referenceImageUrl' : (singer.profileImageUrl ? 'profileImageUrl' : 'none'),
        singerAppearance: singerAppearance?.substring(0, 50) || 'none',
      });

      // Start music video generation workflow
      await musicVideoService.initializeMusicVideo(
        db,
        c.env.JOB_QUEUE,
        c.env.VIDEO_ASSETS,
        {
          jobId,
          userId: auth.userId,
          singerId: input.singerId,
          songId: input.songId,
          audioUrl: song.audioUrl,
          prompt: enhancedPrompt,
          durationSeconds: (input.chunkDurationSeconds || 4) as 4 | 8 | 12, // FIX #41
          aspectRatio: input.aspectRatio as '16:9' | '9:16' | '1:1',
          characterImageUrl,
        }
      );

      console.log('[GENERATE VIDEO] ✅ Music video workflow started');

      return c.json(
        {
          jobId,
          status: 'processing',
          estimatedCompletionSeconds: 300, // 5 minutes for music video
          mode: 'music-video',
        },
        202
      );
    }

    // **STANDARD VIDEO MODE** - Single video generation
    console.log('[GENERATE VIDEO] 🎬 Standard video mode');

    // Create adapter based on provider
    const sora2Adapter = createSora2Adapter(c.env.OPENAI_API_KEY);
    const veo3Adapter = createVeo3Adapter(c.env.VEO3_API_KEY);

    const jobManager = new JobManager(db, c.env.JOB_QUEUE, {
      sora2: sora2Adapter,
      veo3: veo3Adapter,
    } as any);

    // Add reference images if singer has one
    const referenceImageUrls = input.referenceImageUrls || [];
    if (singer.referenceImageUrl) {
      referenceImageUrls.push(singer.referenceImageUrl);
    }

    // Map frontend provider names to queue consumer provider names
    const providerMap: Record<string, string> = {
      'sora2': 'sora-2',
      'veo3': 'veo3',
    };

    const job = await jobManager.createJob(
      auth.userId,
      input.singerId,
      'video',
      providerMap[input.provider] || input.provider, // Map provider name
      {
        prompt: input.prompt,
        aspectRatio: input.aspectRatio,
        durationSeconds: input.durationSeconds,
        referenceImageUrls,
        audioUrl: input.audioUrl,
      } as any
    );

    console.log('[GENERATE VIDEO] ✅ Standard video job created:', job.id);

    return c.json(
      {
        jobId: job.id,
        status: job.status,
        estimatedCompletionSeconds: input.provider === 'sora2' ? 180 : 240,
        mode: 'standard',
      },
      202
    );
  } catch (error) {
    console.error('[GENERATE VIDEO] ❌ Error:', error);
    console.error('[GENERATE VIDEO] ❌ Stack:', error instanceof Error ? error.stack : 'No stack trace');
    return c.json(
      {
        error: 'Failed to generate video',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

export default app;

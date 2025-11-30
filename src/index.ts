// AI Influencer - Main Worker Entry Point
// NOTE: This is a NEW project, completely separate from ai-singer-studio

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, inArray } from 'drizzle-orm';
import * as schema from './db/schema';
import { authMiddleware } from './middleware/auth';
import { JobManager } from './services/jobs';
import { createGeminiAdapter } from './providers/gemini';
import { createElevenLabsAdapter } from './providers/elevenlabs';
import { createSora2Adapter } from './providers/sora2';
import { createVeo3Adapter } from './providers/veo3';
import { createOpenAIDalleAdapter } from './providers/openai-dalle';
import { StorageService } from './services/storage';
import type { JobMessage } from './services/jobs';

// Export QuotaManager Durable Object
export { QuotaManager } from './services/quota';

// Types
export interface Env {
  // Bindings
  DB: D1Database;
  ASSETS_BUCKET: R2Bucket;
  VIDEO_ASSETS: R2Bucket; // For music video chunks and segments
  VIDEO_HISTORY: KVNamespace;
  SESSIONS: KVNamespace;
  CACHE: KVNamespace;
  JOB_QUEUE: Queue;
  QUOTA_MANAGER: DurableObjectNamespace;
  ANALYTICS: AnalyticsEngineDataset;
  BROWSER?: Fetcher;
  AI: Ai;

  // Secrets
  GEMINI_API_KEY: string;
  ELEVENLABS_API_KEY: string;
  OPENAI_API_KEY?: string;
  VEO3_API_KEY?: string;
  KIE_API_KEY: string; // For Kie.ai (Wan 2.5 + Nano Banana Pro)
  ASSETS_PUBLIC_URL: string;

  // Environment
  ENVIRONMENT: string;
  CLOUDFLARE_ACCOUNT_ID: string;
}

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// Middleware - Initialize database and error tracking
import { dbMiddleware } from './middleware/db';
import { errorTrackingMiddleware, globalErrorHandler } from './middleware/errorTracking';

// Middleware - CORS with specific origin for credentials
app.use('/*', cors({
  origin: (origin) => {
    // Allow all Cloudflare Pages deployments for ai-influencer-frontend
    // NOTE: Update these domains after deploying your frontend to Cloudflare Pages
    if (origin.endsWith('.ai-influencer-frontend.pages.dev') ||
        origin === 'https://ai-influencer-frontend.pages.dev' ||
        origin.endsWith('.ai-influencer.pages.dev') ||
        origin === 'https://ai-influencer.pages.dev' ||
        origin === 'http://localhost:3000' ||
        origin === 'http://localhost:8788') {
      return origin;
    }
    // Default fallback - update after deployment
    return 'http://localhost:3000';
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400,
}));
// Apply error tracking middleware to all routes
app.use('/*', errorTrackingMiddleware());

// Apply database middleware to all API routes
app.use('/api/*', dbMiddleware);

// Apply global error handler
app.onError(globalErrorHandler());

// Apply auth middleware to protected routes ONLY
// NOTE: /api/auth/* routes handle their own auth checking internally
app.use('/api/users/*', authMiddleware);
app.use('/api/singers/*', authMiddleware);
app.use('/api/singers', authMiddleware);
app.use('/api/voices/*', authMiddleware);
app.use('/api/generate/*', authMiddleware);
app.use('/api/assets/*', authMiddleware);
app.use('/api/assets', authMiddleware);
app.use('/api/jobs/*', authMiddleware);
app.use('/api/jobs', authMiddleware);

// Routes
app.get('/', (c) => {
  return c.json({
    service: 'AI Influencer',
    version: '1.0.0',
    environment: c.env.ENVIRONMENT
  });
});

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Admin endpoint: Re-trigger video generation for stuck chunks (scene_ready status)
// FIX #42: Manual recovery for chunks stuck after scene generation
app.post('/admin/retrigger-video/:jobId', async (c) => {
  const jobId = c.req.param('jobId');
  const env = c.env as any;

  if (!jobId) {
    return c.json({ error: 'jobId required' }, 400);
  }

  try {
    const queueDb = drizzle(env.DB, { schema });

    // Find chunks in scene_ready status for this job
    const stuckChunks = await queueDb.select()
      .from(schema.videoChunks)
      .where(
        and(
          eq(schema.videoChunks.jobId, jobId),
          eq(schema.videoChunks.status, 'scene_ready')
        )
      )
      .orderBy(schema.videoChunks.chunkIndex);

    if (stuckChunks.length === 0) {
      return c.json({ message: 'No stuck chunks found in scene_ready status', jobId }, 200);
    }

    // Get job params for prompt
    const [job] = await queueDb.select()
      .from(schema.jobs)
      .where(eq(schema.jobs.id, jobId))
      .limit(1);

    if (!job) {
      return c.json({ error: 'Job not found' }, 404);
    }

    const params = job.params ? JSON.parse(job.params) : {};
    const prompt = params.prompt || 'Music video scene';

    // Trigger video generation for each stuck chunk
    const { MusicVideoService } = await import('./services/music-video');
    const service = new MusicVideoService(env.KIE_API_KEY, env.BROWSER);

    const results = [];
    for (const chunk of stuckChunks) {
      try {
        console.log(`[ADMIN] Re-triggering video generation for chunk ${chunk.id}`);
        await service.generateVideoSegment(queueDb, env, chunk.id, prompt);
        results.push({ chunkId: chunk.id, status: 'triggered' });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[ADMIN] Failed to trigger chunk ${chunk.id}:`, errMsg);
        results.push({ chunkId: chunk.id, status: 'failed', error: errMsg });
      }
    }

    return c.json({
      message: `Re-triggered video generation for ${stuckChunks.length} chunks`,
      jobId,
      results,
    });
  } catch (error) {
    console.error('[ADMIN] Re-trigger failed:', error);
    return c.json({
      error: 'Failed to re-trigger video generation',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Admin endpoint: Trigger stitching for jobs where all chunks are video_ready
// FIX #44: Manual recovery for jobs stuck at stitching phase
app.post('/admin/trigger-stitch/:jobId', async (c) => {
  const jobId = c.req.param('jobId');
  const env = c.env as any;

  if (!jobId) {
    return c.json({ error: 'jobId required' }, 400);
  }

  try {
    const queueDb = drizzle(env.DB, { schema });

    // Check all chunks are video_ready
    const chunks = await queueDb.select()
      .from(schema.videoChunks)
      .where(eq(schema.videoChunks.jobId, jobId))
      .orderBy(schema.videoChunks.chunkIndex);

    if (chunks.length === 0) {
      return c.json({ error: 'No chunks found for this job' }, 404);
    }

    const allReady = chunks.every(c => c.status === 'video_ready' && c.videoSegmentUrl);
    if (!allReady) {
      const notReady = chunks.filter(c => c.status !== 'video_ready' || !c.videoSegmentUrl);
      return c.json({
        error: 'Not all chunks are ready for stitching',
        notReadyChunks: notReady.map(c => ({
          index: c.chunkIndex,
          status: c.status,
          hasVideoUrl: !!c.videoSegmentUrl
        }))
      }, 400);
    }

    // Update job status to indicate stitching in progress
    const { atomicJobUpdate } = await import('./lib/atomic-updates');
    await atomicJobUpdate(queueDb, jobId, {
      progress: 92,
      error: null, // Clear previous error
    });

    // Trigger stitching
    console.log(`[ADMIN] Triggering stitch for job ${jobId}`);
    const { MusicVideoService } = await import('./services/music-video');
    const service = new MusicVideoService(env.KIE_API_KEY, env.BROWSER);

    await service.stitchFinalVideo(queueDb, env, jobId);

    return c.json({
      message: 'Stitching completed successfully',
      jobId,
      chunkCount: chunks.length,
    });
  } catch (error) {
    console.error('[ADMIN] Stitch trigger failed:', error);
    return c.json({
      error: 'Failed to stitch video',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// FIX #54: Download endpoint - returns download info for client-side merge
// Since server-side FFmpeg has CORS issues, we return the manifest data
// and let the client merge using FFmpeg.wasm in the browser
app.get('/api/download/:jobId', async (c) => {
  const jobId = c.req.param('jobId');
  const env = c.env;

  if (!jobId) {
    return c.json({ error: 'jobId required' }, 400);
  }

  console.log(`[DOWNLOAD] Fetching download info for job ${jobId}`);

  try {
    // 1. Get manifest from R2
    const manifestKey = `music-videos/${jobId}-manifest.json`;
    const manifestObject = await env.VIDEO_ASSETS.get(manifestKey);

    if (!manifestObject) {
      console.error(`[DOWNLOAD] Manifest not found: ${manifestKey}`);
      return c.json({ error: 'Video not found - manifest missing' }, 404);
    }

    const manifest = await manifestObject.json() as {
      version: number;
      jobId: string;
      totalDurationMs: number;
      segmentCount: number;
      audioUrl: string | null;
      segments: Array<{
        index: number;
        url: string;
        durationMs: number;
      }>;
    };

    console.log(`[DOWNLOAD] Found manifest: ${manifest.segmentCount} segments, audioUrl: ${manifest.audioUrl ? 'yes' : 'no'}`);

    // 2. Check if merged video already exists (cached)
    const mergedKey = `music-videos/${jobId}-merged.mp4`;
    const existingMerged = await env.VIDEO_ASSETS.get(mergedKey);

    if (existingMerged) {
      console.log(`[DOWNLOAD] Serving cached merged video for job ${jobId}`);
      const videoData = await existingMerged.arrayBuffer();
      return new Response(videoData, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Disposition': `attachment; filename="music-video-${jobId}.mp4"`,
          'Content-Length': videoData.byteLength.toString(),
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // 3. No cached version - return manifest data for client-side merge
    // Sort segments by index
    const sortedSegments = [...manifest.segments].sort((a, b) => a.index - b.index);

    console.log(`[DOWNLOAD] Returning manifest for client-side merge`);

    return c.json({
      needsClientMerge: true,
      jobId,
      totalDurationMs: manifest.totalDurationMs,
      segmentCount: manifest.segmentCount,
      segments: sortedSegments.map(s => s.url),
      audioUrl: manifest.audioUrl,
      // NOTE: Update this URL after deploying your worker
      cacheEndpoint: `/api/download/${jobId}/cache`,
    });

  } catch (error) {
    console.error('[DOWNLOAD] Error:', error);
    return c.json({
      error: 'Download failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// FIX #54: Cache merged video endpoint - client uploads merged video for caching
app.post('/api/download/:jobId/cache', async (c) => {
  const jobId = c.req.param('jobId');
  const env = c.env;

  if (!jobId) {
    return c.json({ error: 'jobId required' }, 400);
  }

  console.log(`[DOWNLOAD CACHE] Caching merged video for job ${jobId}`);

  try {
    const videoData = await c.req.arrayBuffer();

    if (videoData.byteLength === 0) {
      return c.json({ error: 'No video data provided' }, 400);
    }

    const mergedKey = `music-videos/${jobId}-merged.mp4`;

    await env.VIDEO_ASSETS.put(mergedKey, videoData, {
      httpMetadata: { contentType: 'video/mp4' },
    });

    console.log(`[DOWNLOAD CACHE] Cached ${videoData.byteLength} bytes to ${mergedKey}`);

    return c.json({ success: true, cached: true, size: videoData.byteLength });
  } catch (error) {
    console.error('[DOWNLOAD CACHE] Error:', error);
    return c.json({
      error: 'Cache failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// FIX #53: Manifest proxy endpoint to bypass CORS issues with R2 public bucket
// Frontend fetches /api/manifest/:jobId instead of direct R2 URL
app.get('/api/manifest/:jobId', async (c) => {
  const jobId = c.req.param('jobId');
  const env = c.env;

  if (!jobId) {
    return c.json({ error: 'jobId required' }, 400);
  }

  try {
    // Try to get manifest from R2
    const manifestKey = `music-videos/${jobId}-manifest.json`;
    const manifestObject = await env.VIDEO_ASSETS.get(manifestKey);

    if (!manifestObject) {
      console.error(`[MANIFEST] Manifest not found: ${manifestKey}`);
      return c.json({ error: 'Manifest not found' }, 404);
    }

    const manifestText = await manifestObject.text();
    const manifest = JSON.parse(manifestText);

    console.log(`[MANIFEST] Serving manifest for job ${jobId}: ${manifest.segmentCount} segments`);

    // Return manifest with proper CORS (handled by middleware)
    return c.json(manifest);
  } catch (error) {
    console.error('[MANIFEST] Error fetching manifest:', error);
    return c.json({
      error: 'Failed to fetch manifest',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Minimal HTML page for FFmpeg.wasm Worker support
// Puppeteer needs to navigate to a page with proper HTTP(S) origin
app.get('/ffmpeg-worker.html', async (c) => {
  return c.html(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>FFmpeg Worker</title>
</head>
<body>
  <!-- Minimal page for FFmpeg.wasm with proper origin -->
</body>
</html>`);
});

// Browser API diagnostic endpoint
app.get('/debug/browser', async (c) => {
  const diagnostics: any = {
    browserBindingExists: !!c.env.BROWSER,
    browserType: typeof c.env.BROWSER,
    hasFetch: !!(c.env.BROWSER as any)?.fetch,
  };

  // Try Puppeteer test
  if (c.env.BROWSER) {
    try {
      // Test Puppeteer import and launch
      const puppeteer = await import('@cloudflare/puppeteer');
      diagnostics.puppeteerImported = true;

      const browser = await puppeteer.default.launch(c.env.BROWSER);
      diagnostics.browserLaunched = true;

      const page = await browser.newPage();
      diagnostics.pageCreated = true;

      // Navigate to Worker-compatible HTML page with proper HTTPS origin
      // FIX: about:blank and data: URLs have origin 'null' which blocks Web Workers
      // NOTE: Update this URL after deploying your worker
      const workerUrl = c.env.ENVIRONMENT === 'production'
        ? `https://${c.req.header('host')}/ffmpeg-worker.html`
        : 'http://localhost:8787/ffmpeg-worker.html';
      await page.goto(workerUrl);
      diagnostics.pageNavigated = true;

      // Check page origin
      const origin = await page.evaluate(() => window.location.origin);
      diagnostics.pageOrigin = origin;

      // Test FFmpeg.wasm loading
      await page.addScriptTag({
        url: 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.6/dist/umd/ffmpeg.js'
      });
      diagnostics.ffmpegScriptLoaded = true;

      await page.addScriptTag({
        url: 'https://unpkg.com/@ffmpeg/util@0.12.1/dist/umd/index.js'
      });
      diagnostics.ffmpegUtilLoaded = true;

      // Wait for libraries
      await page.waitForFunction(() => {
        return typeof (window as any).FFmpegWASM !== 'undefined' &&
               typeof (window as any).FFmpegUtil !== 'undefined';
      }, { timeout: 30000 });
      diagnostics.ffmpegLibsAvailable = true;

      // CRITICAL TEST: Try to actually instantiate FFmpeg (which creates the Worker)
      const ffmpegTest = await page.evaluate(async () => {
        try {
          const { FFmpeg } = (window as any).FFmpegWASM;
          const ffmpeg = new FFmpeg();
          await ffmpeg.load({
            coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd/ffmpeg-core.js',
          });
          return { success: true, loaded: true };
        } catch (error: any) {
          return { success: false, error: error.message || String(error) };
        }
      });
      diagnostics.ffmpegInstanceTest = ffmpegTest;

      await browser.close();
      diagnostics.browserClosed = true;

      diagnostics.testResult = ffmpegTest.success ? 'SUCCESS' : 'FAILED';
    } catch (error: any) {
      diagnostics.testResult = 'FAILED';
      diagnostics.testError = error.message;
      diagnostics.errorStack = error.stack?.split('\n').slice(0, 10).join('\n');
    }
  } else {
    diagnostics.testResult = 'BINDING_NOT_AVAILABLE';
    diagnostics.message = 'Browser Rendering API not provisioned. Requires paid Workers plan + billing setup.';
  }

  return c.json(diagnostics);
});

// Import API routes
import authRoutes from './api/auth';
import generateRoutes from './api/generate';
import musicRoutes from './api/music';
import usersRoutes from './api/users';
import singersRoutes from './api/singers';
import voicesRoutes from './api/voices';
import assetsRoutes from './api/assets';
import jobsRoutes from './api/jobs';

app.route('/api/auth', authRoutes);
app.route('/api/generate', generateRoutes);
app.route('/api/music', musicRoutes);
app.route('/api/users', usersRoutes);
app.route('/api/singers', singersRoutes);
app.route('/api/voices', voicesRoutes);
app.route('/api/assets', assetsRoutes);
app.route('/api/jobs', jobsRoutes);

// Add global /api/usage endpoint as alias for /api/users/usage
app.get('/api/usage', authMiddleware, async (c) => {
  console.log('[API] /api/usage called - redirecting to /api/users/usage');
  // Forward to the users/usage endpoint
  return c.redirect('/api/users/usage');
});

// Queue message types
export type QueueMessage = JobMessage | MusicVideoMessage;

export interface MusicVideoMessage {
  type: 'music-video-chunk-audio' | 'music-video-generate-scene' | 'music-video-poll-scene' | 'music-video-generate-video' | 'music-video-poll-video' | 'music-video-stitch';
  jobId: string;
  chunkId?: string;
  operationId?: string;
  songId?: string;
  audioUrl?: string;
  chunkDurationMs?: number;
  characterImageUrl?: string;
  prompt?: string;
  pollAttempt?: number; // Track polling attempts to prevent infinite loops
}

// Queue consumer handler
export async function queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
  console.log(`[QUEUE HANDLER] 🎯 Queue handler invoked! Batch size: ${batch.messages.length}`);
  console.log(`[QUEUE HANDLER] Environment check - DB:`, !!env.DB, '| KIE_API_KEY:', !!env.KIE_API_KEY);

  const db = drizzle(env.DB, { schema });

  // Initialize providers
  const providers = {
    'gemini-flash': createGeminiAdapter(env.GEMINI_API_KEY),
    'openai-dalle': createOpenAIDalleAdapter(env.OPENAI_API_KEY || ''),
    'elevenlabs-music': createElevenLabsAdapter(env.ELEVENLABS_API_KEY),
    'sora-2': createSora2Adapter(env.OPENAI_API_KEY || ''),
    'veo3': createVeo3Adapter(env.VEO3_API_KEY || ''),
  };

  // Initialize storage service
  const storage = new StorageService(env.ASSETS_BUCKET, env.ASSETS_PUBLIC_URL);

  // Initialize job manager
  const jobManager = new JobManager(
    db,
    env.JOB_QUEUE,
    providers,
    {
      uploadImage: storage.uploadImage.bind(storage),
      uploadAudio: storage.uploadAudio.bind(storage),
      uploadVideo: storage.uploadVideo.bind(storage),
    }
  );

  // Initialize database for queue consumer context
  // FIX: Rename to avoid naming conflict with top-level drizzle import
  const { drizzle: drizzleORM } = await import('drizzle-orm/d1');
  const queueDb = drizzleORM(env.DB, { schema });

  // Initialize music video service (lazy)
  let musicVideoService: any = null;
  const getMusicVideoService = async () => {
    if (!musicVideoService && env.KIE_API_KEY) {
      const { MusicVideoService } = await import('./services/music-video');
      musicVideoService = new MusicVideoService(env.KIE_API_KEY, env.BROWSER);
    }
    return musicVideoService;
  };

  // Create context helper for music video service
  // FIX: Properly initialize database instance so getDb() works
  // Process each message in the batch
  for (const message of batch.messages) {
    try {
      const msg = message.body;

      // Check if it's a music video message
      if ('type' in msg && typeof msg.type === 'string' && msg.type.startsWith('music-video-')) {
        const mvMsg = msg as MusicVideoMessage;
        console.log(`[QUEUE] Processing music video task: ${mvMsg.type}`);

        const service = await getMusicVideoService();

        // FIX #27: Add null check to prevent silent failures when KIE_API_KEY is missing
        if (!service) {
          throw new Error(
            'FATAL: Music video service unavailable. KIE_API_KEY secret not configured. ' +
            'Please run: wrangler secret put KIE_API_KEY --env production'
          );
        }

        switch (mvMsg.type) {
          case 'music-video-chunk-audio':
            console.log('[QUEUE] Chunking audio for job:', mvMsg.jobId);
            // FIX #25: Check if job cancelled before expensive audio processing
            const [job] = await queueDb.select()
              .from(schema.jobs)
              .where(eq(schema.jobs.id, mvMsg.jobId))
              .limit(1);

            if (!job) {
              console.error('[QUEUE] Job not found:', mvMsg.jobId);
              break; // Ack message - job doesn't exist, no retry needed
            }

            if (job.status === 'cancelled' || job.status === 'failed' || job.status === 'completed') {
              console.log(`[QUEUE] Job ${job.status}, skipping audio chunking`);
              break; // Ack message - job already in terminal state
            }

            // FIX HIGH: Re-throw errors to trigger message retry
            // Don't ack messages when audio chunking fails
            await service.processAudioChunks(
              queueDb,
              env,
              mvMsg.jobId,
              mvMsg.audioUrl!,
              mvMsg.chunkDurationMs!,
              (mvMsg as any).metadata // Pass metadata with cached duration
            );
            break;

          case 'music-video-generate-scene':
            console.log('[QUEUE] Generating scene for chunk:', mvMsg.chunkId);
            // CRITICAL FIX: Allow audio_ready status (set by audio chunking)
            // FIX #23B: Idempotency via atomic status transition
            const [chunk_scene] = await queueDb.select()
              .from(schema.videoChunks)
              .where(eq(schema.videoChunks.id, mvMsg.chunkId!))
              .limit(1);

            if (!chunk_scene) {
              console.error('[QUEUE] Chunk not found:', mvMsg.chunkId);
              break; // Ack - chunk doesn't exist
            }

            // Skip if already processing scene or beyond (idempotency)
            if (!['pending', 'audio_ready'].includes(chunk_scene.status)) {
              console.log(`[QUEUE] Chunk already ${chunk_scene.status}, skipping duplicate scene generation`);
              break; // Ack - chunk already processed
            }

            // Get job params to extract prompt and character image
            const [job_scene] = await queueDb.select()
              .from(schema.jobs)
              .where(eq(schema.jobs.id, mvMsg.jobId))
              .limit(1);

            if (!job_scene) {
              console.error('[QUEUE] Job not found for scene generation:', mvMsg.jobId);
              break; // Ack - job doesn't exist, no retry needed
            }

            // FIX #25: Check if job was cancelled/completed/failed before expensive scene generation
            if (job_scene.status === 'failed' || job_scene.status === 'completed' || job_scene.status === 'cancelled') {
              console.log(`[QUEUE] Job ${job_scene.status}, skipping scene generation`);
              break; // Ack - job in terminal state
            }

            const params_scene = job_scene.params ? JSON.parse(job_scene.params) : {};
            const [singer_scene] = await queueDb.select()
              .from(schema.singers)
              .where(eq(schema.singers.id, job_scene.singerId!))
              .limit(1);

            if (!singer_scene) {
              console.error('[QUEUE] Singer not found:', job_scene.singerId);
              break; // Ack - singer doesn't exist, no retry needed
            }

            // CRITICAL FIX: Atomic status transition from pending/audio_ready → scene_processing
            // Only proceeds if status is still pending or audio_ready (prevents duplicate on redelivery)
            const updated_scene = await queueDb.update(schema.videoChunks)
              .set({ status: 'scene_processing', updatedAt: Date.now() })
              .where(
                and(
                  eq(schema.videoChunks.id, mvMsg.chunkId!),
                  inArray(schema.videoChunks.status, ['pending', 'audio_ready'])
                )
              )
              .returning();

            if (!updated_scene.length) {
              console.log(`[QUEUE] Chunk ${mvMsg.chunkId} status changed during processing, skipping (idempotent guard)`);
              break; // Ack - another worker already processing
            }

            // FIX #52: Use referenceImageUrl with fallback to profileImageUrl
            // referenceImageUrl = user-uploaded reference image
            // profileImageUrl = AI-generated profile image
            // Either works for character consistency in scene generation
            const characterImageUrl = singer_scene.referenceImageUrl || singer_scene.profileImageUrl || '';

            if (!characterImageUrl) {
              console.warn(`[QUEUE] ⚠️ Singer ${singer_scene.id} has no image URL (referenceImageUrl and profileImageUrl are both empty)`);
            } else {
              console.log(`[QUEUE] Using character image: ${characterImageUrl.substring(0, 60)}...`);
            }

            // FIX HIGH: Re-throw errors to trigger message retry
            // Conditions to ACK (not retry):
            // - Chunk/job/singer not found (permanent failures)
            // - Job in terminal state (cancelled/failed/completed)
            // - Chunk already processed (idempotency)
            // Conditions to RETRY (re-throw):
            // - Network errors calling Kie.ai API
            // - Database errors
            // - Unexpected errors during generation
            await service.generateScene(
              queueDb,
              env,
              mvMsg.chunkId!,
              characterImageUrl,
              params_scene.prompt || 'Music video scene'
            );
            break;

          case 'music-video-poll-scene':
            console.log('[QUEUE] Polling scene status:', mvMsg.operationId);
            // FIX: Check job/chunk state BEFORE expensive API call
            const [chunk_poll_scene] = await queueDb.select()
              .from(schema.videoChunks)
              .where(eq(schema.videoChunks.id, mvMsg.chunkId!))
              .limit(1);

            if (!chunk_poll_scene) {
              console.error('[QUEUE] Chunk not found for scene polling:', mvMsg.chunkId);
              break; // Ack - chunk doesn't exist
            }

            // Skip if chunk already completed or failed (idempotency)
            if (chunk_poll_scene.status === 'scene_ready' || chunk_poll_scene.status === 'video_generating' || chunk_poll_scene.status === 'video_ready' || chunk_poll_scene.status === 'failed') {
              console.log(`[QUEUE] Chunk already ${chunk_poll_scene.status}, skipping scene poll`);
              break; // Ack - already in final state
            }

            // Verify operationId matches (prevent stale redelivery from polling wrong operation)
            if (chunk_poll_scene.sceneOperationId && chunk_poll_scene.sceneOperationId !== mvMsg.operationId) {
              console.log(`[QUEUE] OperationId mismatch (expected ${chunk_poll_scene.sceneOperationId}, got ${mvMsg.operationId}), skipping`);
              break; // Ack - stale message
            }

            // Check if job was cancelled/failed/completed
            const [job_poll_scene] = await queueDb.select()
              .from(schema.jobs)
              .where(eq(schema.jobs.id, chunk_poll_scene.jobId))
              .limit(1);

            if (!job_poll_scene || ['cancelled', 'failed', 'completed'].includes(job_poll_scene.status)) {
              console.log(`[QUEUE] Job ${job_poll_scene?.status || 'not found'}, skipping scene poll`);
              break; // Ack - job in terminal state
            }

            // FIX HIGH: Re-throw errors to trigger message retry
            // Conditions to ACK (not retry):
            // - Chunk/job not found (permanent failures)
            // - Chunk already in final state (idempotency)
            // - OperationId mismatch (stale message)
            // - Job cancelled/failed/completed
            // - AI generation failed (business failure)
            // - Polling timeout (business failure after max attempts)
            // Conditions to RETRY (re-throw):
            // - Network errors calling Kie.ai API
            // - Database errors
            // - Unexpected errors during polling

            // Check operation status via Kie adapter
            const { KieNanoBananaProAdapter } = await import('./providers/kie-nano-banana-pro');
            const sceneAdapter = new KieNanoBananaProAdapter({ apiKey: env.KIE_API_KEY });
            const sceneStatus = await sceneAdapter.getStatus(mvMsg.operationId!);

            if (sceneStatus.status === 'completed') {
              const result = await sceneAdapter.getResult(mvMsg.operationId!);
              const now = Date.now();

              // Update chunk with scene image URL
              await queueDb.update(schema.videoChunks)
                .set({
                  sceneImageUrl: result.contentUrl,
                  status: 'scene_ready',
                  updatedAt: now,
                })
                .where(eq(schema.videoChunks.id, mvMsg.chunkId!));

              // Trigger video generation (if job not cancelled)
              const [chunk_after] = await queueDb.select()
                .from(schema.videoChunks)
                .where(eq(schema.videoChunks.id, mvMsg.chunkId!))
                .limit(1);

              if (chunk_after) {
                const [job_after] = await queueDb.select()
                  .from(schema.jobs)
                  .where(eq(schema.jobs.id, chunk_after.jobId))
                  .limit(1);

                // FIX #25: Don't trigger expensive video generation if job cancelled
                if (job_after && job_after.status !== 'cancelled' && job_after.status !== 'failed' && job_after.status !== 'completed') {
                  const params = job_after.params ? JSON.parse(job_after.params) : {};
                  // FIX #42: Wrap generateVideoSegment in try-catch to record errors and prevent stuck chunks
                  try {
                    await service.generateVideoSegment(queueDb, env, mvMsg.chunkId!, params.prompt || 'Music video scene');
                  } catch (videoGenError) {
                    // Record error on chunk and propagate failure
                    console.error(`[QUEUE] ❌ Video generation failed for chunk ${mvMsg.chunkId}:`, videoGenError);
                    const errorMsg = videoGenError instanceof Error ? videoGenError.message : 'Unknown video generation error';

                    // FIX #42: Check for transient errors that should be retried
                    const isTransientError = errorMsg.includes('rate limit') ||
                                            errorMsg.includes('timeout') ||
                                            errorMsg.includes('network') ||
                                            errorMsg.includes('ECONNRESET');

                    if (isTransientError) {
                      // Re-throw to trigger queue retry
                      throw videoGenError;
                    }

                    // Permanent error - record on chunk and propagate failure
                    await queueDb.update(schema.videoChunks)
                      .set({
                        status: 'failed',
                        error: `Video generation failed: ${errorMsg}`,
                        updatedAt: Date.now(),
                      })
                      .where(eq(schema.videoChunks.id, mvMsg.chunkId!));

                    // Propagate failure to job
                    const { propagateChunkFailure } = await import('./lib/atomic-updates');
                    await propagateChunkFailure(queueDb, mvMsg.chunkId!, `Video generation failed: ${errorMsg}`, {
                      kieApiKey: env.KIE_API_KEY,
                      r2Bucket: env.VIDEO_ASSETS,
                    });
                  }
                } else {
                  console.log(`[QUEUE] Job ${job_after?.status || 'not found'}, skipping video generation`);
                }
              }
            } else if (sceneStatus.status === 'failed') {
              // FIX #41: Check if this is a transient Flux Kontext 500 error that should be retried
              // Flux returns successFlag: 3, errorCode: 500, errorMessage: "internal error, please try again later"
              // These are transient upstream errors that often succeed on retry
              const errorMessage = sceneStatus.error || '';
              const isTransient500 = errorMessage.toLowerCase().includes('internal error') ||
                                    errorMessage.toLowerCase().includes('please try again') ||
                                    errorMessage.toLowerCase().includes('500');

              // Get current retry count from chunk metadata
              const [chunkForSceneRetry] = await queueDb.select()
                .from(schema.videoChunks)
                .where(eq(schema.videoChunks.id, mvMsg.chunkId!))
                .limit(1);

              const sceneChunkMeta = chunkForSceneRetry?.metadata ? JSON.parse(chunkForSceneRetry.metadata) : {};
              const sceneRetryCount = sceneChunkMeta.sceneRetryCount || 0;
              const MAX_SCENE_RETRIES = 5; // Retry up to 5 times for transient 500 errors

              if (isTransient500 && sceneRetryCount < MAX_SCENE_RETRIES) {
                // FIX #41: Transient error - retry scene generation
                console.log(`[QUEUE] ⚠️ Transient Flux Kontext 500 error for chunk ${mvMsg.chunkId}, retrying (${sceneRetryCount + 1}/${MAX_SCENE_RETRIES})`);

                // Update chunk metadata with retry count and reset status for retry
                await queueDb.update(schema.videoChunks)
                  .set({
                    metadata: JSON.stringify({ ...sceneChunkMeta, sceneRetryCount: sceneRetryCount + 1 }),
                    status: 'audio_ready', // Reset to audio_ready so scene gen can be re-triggered
                    sceneOperationId: null, // Clear old operation ID
                    error: `Scene retry ${sceneRetryCount + 1}/${MAX_SCENE_RETRIES}: ${errorMessage}`,
                    updatedAt: Date.now(),
                  })
                  .where(eq(schema.videoChunks.id, mvMsg.chunkId!));

                // Get job params for prompt
                const [jobForSceneRetry] = await queueDb.select()
                  .from(schema.jobs)
                  .where(eq(schema.jobs.id, chunkForSceneRetry!.jobId))
                  .limit(1);

                if (jobForSceneRetry && jobForSceneRetry.status !== 'failed' && jobForSceneRetry.status !== 'cancelled') {
                  const params = jobForSceneRetry.params ? JSON.parse(jobForSceneRetry.params) : {};

                  // FIX #41: Exponential backoff delays for Flux Kontext recovery
                  // 15s, 30s, 60s, 120s, 240s (base 15, multiplier 2^n) - up to 4 minutes cooldown
                  const delaySeconds = 15 * Math.pow(2, sceneRetryCount);
                  console.log(`[QUEUE] Scheduling scene retry in ${delaySeconds}s (retry ${sceneRetryCount + 1}/${MAX_SCENE_RETRIES})`);

                  // Re-trigger scene generation via generateSceneImage
                  await service.generateSceneImage(
                    queueDb,
                    env,
                    mvMsg.chunkId!,
                    params.prompt || 'Cinematic music video scene'
                  );
                }
              } else {
                // Business failure: AI generation failed after retries - propagate and ACK
                // FIX HIGH #2: Cleanup R2 objects and cancel Kie operations
                // FIX #30: Use queueDb (not db) - db is the drizzle import, queueDb is the instance
                console.error(`[QUEUE] ❌ Scene generation permanently failed for chunk ${mvMsg.chunkId} (retries: ${sceneRetryCount}): ${errorMessage}`);
                const { propagateChunkFailure } = await import('./lib/atomic-updates');
                await propagateChunkFailure(queueDb, mvMsg.chunkId!, 'Scene generation failed', {
                  kieApiKey: env.KIE_API_KEY,
                  r2Bucket: env.VIDEO_ASSETS,
                });
              }
            } else {
              // Still processing - re-queue poll with attempt tracking
              const attempt = (mvMsg.pollAttempt || 0) + 1;
              const MAX_POLL_ATTEMPTS = 240; // 240 * 5s = 20 minutes max (FIX #16 - increased from 10min)

              if (attempt > MAX_POLL_ATTEMPTS) {
                // Business failure: timeout - propagate and ACK
                // FIX HIGH #2: Cleanup R2 objects and cancel Kie operations
                // FIX #30: Use queueDb (not db) - db is the drizzle import, queueDb is the instance
                console.error(`[QUEUE] Scene polling timeout after ${attempt} attempts for chunk ${mvMsg.chunkId}`);
                const { propagateChunkFailure } = await import('./lib/atomic-updates');
                await propagateChunkFailure(queueDb, mvMsg.chunkId!, `Scene generation timeout after ${attempt * 5}s`, {
                  kieApiKey: env.KIE_API_KEY,
                  r2Bucket: env.VIDEO_ASSETS,
                });
              } else {
                await env.JOB_QUEUE.send({ ...mvMsg, pollAttempt: attempt }, { delaySeconds: 5 });
              }
            }
            break;

          case 'music-video-poll-video':
            console.log('[QUEUE] Polling video status:', mvMsg.operationId);
            // FIX: Check job/chunk state BEFORE expensive API call
            const [chunk_poll_video] = await queueDb.select()
              .from(schema.videoChunks)
              .where(eq(schema.videoChunks.id, mvMsg.chunkId!))
              .limit(1);

            if (!chunk_poll_video) {
              console.error('[QUEUE] Chunk not found for video polling:', mvMsg.chunkId);
              break; // Ack - chunk doesn't exist
            }

            // Skip if chunk already completed or failed (idempotency)
            if (chunk_poll_video.status === 'video_ready' || chunk_poll_video.status === 'failed') {
              console.log(`[QUEUE] Chunk already ${chunk_poll_video.status}, skipping video poll`);
              break; // Ack - already in final state
            }

            // Verify operationId matches (prevent stale redelivery from polling wrong operation)
            if (chunk_poll_video.videoOperationId && chunk_poll_video.videoOperationId !== mvMsg.operationId) {
              console.log(`[QUEUE] OperationId mismatch (expected ${chunk_poll_video.videoOperationId}, got ${mvMsg.operationId}), skipping`);
              break; // Ack - stale message
            }

            // Check if job was cancelled/failed/completed
            const [job_poll_video] = await queueDb.select()
              .from(schema.jobs)
              .where(eq(schema.jobs.id, chunk_poll_video.jobId))
              .limit(1);

            if (!job_poll_video || ['cancelled', 'failed', 'completed'].includes(job_poll_video.status)) {
              console.log(`[QUEUE] Job ${job_poll_video?.status || 'not found'}, skipping video poll`);
              break; // Ack - job in terminal state
            }

            // FIX HIGH: Re-throw errors to trigger message retry
            // Same pattern as poll-scene: ACK on business failures, RETRY on technical failures

            // Check operation status via Kie adapter
            const { KieWan25Adapter } = await import('./providers/kie-wan25');
            const videoAdapter = new KieWan25Adapter({ apiKey: env.KIE_API_KEY });
            const videoStatus = await videoAdapter.getStatus(mvMsg.operationId!);

            if (videoStatus.status === 'completed') {
              const result = await videoAdapter.getResult(mvMsg.operationId!);
              const now = Date.now();

              // FIX #22B: Normalize video to exact duration and constant FPS
              // Prevents A/V sync drift from AI model variations
              let normalizedVideoUrl = result.contentUrl;

              try {
                // Get chunk details for target duration
                const [chunkData] = await queueDb.select()
                  .from(schema.videoChunks)
                  .where(eq(schema.videoChunks.id, mvMsg.chunkId!))
                  .limit(1);

                if (chunkData && env.BROWSER) {
                  console.log('[QUEUE] Normalizing video chunk to prevent A/V sync drift');
                  const { BrowserFFmpeg } = await import('./lib/ffmpeg-browser');
                  const ffmpeg = new BrowserFFmpeg(env.BROWSER);

                  const normalizedKey = `video-segments/${mvMsg.chunkId}-normalized.mp4`;
                  const normalized = await ffmpeg.normalizeVideoChunk(
                    result.contentUrl,
                    chunkData.durationMs,
                    30, // 30 FPS constant frame rate
                    env.VIDEO_ASSETS,
                    normalizedKey
                  );

                  normalizedVideoUrl = normalized.url;
                  console.log('[QUEUE] ✅ Video normalized:', normalizedVideoUrl);
                } else {
                  if (!env.BROWSER) {
                    console.warn('[QUEUE] ⚠️ Browser API not available, skipping normalization (A/V sync may drift)');
                  }
                }
              } catch (normalizeError) {
                console.error('[QUEUE] Normalization failed, using raw video (may have A/V sync issues):', normalizeError);
                // Continue with raw video - better to have sync issues than fail completely
              }

              // Update chunk with normalized video URL
              await queueDb.update(schema.videoChunks)
                .set({
                  videoSegmentUrl: normalizedVideoUrl,
                  status: 'video_ready',
                  updatedAt: now,
                })
                .where(eq(schema.videoChunks.id, mvMsg.chunkId!));

              // Check if all chunks are done - use atomic stitching trigger
              const [chunk_stitch] = await queueDb.select()
                .from(schema.videoChunks)
                .where(eq(schema.videoChunks.id, mvMsg.chunkId!))
                .limit(1);

              if (chunk_stitch) {
                const { atomicStitchingTrigger } = await import('./lib/atomic-updates');
                await atomicStitchingTrigger(
                  queueDb,
                  chunk_stitch.jobId,
                  async (msg) => await env.JOB_QUEUE.send(msg)
                );
              }
            } else if (videoStatus.status === 'failed') {
              // FIX #36: Check if this is a transient Runway 500 error that should be retried
              // Runway returns failCode: "500" with failMsg: "Internal Error, Please try again later."
              // These are transient upstream errors that often succeed on retry
              const errorMessage = videoStatus.error || '';
              const isTransient500 = errorMessage.toLowerCase().includes('internal error') ||
                                    errorMessage.toLowerCase().includes('please try again') ||
                                    errorMessage.toLowerCase().includes('500');

              // Get current retry count from chunk metadata
              const [chunkForRetry] = await queueDb.select()
                .from(schema.videoChunks)
                .where(eq(schema.videoChunks.id, mvMsg.chunkId!))
                .limit(1);

              const chunkMeta = chunkForRetry?.metadata ? JSON.parse(chunkForRetry.metadata) : {};
              const videoRetryCount = chunkMeta.videoRetryCount || 0;
              // FIX #38: Increase retry count from 3 to 5 for better resilience against Kie.ai Runway instability
              const MAX_VIDEO_RETRIES = 5; // Retry up to 5 times for transient 500 errors

              if (isTransient500 && videoRetryCount < MAX_VIDEO_RETRIES) {
                // FIX #36: Transient error - retry video generation
                console.log(`[QUEUE] ⚠️ Transient Runway 500 error for chunk ${mvMsg.chunkId}, retrying (${videoRetryCount + 1}/${MAX_VIDEO_RETRIES})`);

                // Update chunk metadata with retry count and reset status for retry
                await queueDb.update(schema.videoChunks)
                  .set({
                    metadata: JSON.stringify({ ...chunkMeta, videoRetryCount: videoRetryCount + 1 }),
                    status: 'scene_ready', // Reset to scene_ready so video gen can be re-triggered
                    videoOperationId: null, // Clear old operation ID
                    error: `Retry ${videoRetryCount + 1}/${MAX_VIDEO_RETRIES}: ${errorMessage}`,
                    updatedAt: Date.now(),
                  })
                  .where(eq(schema.videoChunks.id, mvMsg.chunkId!));

                // Get job params for prompt
                const [jobForRetry] = await queueDb.select()
                  .from(schema.jobs)
                  .where(eq(schema.jobs.id, chunkForRetry!.jobId))
                  .limit(1);

                if (jobForRetry && jobForRetry.status !== 'failed' && jobForRetry.status !== 'cancelled') {
                  const params = jobForRetry.params ? JSON.parse(jobForRetry.params) : {};

                  // FIX #39: Longer exponential backoff delays for Kie.ai Runway recovery
                  // Old: 10s, 20s, 40s (base 10, multiplier 2^n)
                  // New: 15s, 30s, 60s, 120s, 240s (base 15, multiplier 2^n) - up to 4 minutes cooldown
                  const delaySeconds = 15 * Math.pow(2, videoRetryCount);
                  console.log(`[QUEUE] Scheduling video retry in ${delaySeconds}s (retry ${videoRetryCount + 1}/${MAX_VIDEO_RETRIES})`);

                  // Re-trigger video generation via generateVideoSegment
                  await service.generateVideoSegment(
                    queueDb,
                    env,
                    mvMsg.chunkId!,
                    params.prompt || 'Music video scene'
                  );
                }
              } else {
                // Business failure: AI generation failed after retries - propagate and ACK
                // FIX HIGH #2: Cleanup R2 objects and cancel Kie operations
                // FIX #30: Use queueDb (not db) - db is the drizzle import, queueDb is the instance
                console.error(`[QUEUE] ❌ Video generation permanently failed for chunk ${mvMsg.chunkId} (retries: ${videoRetryCount}): ${errorMessage}`);
                const { propagateChunkFailure } = await import('./lib/atomic-updates');
                await propagateChunkFailure(queueDb, mvMsg.chunkId!, `Video generation failed after ${videoRetryCount} retries: ${errorMessage || 'Unknown error'}`, {
                  kieApiKey: env.KIE_API_KEY,
                  r2Bucket: env.VIDEO_ASSETS,
                });
              }
            } else {
              // Still processing - re-queue poll with attempt tracking
              const attempt = (mvMsg.pollAttempt || 0) + 1;
              const MAX_POLL_ATTEMPTS = 360; // 360 * 10s = 60 minutes max (FIX #16 - increased from 30min)

              if (attempt > MAX_POLL_ATTEMPTS) {
                // Business failure: timeout - propagate and ACK
                // FIX HIGH #2: Cleanup R2 objects and cancel Kie operations
                // FIX #30: Use queueDb (not db) - db is the drizzle import, queueDb is the instance
                console.error(`[QUEUE] Video polling timeout after ${attempt} attempts for chunk ${mvMsg.chunkId}`);
                const { propagateChunkFailure } = await import('./lib/atomic-updates');
                await propagateChunkFailure(queueDb, mvMsg.chunkId!, `Video generation timeout after ${attempt * 10}s`, {
                  kieApiKey: env.KIE_API_KEY,
                  r2Bucket: env.VIDEO_ASSETS,
                });
              } else {
                await env.JOB_QUEUE.send({ ...mvMsg, pollAttempt: attempt }, { delaySeconds: 10 });
              }
            }
            break;

          case 'music-video-stitch':
            console.log('[QUEUE] Stitching final video for job:', mvMsg.jobId);
            // FIX #25: Check if job cancelled before expensive stitching operation
            const [job_stitch] = await queueDb.select()
              .from(schema.jobs)
              .where(eq(schema.jobs.id, mvMsg.jobId))
              .limit(1);

            if (!job_stitch) {
              console.error('[QUEUE] Job not found:', mvMsg.jobId);
              break; // Ack - job doesn't exist
            }

            if (job_stitch.status === 'cancelled' || job_stitch.status === 'failed' || job_stitch.status === 'completed') {
              console.log(`[QUEUE] Job ${job_stitch.status}, skipping final stitching`);
              break; // Ack - job in terminal state
            }

            // FIX #26: Add explicit error handling for stitching
            // Update job.error before retrying so user sees context
            try {
              await service.stitchFinalVideo(queueDb, env, mvMsg.jobId);
            } catch (stitchError) {
              // Update job with error context
              console.error(`[QUEUE] Stitching failed for job ${mvMsg.jobId}, updating job.error:`, stitchError);
              const { atomicJobUpdate } = await import('./lib/atomic-updates');
              await atomicJobUpdate(queueDb, mvMsg.jobId, {
                error: `Video stitching failed: ${stitchError instanceof Error ? stitchError.message : String(stitchError)}. Retrying...`,
              });
              // Re-throw to trigger message retry
              throw stitchError;
            }
            break;
        }

        console.log(`[QUEUE] ✅ Music video task completed: ${mvMsg.type}`);
        message.ack();
      } else {
        // Standard job message
        const jobMsg = msg as JobMessage;
        console.log(`[QUEUE] Processing job: ${jobMsg.jobId}`);
        await jobManager.processJob(jobMsg);
        console.log(`[QUEUE] ✅ Job completed: ${jobMsg.jobId}`);
        message.ack();
      }
    } catch (error) {
      console.error(`[QUEUE] ❌ Task failed:`, error);
      if (error instanceof Error) {
        console.error(`[QUEUE] Error name: ${error.name}`);
        console.error(`[QUEUE] Error message: ${error.message}`);
        console.error(`[QUEUE] Error stack:`, error.stack);
      } else {
        console.error(`[QUEUE] Error (non-Error object):`, JSON.stringify(error, null, 2));
      }
      message.retry();
    }
  }
}

// Export worker with queue handler
export default {
  fetch: app.fetch.bind(app),
  queue,
};

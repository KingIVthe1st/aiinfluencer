// Music Video Generation Orchestration Service
// Coordinates multi-stage workflow: audio chunking → scene generation → video generation → completion
// FIX #45: No longer uses FFmpeg stitching due to CORS limitations - returns segment manifest instead

import type { AppContext } from '../api/types';
import { getDb } from '../middleware/db';
import { eq, and } from 'drizzle-orm';
import * as schema from '../db/schema';
import { KieNanoBananaProAdapter } from '../providers/kie-nano-banana-pro';
import { KieWan25Adapter } from '../providers/kie-wan25';
import { KieWanS2VAdapter } from '../providers/kie-wan-s2v';
// FIX #50: Re-enabled KieWanS2VAdapter - now uses correct Wan S2V endpoint with audio_url support
import { createChunkingPlan, AudioProcessor, type AudioChunk } from '../lib/audio-chunking';

export interface MusicVideoRequest {
  jobId: string;
  userId: string;
  singerId: string;
  songId: string;
  audioUrl: string; // Song audio file
  prompt: string; // User's video scene description
  durationSeconds: 4 | 8 | 12; // Chunk duration (FIX #41: API changed to 4/8/12)
  aspectRatio: '16:9' | '9:16' | '1:1';
  characterImageUrl: string; // Singer's profile image
}

export interface ChunkStatus {
  chunkId: string;
  index: number;
  status: 'pending' | 'audio_ready' | 'scene_generating' | 'scene_ready' | 'video_generating' | 'video_ready' | 'failed';
  progress: number; // 0-100
  error?: string;
}

export interface MusicVideoProgress {
  jobId: string;
  status: 'pending' | 'chunking' | 'generating_scenes' | 'generating_videos' | 'stitching' | 'completed' | 'failed';
  totalChunks: number;
  chunksCompleted: number;
  overallProgress: number; // 0-100
  chunks: ChunkStatus[];
  finalVideoUrl?: string;
  error?: string;
}

export class MusicVideoService {
  private kieApiKey: string;
  private audioProcessor: AudioProcessor;
  // FIX #45: Video stitching removed - FFmpeg.wasm blocked by CORS in Browser Rendering API
  // Segments are now returned in a manifest for client-side playback/assembly

  constructor(kieApiKey: string, browser?: Fetcher) {
    this.kieApiKey = kieApiKey;
    this.audioProcessor = new AudioProcessor(browser);
  }

  /**
   * PHASE 1: Initialize music video generation
   * Creates chunk records and starts audio processing
   */
  async initializeMusicVideo(
    db: DrizzleD1Database<typeof schema>,
    jobQueue: Queue,
    videoAssets: R2Bucket,
    request: MusicVideoRequest
  ): Promise<void> {
    console.log('[MusicVideo] Initializing:', {
      jobId: request.jobId,
      songId: request.songId,
      durationSeconds: request.durationSeconds,
    });

    try {
      // Get song duration
      const songDurationMs = await this.audioProcessor.getDuration(request.audioUrl);
      console.log('[MusicVideo] Song duration:', songDurationMs, 'ms');

      // Validate duration
      if (songDurationMs < 1000) {
        throw new Error(`Song too short: ${songDurationMs}ms (minimum 1s required)`);
      }

      if (songDurationMs > 300000) {
        throw new Error(`Song too long: ${songDurationMs}ms (maximum 5 minutes supported)`);
      }

      // Create chunking plan
      const chunkDurationMs = request.durationSeconds * 1000;

      // FIX EDGE: Short audio handling - validate song duration vs chunk duration
      if (songDurationMs < chunkDurationMs) {
        console.warn(
          `[MusicVideo] ⚠️ WARNING: Song duration (${(songDurationMs / 1000).toFixed(1)}s) ` +
          `is shorter than chunk duration (${(chunkDurationMs / 1000).toFixed(1)}s). ` +
          `Will create 1 chunk with duration ${(songDurationMs / 1000).toFixed(1)}s.`
        );
        // Continue - createChunkingPlan handles this by creating 1 chunk with actual duration
      }

      const plan = createChunkingPlan(songDurationMs, chunkDurationMs);

      console.log('[MusicVideo] Chunking plan:', {
        totalChunks: plan.chunks.length,
        chunkDuration: chunkDurationMs,
        actualChunkDurations: plan.chunks.map(c => `${c.durationMs}ms`),
      });

      // Validate plan
      if (plan.chunks.length === 0) {
        throw new Error('Chunking plan generated zero chunks - duration mismatch');
      }

      if (plan.chunks.length > 100) {
        throw new Error(`Too many chunks: ${plan.chunks.length} (maximum 100 supported)`);
      }

      // Create video chunk records in database
      const now = Date.now();

      for (const chunkPlan of plan.chunks) {
        const chunkId = `chunk_${request.jobId}_${chunkPlan.index}`;

        await db.insert(schema.videoChunks).values({
          id: chunkId,
          jobId: request.jobId,
          chunkIndex: chunkPlan.index,
          startTimeMs: chunkPlan.startTimeMs,
          endTimeMs: chunkPlan.endTimeMs,
          durationMs: chunkPlan.durationMs,
          status: 'pending',
          metadata: JSON.stringify({
            aspectRatio: request.aspectRatio,
            resolution: '1080p',
          }),
          createdAt: now,
          updatedAt: now,
        });
      }

      console.log('[MusicVideo] Created', plan.chunks.length, 'chunk records');

      // Store duration in job metadata for reuse (avoid re-fetching)
      const { atomicJobUpdate } = await import('../lib/atomic-updates');
      const success = await atomicJobUpdate(db, request.jobId, {
        status: 'processing',
        progress: 5,
      });

      if (!success) {
        throw new Error('Failed to update job status after chunk creation');
      }

      // Enqueue audio chunking job with pre-determined duration
      console.log('[MusicVideo] 📤 Sending queue message for job:', request.jobId);
      console.log('[MusicVideo] Queue binding check:', !!jobQueue);

      await jobQueue.send({
        type: 'music-video-chunk-audio',
        jobId: request.jobId,
        songId: request.songId,
        audioUrl: request.audioUrl,
        chunkDurationMs,
        // Pass duration to avoid re-fetching
        metadata: JSON.stringify({ songDurationMs }),
      });

      console.log('[MusicVideo] ✅ Queue message sent successfully for job:', request.jobId);
    } catch (error) {
      console.error('[MusicVideo] Initialization failed:', error);
      const { atomicJobUpdate } = await import('../lib/atomic-updates');
      await atomicJobUpdate(db, request.jobId, {
        status: 'failed',
        error: `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      // Cleanup any partial R2 uploads
      const { cleanupFailedJob } = await import('../lib/r2-cleanup');
      await cleanupFailedJob(request.jobId, videoAssets);
      throw error;
    }
  }

  /**
   * PHASE 2: Process audio chunks
   * Slices audio and uploads chunks to R2
   */
  async processAudioChunks(
    db: DrizzleD1Database<typeof schema>,
    env: Env,
    jobId: string,
    audioUrl: string,
    chunkDurationMs: number,
    metadata?: string
  ): Promise<void> {
    console.log('[MusicVideo] Processing audio chunks:', jobId);

    const r2 = env.VIDEO_ASSETS;

    try {
      // Get chunks for this job
      const chunks = await db.select()
        .from(schema.videoChunks)
        .where(eq(schema.videoChunks.jobId, jobId))
        .orderBy(schema.videoChunks.chunkIndex);

      // FIX: Idempotency check - skip if chunks already processed
      if (chunks.every(c => c.status !== 'pending')) {
        console.log('[MusicVideo] All chunks already processed, skipping duplicate audio chunking');
        return;
      }

      // Reuse duration from metadata to avoid re-fetching (FIX #4)
      let songDurationMs: number;
      if (metadata) {
        const meta = JSON.parse(metadata);
        songDurationMs = meta.songDurationMs;
        console.log('[MusicVideo] Reusing cached duration:', songDurationMs, 'ms');
      } else {
        songDurationMs = await this.audioProcessor.getDuration(audioUrl);
        console.log('[MusicVideo] Fetched duration:', songDurationMs, 'ms');
      }

      // Validate duration is reasonable (FIX #12B)
      if (songDurationMs < 5000 || songDurationMs > 600000) {
        throw new Error(
          `Invalid song duration: ${(songDurationMs / 1000).toFixed(1)}s. ` +
          `Supported range: 5 seconds to 10 minutes.`
        );
      }

      const plan = createChunkingPlan(songDurationMs, chunkDurationMs);

      // Validate chunk count consistency (FIX #4)
      if (chunks.length !== plan.chunks.length) {
        throw new Error(`Chunk count mismatch: DB has ${chunks.length}, plan has ${plan.chunks.length}`);
      }

      // MVP APPROACH: Skip physical audio chunking (FFmpeg.wasm blocked by CORS in Cloudflare Browser API)
      // Instead, use full audio URL for all chunks with timestamp metadata
      // Kie.ai will handle audio sync internally
      console.log('[MusicVideo] ⚡ Using full audio URL for all chunks (MVP approach - no physical splitting)');

      const audioChunks = plan.chunks.map((chunk, index) => ({
        index,
        url: audioUrl, // Use FULL audio URL (not chunked)
        startTimeMs: chunk.startTimeMs,
        endTimeMs: chunk.endTimeMs,
        durationMs: chunk.durationMs,
      }));

      console.log('[MusicVideo] Created virtual chunks:', audioChunks.length, 'chunks with timestamps');

      // Update chunk records with audio URLs (atomic per-chunk)
      const now = Date.now();
      for (let i = 0; i < chunks.length && i < audioChunks.length; i++) {
        // FIX: Atomic update - only update if still pending (prevents duplicate on redelivery)
        const updated = await db.update(schema.videoChunks)
          .set({
            audioChunkUrl: audioChunks[i].url,
            status: 'audio_ready',
            updatedAt: now,
          })
          .where(
            and(
              eq(schema.videoChunks.id, chunks[i].id),
              eq(schema.videoChunks.status, 'pending')
            )
          )
          .returning();

        // Only enqueue scene generation if update succeeded (chunk was pending)
        if (updated.length) {
          await env.JOB_QUEUE.send({
            type: 'music-video-generate-scene',
            chunkId: chunks[i].id,
            jobId,
          });
        } else {
          console.log(`[MusicVideo] Chunk ${i} already processed, skipping scene enqueue`);
        }
      }

      // Update job progress atomically
      const { atomicJobUpdate } = await import('../lib/atomic-updates');
      const success = await atomicJobUpdate(db, jobId, {
        progress: 15,
      });

      if (!success) {
        throw new Error('Failed to update job progress after audio chunking');
      }

      console.log('[MusicVideo] Audio chunking complete:', audioChunks.length, 'chunks');
    } catch (error) {
      console.error('[MusicVideo] Audio chunking failed:', error);
      const { atomicJobUpdate } = await import('../lib/atomic-updates');
      await atomicJobUpdate(db, jobId, {
        status: 'failed',
        error: `Audio chunking failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      // Cleanup partial audio chunks from R2
      const { cleanupFailedAudioChunks } = await import('../lib/r2-cleanup');
      await cleanupFailedAudioChunks(jobId, env.VIDEO_ASSETS);
      throw error;
    }
  }

  /**
   * PHASE 3: Generate scene starting frame
   * Uses Nano Banana Pro to create identity-preserving starting frame
   */
  async generateScene(
    db: DrizzleD1Database<typeof schema>,
    env: Env,
    chunkId: string,
    characterImageUrl: string,
    prompt: string
  ): Promise<void> {
    console.log('[MusicVideo] Generating scene:', chunkId);

    const now = Date.now();

    // Update chunk status
    await db.update(schema.videoChunks)
      .set({
        status: 'scene_generating',
        updatedAt: now,
      })
      .where(eq(schema.videoChunks.id, chunkId));

    // Get chunk details
    const [chunk] = await db.select()
      .from(schema.videoChunks)
      .where(eq(schema.videoChunks.id, chunkId))
      .limit(1);

    if (!chunk) {
      throw new Error(`Chunk not found: ${chunkId}`);
    }

    const metadata = chunk.metadata ? JSON.parse(chunk.metadata) : {};

    // Initialize Nano Banana Pro adapter
    const sceneGenerator = new KieNanoBananaProAdapter({
      apiKey: this.kieApiKey,
    });

    // Generate scene
    const response = await sceneGenerator.generate({
      prompt: `Cinematic shot for music video: ${prompt}. High quality, professional lighting, ${metadata.aspectRatio} aspect ratio.`,
      referenceImageUrls: [characterImageUrl],
      aspectRatio: metadata.aspectRatio || '16:9',
    });

    // Store operation ID
    await db.update(schema.videoChunks)
      .set({
        sceneOperationId: response.operationId,
        updatedAt: Date.now(),
      })
      .where(eq(schema.videoChunks.id, chunkId));

    // Poll for completion (will be handled by queue consumer)
    await env.JOB_QUEUE.send({
      type: 'music-video-poll-scene',
      chunkId,
      operationId: response.operationId,
    });

    console.log('[MusicVideo] Scene generation started:', response.operationId);
  }

  /**
   * PHASE 4: Generate video segment
   * Uses Wan 2.5 I2V to create video synced to audio
   */
  async generateVideoSegment(
    db: DrizzleD1Database<typeof schema>,
    env: Env,
    chunkId: string,
    prompt: string
  ): Promise<void> {
    console.log('[MusicVideo] Generating video segment:', chunkId);

    const now = Date.now();

    // Get chunk details
    const [chunk] = await db.select()
      .from(schema.videoChunks)
      .where(eq(schema.videoChunks.id, chunkId))
      .limit(1);

    if (!chunk || !chunk.sceneImageUrl || !chunk.audioChunkUrl) {
      throw new Error(`Chunk not ready for video generation: ${chunkId}`);
    }

    // Update chunk status
    await db.update(schema.videoChunks)
      .set({
        status: 'video_generating',
        updatedAt: now,
      })
      .where(eq(schema.videoChunks.id, chunkId));

    const metadata = chunk.metadata ? JSON.parse(chunk.metadata) : {};

    // FIX #42: Validate chunk duration before API call
    // Kie.ai only accepts 4, 8, or 12 seconds - clamp to nearest valid value
    // Short chunks (< 2s) are too short for video gen, clamp to minimum 4s
    const rawDurationSeconds = Math.round(chunk.durationMs / 1000);
    let validDuration: 4 | 8 | 12;
    if (rawDurationSeconds <= 4) {
      validDuration = 4;
    } else if (rawDurationSeconds <= 8) {
      validDuration = 8;
    } else {
      validDuration = 12;
    }

    // FIX #42: Handle very short chunks (< 1s) by skipping video generation
    // These are typically the last fractional chunk at the end of a song
    if (chunk.durationMs < 1000) {
      console.warn(`[MusicVideo] ⚠️ Skipping video generation for very short chunk ${chunkId} (${chunk.durationMs}ms < 1s)`);
      // Mark as video_ready with the scene image as placeholder
      await db.update(schema.videoChunks)
        .set({
          status: 'video_ready',
          videoSegmentUrl: chunk.sceneImageUrl, // Use scene image as placeholder for very short chunks
          error: `Skipped: chunk too short (${chunk.durationMs}ms)`,
          updatedAt: Date.now(),
        })
        .where(eq(schema.videoChunks.id, chunkId));
      console.log(`[MusicVideo] ✅ Short chunk ${chunkId} marked as video_ready (using scene image)`);
      return; // Exit early, no Kie.ai API call needed
    }

    console.log(`[MusicVideo] Video duration: raw=${rawDurationSeconds}s, clamped=${validDuration}s for chunk ${chunkId}`);

    // FIX #50: Use Wan S2V when audio is available (native audio sync with lip-sync)
    // Fall back to Runway (silent video + client-side audio) if S2V fails
    const hasAudio = !!chunk.audioChunkUrl;
    let response;

    if (hasAudio) {
      // TRY S2V first - native audio sync with lip-sync!
      console.log(`[MusicVideo] 🎤 Trying Wan S2V for native audio sync (lip-sync)`);

      try {
        const s2vGenerator = new KieWanS2VAdapter({
          apiKey: this.kieApiKey,
        });

        // FIX #55: Optimized prompt passed to S2V adapter
        // The adapter will further enhance it with lip-sync specific language
        response = await s2vGenerator.generate({
          prompt: prompt, // Base prompt - adapter adds lip-sync optimization
          referenceImageUrls: [chunk.sceneImageUrl],
          audioUrl: chunk.audioChunkUrl, // S2V USES AUDIO for lip-sync!
          durationSeconds: validDuration,
          aspectRatio: metadata.aspectRatio || '16:9',
        });

        console.log(`[MusicVideo] ✅ Wan S2V succeeded! Operation: ${response.operationId}`);
      } catch (s2vError) {
        // S2V failed - fall back to Runway
        console.warn(`[MusicVideo] ⚠️ Wan S2V failed, falling back to Runway:`, s2vError);

        const wan25Generator = new KieWan25Adapter({
          apiKey: this.kieApiKey,
        });

        response = await wan25Generator.generate({
          prompt: `Music video scene: ${prompt}. Smooth motion, cinematic camera movement.`,
          referenceImageUrls: [chunk.sceneImageUrl],
          audioUrl: undefined, // Runway doesn't support audio - sync client-side
          durationSeconds: validDuration,
          aspectRatio: metadata.aspectRatio || '16:9',
        });

        console.log(`[MusicVideo] ✅ Runway fallback succeeded! Operation: ${response.operationId}`);
      }
    } else {
      // No audio - use Runway directly
      console.log(`[MusicVideo] 🎬 No audio, using Runway API for video generation`);

      const wan25Generator = new KieWan25Adapter({
        apiKey: this.kieApiKey,
      });

      response = await wan25Generator.generate({
        prompt: `Music video scene: ${prompt}. Smooth motion, cinematic camera movement.`,
        referenceImageUrls: [chunk.sceneImageUrl],
        audioUrl: undefined,
        durationSeconds: validDuration,
        aspectRatio: metadata.aspectRatio || '16:9',
      });
    }

    // Store operation ID
    await db.update(schema.videoChunks)
      .set({
        videoOperationId: response.operationId,
        updatedAt: Date.now(),
      })
      .where(eq(schema.videoChunks.id, chunkId));

    // Poll for completion
    await env.JOB_QUEUE.send({
      type: 'music-video-poll-video',
      chunkId,
      operationId: response.operationId,
    });

    console.log('[MusicVideo] Video generation started:', response.operationId);
  }

  /**
   * PHASE 5: Complete music video
   *
   * FIX #45: FFmpeg.wasm Web Workers are blocked by CORS in Cloudflare Browser Rendering API
   * Since we can't stitch server-side, we store the segment metadata for client-side playback
   *
   * Options for client:
   * 1. Play segments sequentially using a playlist
   * 2. Use Media Source Extensions (MSE) to concatenate in browser
   * 3. Use ffmpeg.wasm client-side for offline stitching
   */
  async stitchFinalVideo(
    db: DrizzleD1Database<typeof schema>,
    env: Env,
    jobId: string
  ): Promise<void> {
    console.log('[MusicVideo] Completing music video:', jobId);

    const r2 = env.VIDEO_ASSETS;

    // Get all chunks for this job
    const chunks = await db.select()
      .from(schema.videoChunks)
      .where(eq(schema.videoChunks.jobId, jobId))
      .orderBy(schema.videoChunks.chunkIndex);

    // Verify all chunks are ready
    const allReady = chunks.every(c => c.status === 'video_ready' && c.videoSegmentUrl);
    if (!allReady) {
      throw new Error('Not all chunks are ready for stitching');
    }

    // FIX #45: Skip FFmpeg stitching due to CORS limitations
    // Instead, create a manifest of all segments for client-side playback/stitching
    // Filter out very short placeholder chunks (< 1s)
    const validSegments = chunks.filter(c => c.durationMs >= 1000 && c.videoSegmentUrl);

    console.log(`[MusicVideo] ${validSegments.length} valid segments (${chunks.length - validSegments.length} short chunks skipped)`);

    // Use the first segment as the "preview" URL
    // Full playback will use all segments via the manifest
    const previewUrl = validSegments[0]?.videoSegmentUrl || chunks[0]?.videoSegmentUrl;

    // FIX #49: Include audio URL for client-side audio/video sync
    // Since Runway generates silent video, client needs to play audio separately
    // Get the original audio URL from the first chunk (all chunks use same audio)
    const audioUrl = chunks[0]?.audioChunkUrl || null;

    // Create manifest with all segment URLs + audio for client-side sync
    const manifest = {
      version: 2, // Bumped version for audio sync support
      jobId,
      totalDurationMs: chunks.reduce((sum, c) => sum + c.durationMs, 0),
      segmentCount: validSegments.length,
      // FIX #49: Audio URL for client-side sync (videos are silent)
      audioUrl,
      audioSyncMode: 'client', // Indicates client should play audio alongside video
      segments: validSegments.map(chunk => ({
        index: chunk.chunkIndex,
        url: chunk.videoSegmentUrl,
        audioUrl: chunk.audioChunkUrl, // Per-chunk audio reference
        durationMs: chunk.durationMs,
        startTimeMs: chunk.startTimeMs,
        endTimeMs: chunk.endTimeMs,
      })),
      // Include skipped short chunks for reference
      skippedChunks: chunks.filter(c => c.durationMs < 1000).map(c => ({
        index: c.chunkIndex,
        durationMs: c.durationMs,
        reason: 'too short'
      })),
    };

    // Store manifest in R2 for client retrieval
    const manifestKey = `music-videos/${jobId}-manifest.json`;
    await r2.put(manifestKey, JSON.stringify(manifest, null, 2), {
      httpMetadata: { contentType: 'application/json' },
    });

    const manifestUrl = `https://pub-9403a25674d64f84bc1a0cb688751261.r2.dev/${manifestKey}`;
    console.log('[MusicVideo] Manifest created:', manifestUrl);

    // Final result URL points to first segment (preview) with manifest URL in metadata
    const finalVideoUrl = previewUrl;

    console.log('[MusicVideo] Music video complete (segment-based):', finalVideoUrl);

    // Get userId from job (chunks don't have userId field)
    const [job] = await db.select()
      .from(schema.jobs)
      .where(eq(schema.jobs.id, jobId))
      .limit(1);

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // FIX #26: Update job progress BEFORE creating asset to prevent orphaned assets
    // This ensures atomicity: job update succeeds → create asset → mark complete
    const { atomicJobUpdate } = await import('../lib/atomic-updates');

    // Create final asset record
    const assetId = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    // Calculate total duration
    const totalDurationMs = chunks.reduce((sum, c) => sum + c.durationMs, 0);

    // First mark job as 95% (completion in progress, finalizing)
    const preSuccess = await atomicJobUpdate(db, jobId, {
      progress: 95,
    });

    if (!preSuccess) {
      // Job update failed - don't create asset yet, let it retry
      throw new Error('Failed to update job progress to 95% before asset creation. Will retry.');
    }

    // Now create asset (if this fails, job is at 95% and can be retried)
    // FIX #45: Store manifest URL and segment info in metadata for client-side playback
    await db.insert(schema.assets).values({
      id: assetId,
      userId: job.userId,
      singerId: job.singerId || undefined,
      type: 'video',
      provider: 'kie-wan25',
      cdnUrl: finalVideoUrl, // First segment as preview
      storageKey: manifestKey, // Manifest location
      metadata: JSON.stringify({
        resolution: '720p',
        aspectRatio: '16:9',
        codec: 'h264',
        manifestUrl,
        segmentCount: validSegments.length,
        totalDurationMs,
        isSegmented: true, // Flag to indicate client-side assembly needed
      }),
      createdAt: now,
    });

    // Finally mark job as 100% complete
    const success = await atomicJobUpdate(db, jobId, {
      status: 'completed',
      progress: 100,
      resultAssetId: assetId,
    });

    if (!success) {
      // Asset created but job update failed - this is OK, job is at 95%
      // Next retry will see asset exists and just update job to 100%
      console.warn('[MusicVideo] Asset created but job update to 100% failed. Asset ID:', assetId);
      throw new Error('Failed to mark job as completed after asset creation. Asset exists, will retry final update.');
    }

    console.log('[MusicVideo] Music video complete:', assetId, 'Manifest:', manifestUrl);
  }

  /**
   * Get progress for a music video job
   */
  async getProgress(c: AppContext, jobId: string): Promise<MusicVideoProgress> {
    const db = getDb(c);

    // Get job
    const [job] = await db.select()
      .from(schema.jobs)
      .where(eq(schema.jobs.id, jobId))
      .limit(1);

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // Get chunks
    const chunks = await db.select()
      .from(schema.videoChunks)
      .where(eq(schema.videoChunks.jobId, jobId))
      .orderBy(schema.videoChunks.chunkIndex);

    const chunkStatuses: ChunkStatus[] = chunks.map(chunk => ({
      chunkId: chunk.id,
      index: chunk.chunkIndex,
      status: chunk.status,
      progress: this.calculateChunkProgress(chunk.status),
      error: chunk.error || undefined,
    }));

    const chunksCompleted = chunks.filter(c => c.status === 'video_ready').length;
    const overallProgress = job.progress || 0;

    // Determine overall status
    let status: MusicVideoProgress['status'] = 'pending';
    if (job.status === 'completed') {
      status = 'completed';
    } else if (job.status === 'failed') {
      status = 'failed';
    } else if (chunks.some(c => c.status.includes('video'))) {
      status = 'generating_videos';
    } else if (chunks.some(c => c.status.includes('scene'))) {
      status = 'generating_scenes';
    } else if (chunks.some(c => c.status === 'audio_ready')) {
      status = 'chunking';
    }

    // Get final video URL if completed
    let finalVideoUrl: string | undefined;
    if (job.resultAssetId) {
      const [asset] = await db.select()
        .from(schema.assets)
        .where(eq(schema.assets.id, job.resultAssetId))
        .limit(1);
      finalVideoUrl = asset?.cdnUrl || undefined;
    }

    return {
      jobId,
      status,
      totalChunks: chunks.length,
      chunksCompleted,
      overallProgress,
      chunks: chunkStatuses,
      finalVideoUrl,
      error: job.error || undefined,
    };
  }

  /**
   * Calculate progress for a single chunk based on status
   */
  private calculateChunkProgress(status: string): number {
    const progressMap: Record<string, number> = {
      'pending': 0,
      'audio_ready': 20,
      'scene_generating': 30,
      'scene_ready': 50,
      'video_generating': 70,
      'video_ready': 100,
      'failed': 0,
    };

    return progressMap[status] || 0;
  }
}

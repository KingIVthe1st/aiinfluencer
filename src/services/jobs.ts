// AI Singer Studio - Job Manager for Queue Operations

import type {
  ProviderAdapter,
  GenerationRequest,
  GenerationResponse,
} from '../providers/types';
import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../db/schema';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type JobType = 'image' | 'audio' | 'video';

export interface Job {
  id: string;
  userId: string;
  singerId: string | null;
  type: JobType;
  status: JobStatus;
  provider: string;
  operationId: string | null;
  progress: number;
  resultAssetId: string | null;
  params: string | null; // JSON string of request params
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobMessage {
  jobId: string;
  userId: string;
  singerId: string | null;
  type: JobType;
  provider: string;
  request: GenerationRequest;
  retryCount?: number;
}

/**
 * JobManager - Handles async generation jobs via Queues
 */
export class JobManager {
  constructor(
    private db: DrizzleD1Database<typeof schema>,
    private queue: Queue,
    private providers: Record<string, ProviderAdapter>,
    private storage?: { uploadImage: Function; uploadAudio: Function; uploadVideo: Function }
  ) {}

  /**
   * Create and enqueue a new job
   */
  async createJob(
    userId: string,
    singerId: string | null,
    type: JobType,
    provider: string,
    request: GenerationRequest
  ): Promise<Job> {
    const jobId = `${type}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = Date.now();

    const [dbJob] = await this.db
      .insert(schema.jobs)
      .values({
        id: jobId,
        userId,
        singerId,
        type,
        status: 'pending',
        provider,
        operationId: null,
        progress: 0,
        resultAssetId: null,
        params: JSON.stringify(request), // Store request params for later use
        error: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Enqueue job message
    const message: JobMessage = {
      jobId,
      userId,
      singerId,
      type,
      provider,
      request,
      retryCount: 0,
    };

    await this.queue.send(message);

    return {
      id: dbJob.id,
      userId: dbJob.userId,
      singerId: dbJob.singerId,
      type: type as JobType,
      status: 'pending' as JobStatus,
      provider: dbJob.provider,
      operationId: dbJob.operationId,
      progress: dbJob.progress || 0,
      resultAssetId: dbJob.resultAssetId,
      params: dbJob.params,
      error: dbJob.error,
      createdAt: dbJob.createdAt,
      updatedAt: dbJob.updatedAt,
    };
  }

  /**
   * Process job from queue
   */
  async processJob(message: JobMessage): Promise<void> {
    const { jobId, provider, request } = message;

    try {
      await this.updateJobStatus(jobId, 'processing', 0);

      const adapter = this.providers[provider];
      if (!adapter) {
        throw new Error(`Unknown provider: ${provider}`);
      }

      const response = await adapter.generate(request);

      await this.db
        .update(schema.jobs)
        .set({
          operationId: response.operationId,
          updatedAt: Date.now(),
        })
        .where(eq(schema.jobs.id, jobId));

      if (response.status === 'completed') {
        await this.handleCompletion(jobId, adapter, response);
      } else {
        await this.pollCompletion(jobId, adapter, response.operationId);
      }
    } catch (error) {
      await this.handleError(jobId, error as Error, message);
    }
  }

  /**
   * Poll provider for completion
   */
  private async pollCompletion(
    jobId: string,
    adapter: ProviderAdapter,
    operationId: string
  ): Promise<void> {
    const maxAttempts = 60;
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        const response = await adapter.getStatus(operationId);

        await this.updateJobStatus(jobId, 'processing', response.progress || 0);

        if (response.status === 'completed') {
          await this.handleCompletion(jobId, adapter, response);
          return;
        }

        if (response.status === 'failed') {
          throw new Error(response.metadata?.error || 'Generation failed');
        }

        await new Promise(resolve => setTimeout(resolve, 10000));
      } catch (error) {
        throw error;
      }
    }

    throw new Error('Job timeout');
  }

  /**
   * Handle job completion
   * Downloads asset from provider, uploads to R2, creates asset record
   */
  private async handleCompletion(
    jobId: string,
    adapter: ProviderAdapter,
    response: GenerationResponse
  ): Promise<void> {
    // Get job details
    const job = await this.getJob(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    let assetId: string | null = null;

    // Only upload to R2 if storage service is available
    if (this.storage) {
      try {
        let assetData: ArrayBuffer;

        // Check if we have base64 data in metadata (Gemini imageData or ElevenLabs audioData)
        const base64Data = response.metadata?.imageData || response.metadata?.audioData;
        if (base64Data) {
          // Decode base64 to ArrayBuffer
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          assetData = bytes.buffer;
        } else if (response.assetUrl || response.metadata?.imageUrl || response.metadata?.audioUrl || response.metadata?.videoUrl) {
          // Download asset from provider URL (check multiple possible locations)
          const assetUrl = response.assetUrl || response.metadata?.imageUrl || response.metadata?.audioUrl || response.metadata?.videoUrl;
          console.log(`[JobManager] Downloading asset from: ${assetUrl}`);
          const assetResponse = await fetch(assetUrl);
          if (!assetResponse.ok) {
            throw new Error(`Failed to download asset: ${assetResponse.statusText}`);
          }
          assetData = await assetResponse.arrayBuffer();
        } else {
          throw new Error('No asset data or URL in response');
        }

        // Upload to R2 based on job type
        let uploadResult;
        if (job.type === 'image') {
          uploadResult = await this.storage.uploadImage(
            job.userId,
            job.singerId || 'none',
            assetData,
            {
              jobId,
              provider: job.provider,
              operationId: response.operationId,
            }
          );
        } else if (job.type === 'audio') {
          uploadResult = await this.storage.uploadAudio(
            job.userId,
            job.singerId || 'none',
            assetData,
            {
              jobId,
              provider: job.provider,
              operationId: response.operationId,
            }
          );
        } else if (job.type === 'video') {
          uploadResult = await this.storage.uploadVideo(
            job.userId,
            job.singerId || 'none',
            assetData,
            {
              jobId,
              provider: job.provider,
              operationId: response.operationId,
            }
          );
        }

        // Create asset record in database
        if (uploadResult) {
          assetId = `asset_${Date.now()}_${Math.random().toString(36).substring(7)}`;

          // Parse job params to extract user-provided metadata (song name, duration, etc.)
          let jobParams: any = {};
          try {
            jobParams = job.params ? JSON.parse(job.params) : {};
          } catch (e) {
            console.error('[JobManager] Failed to parse job params:', e);
          }

          // Merge job params metadata with provider response metadata
          // Priority: provider response metadata > job params metadata > job params direct fields
          const mergedMetadata = {
            ...(response.metadata || {}),
            // For audio jobs, include song name and duration from job params
            ...(job.type === 'audio' && {
              name: jobParams.metadata?.name || response.metadata?.name,
              duration: jobParams.durationMs ? Math.floor(jobParams.durationMs / 1000) : response.metadata?.duration,
              mode: jobParams.metadata?.mode || jobParams.mode,
              voiceId: jobParams.metadata?.voiceId,
              voiceStyle: jobParams.metadata?.voiceStyle,
            }),
            // For all jobs, preserve original request details
            prompt: jobParams.prompt || response.metadata?.prompt,
            genre: jobParams.genre,
            mood: jobParams.mood,
            lyrics: jobParams.lyrics,
          };

          await this.db.insert(schema.assets).values({
            id: assetId,
            userId: job.userId,
            singerId: job.singerId,
            type: job.type,
            provider: job.provider,
            cdnUrl: uploadResult.url,
            storageKey: uploadResult.key,
            metadata: JSON.stringify(mergedMetadata),
            provenance: JSON.stringify({
              jobId,
              operationId: response.operationId,
              createdAt: new Date().toISOString(),
            }),
            createdAt: Date.now(),
          });

          // For audio jobs, also create a song record
          if (job.type === 'audio' && job.singerId) {
            const songId = `song_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const now = Date.now();
            const durationMs = jobParams.durationMs || mergedMetadata.duration * 1000 || 30000;

            await this.db.insert(schema.songs).values({
              id: songId,
              userId: job.userId,
              singerId: job.singerId,
              title: mergedMetadata.name || `Song ${Date.now()}`,
              description: `Generated song from ${job.provider}`,
              status: 'completed',
              genre: jobParams.genre || mergedMetadata.genre,
              mood: jobParams.mood ? JSON.stringify([jobParams.mood]) : null,
              duration: durationMs,
              activeVersionId: null, // No version system for simple generation
              createdAt: now,
              updatedAt: now,
              publishedAt: now,
            });

            // Update job with songId for reference
            await this.db
              .update(schema.jobs)
              .set({
                songId: songId,
                updatedAt: Date.now(),
              })
              .where(eq(schema.jobs.id, jobId));

            console.log(`[JobManager] Created song record: ${songId}`);
          }
        }
      } catch (error) {
        console.error('Asset upload failed:', error);
        // Continue with job completion even if upload fails
        // The job will be marked completed but without resultAssetId
      }
    }

    // Update job status
    await this.db
      .update(schema.jobs)
      .set({
        status: 'completed',
        progress: 100,
        resultAssetId: assetId,
        updatedAt: Date.now(),
      })
      .where(eq(schema.jobs.id, jobId));
  }

  /**
   * Handle job error
   */
  private async handleError(
    jobId: string,
    error: Error,
    message: JobMessage
  ): Promise<void> {
    const retryCount = (message.retryCount || 0) + 1;
    const maxRetries = 3;
    const isRetryable = (error as any).retryable === true;

    if (isRetryable && retryCount < maxRetries) {
      const delayMs = Math.pow(2, retryCount) * 1000;

      await this.queue.send(
        {
          ...message,
          retryCount,
        },
        {
          delaySeconds: Math.floor(delayMs / 1000),
        }
      );

      await this.db
        .update(schema.jobs)
        .set({
          error: `Retrying (${retryCount}/${maxRetries}): ${error.message}`,
          updatedAt: Date.now(),
        })
        .where(eq(schema.jobs.id, jobId));
    } else {
      await this.db
        .update(schema.jobs)
        .set({
          status: 'failed',
          error: error.message,
          updatedAt: Date.now(),
        })
        .where(eq(schema.jobs.id, jobId));
    }
  }

  /**
   * Update job status and progress
   */
  private async updateJobStatus(
    jobId: string,
    status: JobStatus,
    progress: number
  ): Promise<void> {
    await this.db
      .update(schema.jobs)
      .set({
        status,
        progress,
        updatedAt: Date.now(),
      })
      .where(eq(schema.jobs.id, jobId));
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job | null> {
    const [dbJob] = await this.db
      .select()
      .from(schema.jobs)
      .where(eq(schema.jobs.id, jobId))
      .limit(1);

    if (!dbJob) {
      return null;
    }

    return {
      id: dbJob.id,
      userId: dbJob.userId,
      singerId: dbJob.singerId,
      type: dbJob.type as JobType,
      status: dbJob.status as JobStatus,
      provider: dbJob.provider,
      operationId: dbJob.operationId,
      progress: dbJob.progress || 0,
      resultAssetId: dbJob.resultAssetId,
      params: dbJob.params,
      error: dbJob.error,
      createdAt: dbJob.createdAt,
      updatedAt: dbJob.updatedAt,
    };
  }

  /**
   * Get jobs for user
   */
  async getUserJobs(
    userId: string,
    limit: number = 50
  ): Promise<Job[]> {
    const dbJobs = await this.db
      .select()
      .from(schema.jobs)
      .where(eq(schema.jobs.userId, userId))
      .orderBy(schema.jobs.createdAt)
      .limit(limit);

    return dbJobs.map(dbJob => ({
      id: dbJob.id,
      userId: dbJob.userId,
      singerId: dbJob.singerId,
      type: dbJob.type as JobType,
      status: dbJob.status as JobStatus,
      provider: dbJob.provider,
      operationId: dbJob.operationId,
      progress: dbJob.progress || 0,
      resultAssetId: dbJob.resultAssetId,
      params: dbJob.params,
      error: dbJob.error,
      createdAt: dbJob.createdAt,
      updatedAt: dbJob.updatedAt,
    }));
  }

  /**
   * Get jobs for singer
   */
  async getSingerJobs(
    singerId: string,
    limit: number = 50
  ): Promise<Job[]> {
    const dbJobs = await this.db
      .select()
      .from(schema.jobs)
      .where(eq(schema.jobs.singerId, singerId))
      .orderBy(schema.jobs.createdAt)
      .limit(limit);

    return dbJobs.map(dbJob => ({
      id: dbJob.id,
      userId: dbJob.userId,
      singerId: dbJob.singerId,
      type: dbJob.type as JobType,
      status: dbJob.status as JobStatus,
      provider: dbJob.provider,
      operationId: dbJob.operationId,
      progress: dbJob.progress || 0,
      resultAssetId: dbJob.resultAssetId,
      params: dbJob.params,
      error: dbJob.error,
      createdAt: dbJob.createdAt,
      updatedAt: dbJob.updatedAt,
    }));
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status === 'completed' || job.status === 'failed') {
      throw new Error('Cannot cancel completed or failed job');
    }

    if (job.operationId) {
      const adapter = this.providers[job.provider];
      if (adapter?.cancel) {
        try {
          await adapter.cancel(job.operationId);
        } catch (error) {
          console.error('Provider cancellation failed:', error);
        }
      }
    }

    await this.db
      .update(schema.jobs)
      .set({
        status: 'failed',
        error: 'Cancelled by user',
        updatedAt: Date.now(),
      })
      .where(eq(schema.jobs.id, jobId));
  }

  /**
   * Clean up old jobs
   */
  async cleanupOldJobs(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.db
      .delete(schema.jobs)
      .where(eq(schema.jobs.updatedAt, cutoffDate))
      .returning();

    return result.length;
  }
}

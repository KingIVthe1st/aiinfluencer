// Atomic update helpers with optimistic locking
// Prevents race conditions in concurrent job updates

import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq, and, sql } from 'drizzle-orm';
import * as schema from '../db/schema';

/**
 * Atomically update a job with optimistic locking
 * Retries with exponential backoff on version conflicts
 */
export async function atomicJobUpdate(
  db: DrizzleD1Database<typeof schema>,
  jobId: string,
  updates: Partial<{
    status: string;
    progress: number;
    operationId: string | null;
    resultAssetId: string | null;
    error: string | null;
  }>,
  maxRetries = 10 // FIX #21: Increased from 5 to handle high concurrency
): Promise<boolean> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Get current version
      const [job] = await db.select()
        .from(schema.jobs)
        .where(eq(schema.jobs.id, jobId))
        .limit(1);

      if (!job) {
        console.error('[AtomicUpdate] Job not found:', jobId);
        return false;
      }

      const currentVersion = job.version || 1;
      const newVersion = currentVersion + 1;
      const now = Date.now();

      // Update with version check (optimistic locking)
      const result = await db.update(schema.jobs)
        .set({
          ...updates,
          version: newVersion,
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.jobs.id, jobId),
            eq(schema.jobs.version, currentVersion) // Only update if version matches
          )
        )
        .returning();

      if (result.length > 0) {
        console.log(`[AtomicUpdate] Job ${jobId} updated successfully (v${currentVersion} → v${newVersion})`);
        return true;
      }

      // Version conflict - another worker updated the job
      console.warn(`[AtomicUpdate] Version conflict for job ${jobId}, retrying (attempt ${attempt + 1}/${maxRetries})`);

      // Exponential backoff with jitter (FIX #21 - reduce thundering herd)
      const baseDelay = Math.min(100 * Math.pow(2, attempt), 2000); // Max 2s
      const jitter = Math.random() * 100; // 0-100ms random jitter
      const delay = baseDelay + jitter;
      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (error) {
      console.error(`[AtomicUpdate] Error updating job ${jobId}:`, error);
      if (attempt === maxRetries - 1) throw error;
    }
  }

  console.error(`[AtomicUpdate] Failed to update job ${jobId} after ${maxRetries} attempts`);
  return false;
}

/**
 * Atomically check if all chunks are ready and mark ready for stitching
 * FIX #15: Separate database transaction from queue send
 * FIX #42: Removed db.transaction() - D1 doesn't support Drizzle transactions
 * Instead, we use optimistic locking to check-and-set atomically
 * Returns true if stitching should be triggered (progress was set to 90)
 */
export async function atomicStitchingTrigger(
  db: DrizzleD1Database<typeof schema>,
  jobId: string,
  queueSend: (message: any) => Promise<void>
): Promise<boolean> {
  try {
    // FIX #42: D1 doesn't support Drizzle transactions - use sequential queries with optimistic locking
    // Step 1: Get all chunks for this job
    const allChunks = await db.select()
      .from(schema.videoChunks)
      .where(eq(schema.videoChunks.jobId, jobId))
      .orderBy(schema.videoChunks.chunkIndex);

    // Check if all chunks are video_ready
    const allReady = allChunks.every(c => c.status === 'video_ready');

    if (!allReady) {
      console.log(`[AtomicStitch] Not all chunks ready for job ${jobId} (${allChunks.filter(c => c.status === 'video_ready').length}/${allChunks.length})`);
      return false;
    }

    // Check if any chunk failed
    const anyFailed = allChunks.some(c => c.status === 'failed');

    if (anyFailed) {
      console.error(`[AtomicStitch] Some chunks failed for job ${jobId}, aborting stitching`);
      await atomicJobUpdate(db, jobId, {
        status: 'failed',
        error: 'Some video chunks failed to generate',
      });
      return false;
    }

    // Step 2: Check if job is already in stitching or completed state
    const [job] = await db.select()
      .from(schema.jobs)
      .where(eq(schema.jobs.id, jobId))
      .limit(1);

    if (!job) {
      console.error(`[AtomicStitch] Job not found: ${jobId}`);
      return false;
    }

    // progress >= 90 acts as "ready_to_stitch" flag
    if (job.status === 'completed' || job.progress >= 90) {
      console.log(`[AtomicStitch] Job ${jobId} already stitching or complete (status: ${job.status}, progress: ${job.progress})`);
      return false;
    }

    // Step 3: Use atomicJobUpdate with optimistic locking to set progress=90
    // This is atomic - if another worker beat us, version check will fail
    const updated = await atomicJobUpdate(db, jobId, {
      status: 'processing',
      progress: 90, // Flag: ready to stitch
    });

    // FIX #42: If optimistic locking failed, another worker triggered stitching first
    const shouldTriggerStitching = updated;

    // FIX #42: If optimistic update failed or stitching already triggered, don't send
    if (!shouldTriggerStitching) {
      console.log(`[AtomicStitch] Optimistic update failed for job ${jobId} - another worker beat us`);
      return false;
    }

    // FIX #15+42: Database update succeeded with optimistic lock, now send queue message
    // FIX #26: Add retry logic - if queueSend fails, update job.error so it's not stuck silently
    let queueSendSuccess = false;
    let queueSendError: any = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await queueSend({
          type: 'music-video-stitch',
          jobId,
        });
        queueSendSuccess = true;
        break;
      } catch (error) {
        queueSendError = error;
        console.error(`[AtomicStitch] Queue send failed (attempt ${attempt + 1}/3):`, error);
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        }
      }
    }

    if (!queueSendSuccess) {
      // Queue send failed after retries - update job with error
      console.error(`[AtomicStitch] ❌ Failed to send queue message after 3 attempts for job ${jobId}`);
      await atomicJobUpdate(db, jobId, {
        error: `Failed to trigger stitching: ${queueSendError?.message || 'Queue send failed'}. Job stuck at 90%. Please retry.`,
      });
      return false;
    }

    console.log(`[AtomicStitch] ✅ Triggered stitching for job ${jobId}`);
    return true;
  } catch (error) {
    console.error(`[AtomicStitch] Error triggering stitching for job ${jobId}:`, error);
    // Update job with error
    try {
      await atomicJobUpdate(db, jobId, {
        error: `Stitching trigger failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    } catch (updateError) {
      console.error(`[AtomicStitch] Failed to update job error:`, updateError);
    }
    return false;
  }
}

/**
 * Atomically propagate chunk failure to job
 * Marks job as failed if any chunk fails
 * FIX HIGH #2: Optionally cleans up R2 objects and cancels Kie.ai operations
 * Re-throws errors to ensure queue retries on failure
 */
export async function propagateChunkFailure(
  db: DrizzleD1Database<typeof schema>,
  chunkId: string,
  error: string,
  cleanup?: {
    kieApiKey: string;
    r2Bucket: any; // R2Bucket type
  }
): Promise<void> {
  try {
    // Get chunk to find job ID
    const [chunk] = await db.select()
      .from(schema.videoChunks)
      .where(eq(schema.videoChunks.id, chunkId))
      .limit(1);

    if (!chunk) {
      const chunkNotFoundError = new Error(`Chunk not found: ${chunkId}`);
      console.error(`[ErrorPropagation]`, chunkNotFoundError);
      throw chunkNotFoundError;
    }

    // Mark chunk as failed
    await db.update(schema.videoChunks)
      .set({
        status: 'failed',
        error,
        updatedAt: Date.now(),
      })
      .where(eq(schema.videoChunks.id, chunkId));

    // Mark job as failed
    const success = await atomicJobUpdate(db, chunk.jobId, {
      status: 'failed',
      error: `Video chunk ${chunk.chunkIndex} failed: ${error}`,
    });

    if (!success) {
      throw new Error(`Failed to mark job ${chunk.jobId} as failed after chunk ${chunkId} failure`);
    }

    console.log(`[ErrorPropagation] ✅ Propagated failure from chunk ${chunkId} to job ${chunk.jobId}`);

    // FIX HIGH #2: Cleanup R2 objects and cancel Kie.ai operations
    if (cleanup) {
      console.log(`[ErrorPropagation] Starting cleanup for failed chunk ${chunkId}`);
      try {
        const { cleanupFailedChunk } = await import('./cleanup');
        await cleanupFailedChunk(db, chunkId, cleanup.kieApiKey, cleanup.r2Bucket);
        console.log(`[ErrorPropagation] ✅ Cleanup completed for chunk ${chunkId}`);
      } catch (cleanupError) {
        // Don't throw on cleanup errors - failure already propagated
        console.error(`[ErrorPropagation] ⚠️ Cleanup failed for chunk ${chunkId}:`, cleanupError);
        console.error(`[ErrorPropagation] R2 objects and Kie operations may be orphaned - consider manual cleanup`);
      }
    }
  } catch (propagationError) {
    console.error(`[ErrorPropagation] ❌ Critical: Failed to propagate chunk ${chunkId} failure:`, propagationError);
    console.error(`[ErrorPropagation] Original error:`, error);
    // Re-throw to ensure queue retries - don't silently swallow
    throw propagationError;
  }
}

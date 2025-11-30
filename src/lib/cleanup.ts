// AI Singer Studio - Resource Cleanup Utilities
// Handles cleanup of R2 objects and Kie.ai operations on failure

import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { R2Bucket } from '@cloudflare/workers-types';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';

/**
 * FIX HIGH #2: Cancel ongoing Kie.ai operations for a failed chunk
 * Prevents wasted API quota and costs when jobs are cancelled or fail
 */
export async function cancelKieOperations(
  chunk: {
    id: string;
    sceneOperationId: string | null;
    videoOperationId: string | null;
  },
  kieApiKey: string
): Promise<void> {
  const cancellations: Promise<void>[] = [];

  // Cancel scene generation if in progress
  if (chunk.sceneOperationId) {
    console.log(`[CLEANUP] Cancelling scene operation: ${chunk.sceneOperationId}`);
    cancellations.push(
      (async () => {
        try {
          const { KieNanoBananaProAdapter } = await import('../providers/kie-nano-banana-pro');
          const adapter = new KieNanoBananaProAdapter({ apiKey: kieApiKey });
          await adapter.cancel(chunk.sceneOperationId!);
          console.log(`[CLEANUP] ✅ Cancelled scene operation: ${chunk.sceneOperationId}`);
        } catch (error) {
          console.warn(`[CLEANUP] Scene cancellation failed (may already be done):`, error);
          // Don't throw - cancellation is best-effort
        }
      })()
    );
  }

  // Cancel video generation if in progress
  if (chunk.videoOperationId) {
    console.log(`[CLEANUP] Cancelling video operation: ${chunk.videoOperationId}`);
    cancellations.push(
      (async () => {
        try {
          const { KieWan25Adapter } = await import('../providers/kie-wan25');
          const adapter = new KieWan25Adapter({ apiKey: kieApiKey });
          await adapter.cancel(chunk.videoOperationId!);
          console.log(`[CLEANUP] ✅ Cancelled video operation: ${chunk.videoOperationId}`);
        } catch (error) {
          console.warn(`[CLEANUP] Video cancellation failed (may already be done):`, error);
          // Don't throw - cancellation is best-effort
        }
      })()
    );
  }

  // Wait for all cancellations (in parallel)
  await Promise.all(cancellations);
}

/**
 * FIX HIGH #2: Delete R2 objects for a failed chunk
 * Cleans up audio chunks, scene images, and video segments
 */
export async function cleanupChunkR2Objects(
  chunk: {
    id: string;
    jobId: string;
    audioChunkUrl: string | null;
    sceneImageUrl: string | null;
    videoSegmentUrl: string | null;
  },
  r2Bucket: R2Bucket
): Promise<void> {
  const deletions: Promise<void>[] = [];

  // Extract R2 keys from URLs (format: https://{account}.r2.cloudflarestorage.com/{bucket}/{key})
  const extractR2Key = (url: string | null): string | null => {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      // Skip empty first part and bucket name
      return pathParts.slice(2).join('/');
    } catch {
      return null;
    }
  };

  // Delete audio chunk
  if (chunk.audioChunkUrl) {
    const key = extractR2Key(chunk.audioChunkUrl);
    if (key) {
      console.log(`[CLEANUP] Deleting audio chunk: ${key}`);
      deletions.push(
        r2Bucket.delete(key).then(() => {
          console.log(`[CLEANUP] ✅ Deleted audio chunk: ${key}`);
        }).catch((error) => {
          console.warn(`[CLEANUP] Audio chunk deletion failed:`, error);
          // Don't throw - deletion is best-effort
        })
      );
    }
  }

  // Delete scene image
  if (chunk.sceneImageUrl) {
    const key = extractR2Key(chunk.sceneImageUrl);
    if (key) {
      console.log(`[CLEANUP] Deleting scene image: ${key}`);
      deletions.push(
        r2Bucket.delete(key).then(() => {
          console.log(`[CLEANUP] ✅ Deleted scene image: ${key}`);
        }).catch((error) => {
          console.warn(`[CLEANUP] Scene image deletion failed:`, error);
          // Don't throw - deletion is best-effort
        })
      );
    }
  }

  // Delete video segment (including normalized version)
  if (chunk.videoSegmentUrl) {
    const key = extractR2Key(chunk.videoSegmentUrl);
    if (key) {
      console.log(`[CLEANUP] Deleting video segment: ${key}`);
      deletions.push(
        r2Bucket.delete(key).then(() => {
          console.log(`[CLEANUP] ✅ Deleted video segment: ${key}`);
        }).catch((error) => {
          console.warn(`[CLEANUP] Video segment deletion failed:`, error);
          // Don't throw - deletion is best-effort
        })
      );
    }

    // Also try to delete normalized version if it exists
    if (key && key.includes('-normalized.mp4')) {
      // Already the normalized version
    } else if (key) {
      const normalizedKey = key.replace('.mp4', '-normalized.mp4');
      deletions.push(
        r2Bucket.delete(normalizedKey).then(() => {
          console.log(`[CLEANUP] ✅ Deleted normalized video: ${normalizedKey}`);
        }).catch(() => {
          // Silently ignore - normalized version may not exist
        })
      );
    }
  }

  // Wait for all deletions (in parallel)
  await Promise.all(deletions);
}

/**
 * FIX HIGH #2: Delete R2 objects for a failed job
 * Cleans up all chunks AND final video
 */
export async function cleanupJobR2Objects(
  db: DrizzleD1Database<typeof schema>,
  jobId: string,
  r2Bucket: R2Bucket
): Promise<void> {
  // Get all chunks for this job
  const chunks = await db.select()
    .from(schema.videoChunks)
    .where(eq(schema.videoChunks.jobId, jobId));

  console.log(`[CLEANUP] Cleaning up R2 objects for job ${jobId} (${chunks.length} chunks)`);

  // Cleanup all chunks in parallel
  await Promise.all(
    chunks.map(chunk => cleanupChunkR2Objects(chunk, r2Bucket))
  );

  // Get job to cleanup final video
  const [job] = await db.select()
    .from(schema.jobs)
    .where(eq(schema.jobs.id, jobId))
    .limit(1);

  if (job?.outputVideoUrl) {
    const extractR2Key = (url: string): string | null => {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        return pathParts.slice(2).join('/');
      } catch {
        return null;
      }
    };

    const key = extractR2Key(job.outputVideoUrl);
    if (key) {
      console.log(`[CLEANUP] Deleting final video: ${key}`);
      try {
        await r2Bucket.delete(key);
        console.log(`[CLEANUP] ✅ Deleted final video: ${key}`);
      } catch (error) {
        console.warn(`[CLEANUP] Final video deletion failed:`, error);
        // Don't throw - deletion is best-effort
      }
    }
  }

  console.log(`[CLEANUP] ✅ Completed R2 cleanup for job ${jobId}`);
}

/**
 * FIX HIGH #2: Full cleanup for a failed chunk
 * Cancels Kie.ai operations AND deletes R2 objects
 */
export async function cleanupFailedChunk(
  db: DrizzleD1Database<typeof schema>,
  chunkId: string,
  kieApiKey: string,
  r2Bucket: R2Bucket
): Promise<void> {
  console.log(`[CLEANUP] Starting cleanup for chunk: ${chunkId}`);

  // Get chunk data
  const [chunk] = await db.select()
    .from(schema.videoChunks)
    .where(eq(schema.videoChunks.id, chunkId))
    .limit(1);

  if (!chunk) {
    console.warn(`[CLEANUP] Chunk ${chunkId} not found, skipping cleanup`);
    return;
  }

  // Run cleanup operations in parallel
  await Promise.all([
    cancelKieOperations(chunk, kieApiKey),
    cleanupChunkR2Objects(chunk, r2Bucket),
  ]);

  console.log(`[CLEANUP] ✅ Completed cleanup for chunk: ${chunkId}`);
}

/**
 * FIX HIGH #2: Full cleanup for a failed/cancelled job
 * Cancels ALL Kie.ai operations AND deletes ALL R2 objects for the job
 */
export async function cleanupFailedJob(
  db: DrizzleD1Database<typeof schema>,
  jobId: string,
  kieApiKey: string,
  r2Bucket: R2Bucket
): Promise<void> {
  console.log(`[CLEANUP] Starting cleanup for job: ${jobId}`);

  // Get all chunks
  const chunks = await db.select()
    .from(schema.videoChunks)
    .where(eq(schema.videoChunks.jobId, jobId));

  // Cancel all Kie operations in parallel
  await Promise.all(
    chunks.map(chunk => cancelKieOperations(chunk, kieApiKey))
  );

  // Delete all R2 objects (including final video)
  await cleanupJobR2Objects(db, jobId, r2Bucket);

  console.log(`[CLEANUP] ✅ Completed cleanup for job: ${jobId}`);
}

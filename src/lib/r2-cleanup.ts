// R2 Cleanup Utilities
// Prevents orphaned objects when music video jobs fail

import type { R2Bucket } from '@cloudflare/workers-types';

/**
 * Clean up all R2 objects for a failed music video job
 * Deletes audio chunks and final video (if exists)
 */
export async function cleanupFailedJob(
  jobId: string,
  videoBucket: R2Bucket
): Promise<void> {
  console.log(`[R2Cleanup] Cleaning up orphaned objects for job: ${jobId}`);

  try {
    const deleted: string[] = [];

    // Delete all audio chunks for this job
    // Pattern: audio-chunks/{jobId}/chunk_*.mp3
    const audioPrefix = `audio-chunks/${jobId}/`;
    const audioList = await videoBucket.list({ prefix: audioPrefix });

    for (const object of audioList.objects) {
      await videoBucket.delete(object.key);
      deleted.push(object.key);
      console.log(`[R2Cleanup] Deleted audio chunk: ${object.key}`);
    }

    // Delete final video if it exists
    // Pattern: music-videos/{jobId}-final.mp4
    const finalVideoKey = `music-videos/${jobId}-final.mp4`;
    const finalVideo = await videoBucket.head(finalVideoKey);

    if (finalVideo) {
      await videoBucket.delete(finalVideoKey);
      deleted.push(finalVideoKey);
      console.log(`[R2Cleanup] Deleted final video: ${finalVideoKey}`);
    }

    console.log(`[R2Cleanup] ✅ Cleaned up ${deleted.length} objects for job ${jobId}`);
  } catch (error) {
    console.error(`[R2Cleanup] Failed to clean up job ${jobId}:`, error);
    // Don't throw - cleanup is best-effort, shouldn't block error handling
  }
}

/**
 * Clean up partial uploads from a failed audio chunking operation
 * Called immediately on audio chunking failure
 */
export async function cleanupFailedAudioChunks(
  jobId: string,
  videoBucket: R2Bucket
): Promise<void> {
  console.log(`[R2Cleanup] Cleaning up failed audio chunks for job: ${jobId}`);

  try {
    const prefix = `audio-chunks/${jobId}/`;
    const list = await videoBucket.list({ prefix });

    let deleted = 0;
    for (const object of list.objects) {
      await videoBucket.delete(object.key);
      deleted++;
    }

    console.log(`[R2Cleanup] ✅ Deleted ${deleted} partial audio chunks for job ${jobId}`);
  } catch (error) {
    console.error(`[R2Cleanup] Failed to clean up audio chunks for job ${jobId}:`, error);
  }
}

/**
 * Periodic cleanup of orphaned objects
 * Should be called via cron trigger to clean up old objects from jobs that failed before cleanup was added
 */
export async function cleanupOrphanedObjects(
  videoBucket: R2Bucket,
  olderThanDays = 7
): Promise<{ deleted: number; errors: number }> {
  console.log(`[R2Cleanup] Scanning for orphaned objects older than ${olderThanDays} days`);

  const cutoffDate = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  let deleted = 0;
  let errors = 0;

  try {
    // List all audio chunks
    const audioList = await videoBucket.list({ prefix: 'audio-chunks/' });

    for (const object of audioList.objects) {
      const uploadedAt = object.uploaded?.getTime() || 0;

      if (uploadedAt < cutoffDate) {
        try {
          await videoBucket.delete(object.key);
          deleted++;
          console.log(`[R2Cleanup] Deleted orphaned object: ${object.key}`);
        } catch (error) {
          console.error(`[R2Cleanup] Failed to delete ${object.key}:`, error);
          errors++;
        }
      }
    }

    console.log(`[R2Cleanup] ✅ Orphan cleanup complete: ${deleted} deleted, ${errors} errors`);
  } catch (error) {
    console.error(`[R2Cleanup] Orphan cleanup failed:`, error);
    errors++;
  }

  return { deleted, errors };
}

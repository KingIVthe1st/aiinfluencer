// Video Stitching Utility for Music Video Generation
// Concatenates video segments into final music video

import type { R2Credentials } from './r2-presigned-url';

export interface VideoSegment {
  index: number;
  url: string; // R2 URL to video segment
  durationMs: number;
  audioChunkUrl?: string; // Corresponding audio chunk
}

export interface StitchingResult {
  finalVideoUrl: string; // R2 URL to stitched video
  totalDurationMs: number;
  segmentCount: number;
  metadata: {
    resolution: string;
    aspectRatio: string;
    codec: string;
    fileSize?: number;
  };
}

/**
 * Video Stitching Service Client
 * Uses Cloudflare Browser Rendering API with FFmpeg for video concatenation
 */
export class VideoStitcher {
  private browser?: Fetcher;

  constructor(browser?: Fetcher) {
    this.browser = browser;
  }

  /**
   * Concatenate video segments into final music video
   * Uses FFmpeg via Browser Rendering API for professional stitching
   *
   * FIX #24: Direct browser → R2 upload to prevent worker OOM (when credentials available)
   * FIX #44: Falls back to R2 binding upload when credentials not configured
   */
  async stitchSegments(
    segments: VideoSegment[],
    r2Bucket: R2Bucket,
    outputKey: string,
    r2Credentials?: R2Credentials | null,
    bucketName?: string
  ): Promise<StitchingResult> {
    console.log('[VideoStitcher] Stitching segments:', {
      count: segments.length,
      totalDuration: segments.reduce((sum, s) => sum + s.durationMs, 0),
    });

    // Sort segments by index to ensure correct order
    const sortedSegments = [...segments].sort((a, b) => a.index - b.index);

    // Require browser binding for stitching (FIX #19 - remove silent quality degradation)
    if (!this.browser) {
      throw new Error(
        'Browser Rendering API not available. Video stitching requires FFmpeg via browser binding. ' +
        'Enable in Cloudflare Dashboard: Workers > Settings > Browser Rendering API'
      );
    }

    try {
      // Import FFmpeg helper
      const { BrowserFFmpeg } = await import('./ffmpeg-browser');
      const ffmpeg = new BrowserFFmpeg(this.browser);

      // Stitch videos using FFmpeg (FIX #24: direct R2 upload)
      const result = await ffmpeg.stitchVideos(
        sortedSegments.map(s => ({ index: s.index, url: s.url })),
        r2Bucket,
        outputKey,
        r2Credentials,
        bucketName
      );

      console.log('[VideoStitcher] Stitching complete:', result.url);

      return {
        finalVideoUrl: result.url,
        totalDurationMs: result.durationMs,
        segmentCount: segments.length,
        metadata: {
          resolution: '1080p',
          aspectRatio: '16:9',
          codec: 'h264',
          fileSize: result.fileSize,
        },
      };
    } catch (error) {
      console.error('[VideoStitcher] Stitching failed:', error);
      throw new Error(`Failed to stitch videos: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate that all segments are ready for stitching
   */
  validateSegments(segments: VideoSegment[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (segments.length === 0) {
      errors.push('No segments provided');
    }

    // Check for missing segments (gaps in indices)
    const indices = segments.map(s => s.index).sort((a, b) => a - b);
    for (let i = 0; i < indices.length; i++) {
      if (indices[i] !== i) {
        errors.push(`Missing segment at index ${i}`);
      }
    }

    // Check for duplicate indices
    const uniqueIndices = new Set(indices);
    if (uniqueIndices.size !== indices.length) {
      errors.push('Duplicate segment indices found');
    }

    // Check for missing URLs
    const missingUrls = segments.filter(s => !s.url);
    if (missingUrls.length > 0) {
      errors.push(`${missingUrls.length} segments missing URLs`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate expected duration of final video
   */
  calculateExpectedDuration(segments: VideoSegment[]): number {
    return segments.reduce((sum, segment) => sum + segment.durationMs, 0);
  }
}

/**
 * Create a simple concat file for FFmpeg (for reference/documentation)
 * This is the format FFmpeg uses for concatenation
 */
export function generateFFmpegConcatFile(segments: VideoSegment[]): string {
  const sortedSegments = [...segments].sort((a, b) => a.index - b.index);

  const lines = sortedSegments.map(segment => `file '${segment.url}'`);

  return lines.join('\n');
}

/**
 * Estimate output file size based on segment sizes
 */
export function estimateOutputSize(segments: VideoSegment[], avgBitrateKbps: number = 5000): number {
  const totalDurationSeconds = segments.reduce((sum, s) => sum + s.durationMs, 0) / 1000;
  const estimatedBytes = (avgBitrateKbps * 1000 * totalDurationSeconds) / 8;
  return Math.round(estimatedBytes);
}

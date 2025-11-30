// Audio Chunking Utility for Music Video Generation
// Splits audio files into chunks for video generation

export interface AudioChunk {
  index: number;
  startTimeMs: number;
  endTimeMs: number;
  durationMs: number;
  url?: string; // R2 URL after upload
  blob?: ArrayBuffer; // Raw audio data
}

export interface AudioChunkingPlan {
  totalDurationMs: number;
  chunkDurationMs: number;
  chunks: AudioChunk[];
}

export interface AudioMetadata {
  durationMs: number;
  format: string;
  sampleRate?: number;
  channels?: number;
  bitrate?: number;
}

/**
 * Create a chunking plan for an audio file
 * This calculates chunk boundaries without processing the audio
 */
export function createChunkingPlan(
  totalDurationMs: number,
  chunkDurationMs: number
): AudioChunkingPlan {
  const chunks: AudioChunk[] = [];
  let currentTimeMs = 0;
  let index = 0;

  while (currentTimeMs < totalDurationMs) {
    const endTimeMs = Math.min(currentTimeMs + chunkDurationMs, totalDurationMs);
    const actualDurationMs = endTimeMs - currentTimeMs;

    chunks.push({
      index,
      startTimeMs: currentTimeMs,
      endTimeMs,
      durationMs: actualDurationMs,
    });

    currentTimeMs = endTimeMs;
    index++;
  }

  console.log(`[AudioChunking] Created plan: ${chunks.length} chunks from ${totalDurationMs}ms audio`);

  return {
    totalDurationMs,
    chunkDurationMs,
    chunks,
  };
}

/**
 * Fetch audio file and extract metadata
 * Uses HEAD request to get content type and length
 */
export async function getAudioMetadata(audioUrl: string): Promise<AudioMetadata> {
  console.log('[AudioChunking] Fetching metadata from:', audioUrl);

  const response = await fetch(audioUrl, { method: 'HEAD' });

  if (!response.ok) {
    throw new Error(`Failed to fetch audio metadata: ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || 'audio/mpeg';
  const contentLength = parseInt(response.headers.get('content-length') || '0');

  // For now, we can't determine duration without downloading
  // In production, this should call an external service or use audio analysis API
  console.log('[AudioChunking] Metadata:', { contentType, contentLength });

  return {
    durationMs: 0, // Will be determined by external service
    format: contentType.split('/')[1] || 'mp3',
  };
}

/**
 * Audio Processing Service Client
 * Uses Cloudflare Browser Rendering API with FFmpeg for audio processing
 */
export class AudioProcessor {
  private browser?: Fetcher;

  constructor(browser?: Fetcher) {
    this.browser = browser;
  }

  /**
   * Get audio duration estimation
   * MVP: Use file size estimation since FFmpeg.wasm is blocked by CORS
   */
  async getDuration(audioUrl: string): Promise<number> {
    console.log('[AudioProcessor] Getting duration for:', audioUrl);

    // MVP APPROACH: Estimate from file size
    // Assuming typical MP3 bitrate of 128kbps
    const response = await fetch(audioUrl, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');

    if (contentLength) {
      const fileSizeBytes = parseInt(contentLength);
      const fileSizeKB = fileSizeBytes / 1024;

      // MP3 at 128kbps = 16KB per second
      // Adjust estimate based on typical bitrate range (96-256kbps)
      const estimatedSeconds = (fileSizeKB / 16) * 1.1; // 10% buffer for VBR
      const estimatedDurationMs = estimatedSeconds * 1000;

      console.log('[AudioProcessor] Estimated duration from file size:', {
        fileSize: `${(fileSizeBytes / 1024).toFixed(2)}KB`,
        estimated: `${estimatedSeconds.toFixed(1)}s`,
      });

      return Math.round(estimatedDurationMs);
    }

    // Fallback: Use default duration
    console.warn('[AudioProcessor] Could not determine file size, using default 30s');
    return 30000;
  }

  /**
   * Chunk audio file using FFmpeg via Browser Rendering API
   * Returns URLs to R2-stored chunks
   */
  async chunkAudio(
    audioUrl: string,
    plan: AudioChunkingPlan,
    r2Bucket: R2Bucket,
    jobId?: string // Optional jobId for organized R2 storage
  ): Promise<AudioChunk[]> {
    console.log('[AudioProcessor] Chunking audio:', {
      url: audioUrl,
      numChunks: plan.chunks.length,
      chunkDurationMs: plan.chunkDurationMs,
      jobId,
    });

    // Check if browser binding is available
    if (!this.browser) {
      console.error('[AudioProcessor] No browser binding available - cannot chunk audio');
      console.warn('[AudioProcessor] Enable Browser Rendering API in Cloudflare dashboard');
      throw new Error('Browser Rendering API not available. Enable in Cloudflare dashboard.');
    }

    try {
      // Import FFmpeg helper (Puppeteer-based)
      console.log('[AudioProcessor] Importing Puppeteer FFmpeg implementation...');
      const { BrowserFFmpeg } = await import('./ffmpeg-browser-puppeteer');
      console.log('[AudioProcessor] ✅ Import successful');

      console.log('[AudioProcessor] Creating BrowserFFmpeg instance with browser:', !!this.browser);
      const ffmpeg = new BrowserFFmpeg(this.browser);
      console.log('[AudioProcessor] ✅ Instance created');

      // Chunk audio using FFmpeg
      console.log('[AudioProcessor] Starting chunkAudio call...');
      const chunks = await ffmpeg.chunkAudio(
        audioUrl,
        plan.chunkDurationMs / 1000, // Convert to seconds
        plan.totalDurationMs,
        r2Bucket,
        jobId // Pass jobId for organized R2 keys
      );
      console.log('[AudioProcessor] ✅ chunkAudio completed, chunks:', chunks.length);

      console.log('[AudioProcessor] Successfully chunked audio:', chunks.length, 'chunks');

      // Map to AudioChunk format
      return chunks.map(chunk => ({
        index: chunk.index,
        url: chunk.url,
        startTimeMs: chunk.startTimeMs,
        endTimeMs: chunk.endTimeMs,
        durationMs: chunk.durationMs,
      }));
    } catch (error) {
      console.error('[AudioProcessor] Audio chunking failed:', error);
      throw new Error(`Failed to chunk audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Simple in-memory audio chunking for development/testing
 * Downloads full audio and slices by byte ranges
 * NOT suitable for production - use AudioProcessor with FFmpeg service
 */
export async function simpleAudioChunk(
  audioUrl: string,
  chunkDurationMs: number,
  estimatedTotalDurationMs: number
): Promise<AudioChunk[]> {
  console.warn('[AudioChunking] Using simple in-memory chunking - NOT for production!');

  const plan = createChunkingPlan(estimatedTotalDurationMs, chunkDurationMs);

  // Download full audio
  const response = await fetch(audioUrl);
  const audioData = await response.arrayBuffer();

  // Slice by byte ranges (inaccurate but works for testing)
  const chunks: AudioChunk[] = plan.chunks.map((chunkPlan) => {
    const bytesPerMs = audioData.byteLength / estimatedTotalDurationMs;
    const startByte = Math.floor(chunkPlan.startTimeMs * bytesPerMs);
    const endByte = Math.floor(chunkPlan.endTimeMs * bytesPerMs);
    const blob = audioData.slice(startByte, endByte);

    return {
      ...chunkPlan,
      blob,
    };
  });

  return chunks;
}

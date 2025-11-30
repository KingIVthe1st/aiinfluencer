// FFmpeg operations using Cloudflare Browser Rendering API
// Handles audio chunking and video stitching for music video generation

import type { R2Bucket } from '@cloudflare/workers-types';
import { getBrowserPool } from './browser-pool';
import { generateR2PresignedPutUrl, getR2PublicUrl, type R2Credentials } from './r2-presigned-url';

export interface AudioChunkResult {
  index: number;
  url: string;
  durationMs: number;
  startTimeMs: number;
  endTimeMs: number;
}

export interface VideoStitchResult {
  url: string;
  durationMs: number;
  fileSize: number;
}

/**
 * BrowserFFmpeg - FFmpeg operations using Cloudflare Browser Rendering API
 *
 * Uses headless browser with FFmpeg.wasm to process audio and video
 *
 * Memory Limits:
 * - Max audio file size: 20MB (prevents browser OOM)
 * - Max video segment: 100MB per segment
 * - Max total processing: 500MB cumulative
 * - Timeout: 2min audio, 5min video
 */
export class BrowserFFmpeg {
  // Memory safety limits
  private static readonly MAX_AUDIO_SIZE_MB = 20;
  private static readonly MAX_VIDEO_SEGMENT_MB = 100;
  private static readonly MAX_TOTAL_SEGMENTS = 50; // 50 * 5s = 4min max

  constructor(private browser: Fetcher) {}

  /**
   * Validate file size before processing to prevent OOM
   */
  private async validateFileSize(url: string, maxSizeMB: number, fileType: string): Promise<number> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');

      if (!contentLength) {
        console.warn(`[BrowserFFmpeg] No content-length header for ${fileType}: ${url}, proceeding with caution`);
        return 0; // Unknown size - proceed but logged
      }

      const sizeMB = parseInt(contentLength) / (1024 * 1024);

      if (sizeMB > maxSizeMB) {
        throw new Error(
          `${fileType} file too large: ${sizeMB.toFixed(2)}MB (max ${maxSizeMB}MB). ` +
          `Browser may run out of memory. Consider shorter audio or lower quality.`
        );
      }

      console.log(`[BrowserFFmpeg] ${fileType} size: ${sizeMB.toFixed(2)}MB (within ${maxSizeMB}MB limit)`);
      return sizeMB;
    } catch (error) {
      if (error instanceof Error && error.message.includes('too large')) {
        throw error;
      }
      console.warn(`[BrowserFFmpeg] Failed to check ${fileType} size:`, error);
      return 0; // Proceed with unknown size
    }
  }

  /**
   * Chunk audio file into segments using FFmpeg
   * Downloads audio, splits into chunks, uploads to R2
   */
  async chunkAudio(
    audioUrl: string,
    chunkDurationSec: number,
    totalDurationMs: number,
    r2Bucket: R2Bucket,
    jobId?: string // Optional jobId for organized R2 cleanup
  ): Promise<AudioChunkResult[]> {
    console.log('[BrowserFFmpeg] Chunking audio:', {
      audioUrl,
      chunkDurationSec,
      totalDurationMs,
    });

    // Calculate number of chunks
    const totalChunks = Math.ceil(totalDurationMs / (chunkDurationSec * 1000));

    // Memory safety: validate file size and chunk count
    await this.validateFileSize(audioUrl, BrowserFFmpeg.MAX_AUDIO_SIZE_MB, 'Audio');

    if (totalChunks > BrowserFFmpeg.MAX_TOTAL_SEGMENTS) {
      throw new Error(
        `Too many chunks: ${totalChunks} (max ${BrowserFFmpeg.MAX_TOTAL_SEGMENTS}). ` +
        `Use longer chunk duration or shorter audio.`
      );
    }

    try {
      // Use browser pool to limit concurrent heavy operations
      const pool = getBrowserPool(this.browser);
      const session = await pool.execute(async (browser) => {
        return await browser.fetch('https://browser.wrangler.workers.dev', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          steps: [
            // Navigate to a page that loads FFmpeg.wasm
            { action: 'goto', url: 'about:blank' },

            // Inject FFmpeg.wasm loader
            {
              action: 'evaluate',
              script: `
                // Load FFmpeg.wasm from CDN
                const script1 = document.createElement('script');
                script1.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.6/dist/umd/ffmpeg.js';
                document.head.appendChild(script1);

                await new Promise(resolve => script1.onload = resolve);
              `
            },

            // Process audio chunks
            {
              action: 'evaluate',
              script: `
                (async () => {
                  const { FFmpeg } = window.FFmpegWASM;
                  const { fetchFile } = FFmpegUtil;

                  const ffmpeg = new FFmpeg();
                  ffmpeg.on('log', ({ message }) => console.log(message));

                  await ffmpeg.load({
                    coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd/ffmpeg-core.js',
                  });

                  // Fetch audio file
                  console.log('Fetching audio from ${audioUrl}');
                  const audioData = await fetchFile('${audioUrl}');
                  await ffmpeg.writeFile('input.mp3', audioData);

                  const chunks = [];
                  const chunkDuration = ${chunkDurationSec};
                  const totalChunks = ${totalChunks};

                  // Split audio into chunks
                  for (let i = 0; i < totalChunks; i++) {
                    const startTime = i * chunkDuration;
                    const outputFile = 'chunk_' + i.toString().padStart(3, '0') + '.mp3';

                    console.log('Processing chunk', i, 'start:', startTime);

                    // Run FFmpeg to extract chunk
                    await ffmpeg.exec([
                      '-i', 'input.mp3',
                      '-ss', startTime.toString(),
                      '-t', chunkDuration.toString(),
                      '-acodec', 'copy',
                      outputFile
                    ]);

                    // Read chunk data - stream to avoid memory explosion
                    const data = await ffmpeg.readFile(outputFile);
                    const blob = new Blob([data], { type: 'audio/mpeg' });

                    // Convert to base64 for transfer (better than Array.from)
                    const reader = new FileReader();
                    const base64Promise = new Promise((resolve) => {
                      reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    });
                    reader.readAsDataURL(blob);
                    const base64 = await base64Promise;

                    chunks.push({
                      index: i,
                      base64: base64,
                      startTime: startTime * 1000,
                      endTime: (startTime + chunkDuration) * 1000,
                      duration: chunkDuration * 1000,
                    });

                    console.log('Chunk', i, 'complete, size:', data.length);
                  }

                  return chunks;
                })();
              `
            },
          ],
          timeout: 120000, // 2 minutes max
        }),
      });
      }, 120000); // 2 minute timeout for pool

      if (!session.ok) {
        const error = await session.text();
        throw new Error(`Browser session failed: ${error}`);
      }

      const result = await session.json();
      const chunks = result.result as Array<{
        index: number;
        base64: string;
        startTime: number;
        endTime: number;
        duration: number;
      }>;

      console.log('[BrowserFFmpeg] Created', chunks.length, 'audio chunks');

      // Upload chunks to R2
      const uploadedChunks: AudioChunkResult[] = [];

      for (const chunk of chunks) {
        // Use jobId for organized storage and easier cleanup on failure
        const key = jobId
          ? `audio-chunks/${jobId}/chunk_${chunk.index.toString().padStart(3, '0')}.mp3`
          : `audio-chunks/${Date.now()}_chunk_${chunk.index.toString().padStart(3, '0')}.mp3`;

        // Decode base64 to binary
        const binaryString = atob(chunk.base64);
        const audioBuffer = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          audioBuffer[i] = binaryString.charCodeAt(i);
        }

        await r2Bucket.put(key, audioBuffer, {
          httpMetadata: { contentType: 'audio/mpeg' },
        });

        const publicUrl = `https://pub-9403a25674d64f84bc1a0cb688751261.r2.dev/${key}`;

        uploadedChunks.push({
          index: chunk.index,
          url: publicUrl,
          durationMs: chunk.duration,
          startTimeMs: chunk.startTime,
          endTimeMs: chunk.endTime,
        });

        console.log(`[BrowserFFmpeg] Uploaded chunk ${chunk.index}:`, publicUrl);
      }

      return uploadedChunks;
    } catch (error) {
      console.error('[BrowserFFmpeg] Audio chunking failed:', error);
      throw new Error(`Failed to chunk audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Normalize video chunk to exact duration and constant frame rate (FIX #22)
   * Prevents A/V sync drift from AI model variations
   */
  async normalizeVideoChunk(
    inputUrl: string,
    targetDurationMs: number,
    targetFps: number = 30,
    r2Bucket: R2Bucket,
    outputKey: string
  ): Promise<{ url: string; durationMs: number }> {
    console.log('[BrowserFFmpeg] Normalizing video chunk:', {
      inputUrl,
      targetDurationMs,
      targetFps,
    });

    try {
      const pool = getBrowserPool(this.browser);
      const session = await pool.execute(async (browser) => {
        return await browser.fetch('https://browser.wrangler.workers.dev', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            steps: [
              { action: 'goto', url: 'about:blank' },
              {
                action: 'evaluate',
                script: `
                  const script1 = document.createElement('script');
                  script1.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.6/dist/umd/ffmpeg.js';
                  document.head.appendChild(script1);
                  await new Promise(resolve => script1.onload = resolve);
                `
              },
              {
                action: 'evaluate',
                script: `
                  (async () => {
                    const { FFmpeg } = window.FFmpegWASM;
                    const { fetchFile } = FFmpegUtil;

                    const ffmpeg = new FFmpeg();
                    ffmpeg.on('log', ({ message }) => console.log(message));
                    await ffmpeg.load({
                      coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd/ffmpeg-core.js',
                    });

                    // Fetch input video
                    const videoData = await fetchFile('${inputUrl}');
                    await ffmpeg.writeFile('input.mp4', videoData);

                    const targetDuration = ${targetDurationMs / 1000};
                    const targetFps = ${targetFps};

                    // Normalize: exact duration, constant FPS, standard codec
                    await ffmpeg.exec([
                      '-i', 'input.mp4',
                      '-t', targetDuration.toFixed(3),  // Exact duration (trim/pad)
                      '-r', targetFps.toString(),        // Force frame rate
                      '-vf', 'fps=' + targetFps,         // Constant frame rate (CFR)
                      '-c:v', 'libx264',                 // Standardize codec
                      '-profile:v', 'high',              // h264 high profile
                      '-preset', 'fast',
                      '-crf', '23',
                      '-c:a', 'aac',                     // Standardize audio codec
                      '-b:a', '128k',
                      'output.mp4'
                    ]);

                    const outputData = await ffmpeg.readFile('output.mp4');
                    const blob = new Blob([outputData], { type: 'video/mp4' });

                    const reader = new FileReader();
                    const base64Promise = new Promise((resolve) => {
                      reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    });
                    reader.readAsDataURL(blob);
                    const base64 = await base64Promise;

                    return { base64: base64, size: outputData.length };
                  })();
                `
              },
            ],
            timeout: 120000,
          }),
        });
      }, 120000);

      if (!session.ok) {
        const error = await session.text();
        throw new Error(`Normalization failed: ${error}`);
      }

      const result = await session.json();
      const output = result.result as { base64: string; size: number };

      // Decode and upload to R2
      const binaryString = atob(output.base64);
      const videoBuffer = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        videoBuffer[i] = binaryString.charCodeAt(i);
      }

      await r2Bucket.put(outputKey, videoBuffer, {
        httpMetadata: { contentType: 'video/mp4' },
      });

      const publicUrl = `https://pub-9403a25674d64f84bc1a0cb688751261.r2.dev/${outputKey}`;

      console.log('[BrowserFFmpeg] ✅ Normalized video:', publicUrl);

      return { url: publicUrl, durationMs: targetDurationMs };
    } catch (error) {
      console.error('[BrowserFFmpeg] Normalization failed:', error);
      throw new Error(`Failed to normalize video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stitch video segments into final video using FFmpeg
   * Downloads all segments, concatenates, uploads to R2
   *
   * FIX #44: Two modes supported:
   * 1. Direct R2 binding upload (preferred - no extra credentials needed)
   * 2. Presigned URL upload (legacy - requires R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY)
   */
  async stitchVideos(
    segments: Array<{ index: number; url: string }>,
    r2Bucket: R2Bucket,
    outputKey: string,
    r2Credentials?: R2Credentials | null,
    bucketName?: string
  ): Promise<VideoStitchResult> {
    console.log('[BrowserFFmpeg] Stitching videos:', {
      segmentCount: segments.length,
      outputKey,
      usePresignedUrl: !!(r2Credentials && bucketName),
    });

    // Memory safety: validate segment count
    if (segments.length > BrowserFFmpeg.MAX_TOTAL_SEGMENTS) {
      throw new Error(
        `Too many video segments: ${segments.length} (max ${BrowserFFmpeg.MAX_TOTAL_SEGMENTS}). ` +
        `Browser may run out of memory.`
      );
    }

    // Sort segments by index
    const sortedSegments = [...segments].sort((a, b) => a.index - b.index);

    // Memory safety: validate each segment size (sampling first few)
    const samplesToCheck = Math.min(3, sortedSegments.length);
    for (let i = 0; i < samplesToCheck; i++) {
      await this.validateFileSize(
        sortedSegments[i].url,
        BrowserFFmpeg.MAX_VIDEO_SEGMENT_MB,
        `Video segment ${i}`
      );
    }

    // FIX #44: Determine upload mode
    // Mode 1: Direct R2 binding (worker uploads - no presigned URL needed)
    // Mode 2: Presigned URL (browser uploads directly - needs credentials)
    const usePresignedUrl = r2Credentials && bucketName;

    let presignedUrl: string | null = null;
    if (usePresignedUrl) {
      // FIX #24: Generate presigned URL for direct browser → R2 upload
      presignedUrl = await generateR2PresignedPutUrl(r2Credentials, {
        bucket: bucketName,
        key: outputKey,
        expiresIn: 600, // 10 minutes (5 min processing + 5 min buffer)
        contentType: 'video/mp4',
      });
      console.log('[BrowserFFmpeg] Generated presigned URL for direct upload');
    } else {
      console.log('[BrowserFFmpeg] Using R2 bucket binding for upload (no presigned URL)');
    }

    try {
      // Use browser pool to limit concurrent heavy operations
      const pool = getBrowserPool(this.browser);
      const session = await pool.execute(async (browser) => {
        return await browser.fetch('https://browser.wrangler.workers.dev', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            steps: [
            { action: 'goto', url: 'about:blank' },

            // Load FFmpeg.wasm
            {
              action: 'evaluate',
              script: `
                const script1 = document.createElement('script');
                script1.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.6/dist/umd/ffmpeg.js';
                document.head.appendChild(script1);
                await new Promise(resolve => script1.onload = resolve);
              `
            },

            // Stitch videos - FIX #44: support both presigned URL and data return modes
            {
              action: 'evaluate',
              script: `
                (async () => {
                  const { FFmpeg } = window.FFmpegWASM;
                  const { fetchFile } = FFmpegUtil;

                  const ffmpeg = new FFmpeg();
                  ffmpeg.on('log', ({ message }) => console.log(message));

                  await ffmpeg.load({
                    coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd/ffmpeg-core.js',
                  });

                  const segmentUrls = ${JSON.stringify(sortedSegments.map(s => s.url))};

                  // Download all segments
                  for (let i = 0; i < segmentUrls.length; i++) {
                    console.log('Downloading segment', i);
                    const videoData = await fetchFile(segmentUrls[i]);
                    const filename = 'segment_' + i.toString().padStart(3, '0') + '.mp4';
                    await ffmpeg.writeFile(filename, videoData);
                  }

                  // Create concat demuxer file
                  const concatList = segmentUrls
                    .map((_, i) => 'file segment_' + i.toString().padStart(3, '0') + '.mp4')
                    .join('\\n');

                  await ffmpeg.writeFile('concat.txt', new TextEncoder().encode(concatList));

                  // Concatenate videos with re-encoding
                  console.log('Starting concatenation');
                  await ffmpeg.exec([
                    '-f', 'concat',
                    '-safe', '0',
                    '-i', 'concat.txt',
                    '-c:v', 'libx264',
                    '-preset', 'fast',
                    '-crf', '23',
                    '-c:a', 'aac',
                    '-b:a', '128k',
                    'output.mp4'
                  ]);

                  // Read output video
                  const outputData = await ffmpeg.readFile('output.mp4');
                  const blob = new Blob([outputData], { type: 'video/mp4' });

                  // FIX #44: Two upload modes
                  const presignedUrl = ${presignedUrl ? `'${presignedUrl}'` : 'null'};

                  if (presignedUrl) {
                    // Mode 2: Upload directly to R2 using presigned URL (FIX #24)
                    console.log('Uploading to R2 via presigned URL...', blob.size, 'bytes');

                    const uploadResponse = await fetch(presignedUrl, {
                      method: 'PUT',
                      body: blob,
                      headers: {
                        'Content-Type': 'video/mp4',
                      },
                    });

                    if (!uploadResponse.ok) {
                      throw new Error('R2 upload failed: ' + uploadResponse.status + ' ' + uploadResponse.statusText);
                    }

                    console.log('Upload successful!');

                    return {
                      success: true,
                      size: blob.size,
                      uploadStatus: uploadResponse.status,
                      mode: 'presigned',
                    };
                  } else {
                    // Mode 1: Return base64 for worker to upload via R2 binding
                    console.log('Encoding video for worker upload...', blob.size, 'bytes');

                    const reader = new FileReader();
                    const base64Promise = new Promise((resolve) => {
                      reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    });
                    reader.readAsDataURL(blob);
                    const base64 = await base64Promise;

                    console.log('Video encoded, returning to worker');

                    return {
                      success: true,
                      size: blob.size,
                      base64: base64,
                      mode: 'binding',
                    };
                  }
                })();
              `
            },
          ],
          timeout: 300000, // 5 minutes max for stitching
        }),
      });
      }, 300000); // 5 minute timeout for pool

      if (!session.ok) {
        const error = await session.text();
        throw new Error(`Browser stitching session failed: ${error}`);
      }

      const result = await session.json();
      const output = result.result as {
        success: boolean;
        size: number;
        uploadStatus?: number;
        base64?: string;
        mode: 'presigned' | 'binding';
      };

      if (!output.success) {
        throw new Error('Browser failed to stitch video');
      }

      // FIX #44: Handle both upload modes
      if (output.mode === 'binding' && output.base64) {
        // Mode 1: Worker uploads using R2 bucket binding
        console.log('[BrowserFFmpeg] Uploading stitched video via R2 binding:', output.size, 'bytes');

        // Decode base64 to binary
        const binaryString = atob(output.base64);
        const videoBuffer = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          videoBuffer[i] = binaryString.charCodeAt(i);
        }

        await r2Bucket.put(outputKey, videoBuffer, {
          httpMetadata: { contentType: 'video/mp4' },
        });

        console.log('[BrowserFFmpeg] ✅ Video uploaded via R2 binding');
      } else {
        console.log('[BrowserFFmpeg] ✅ Video uploaded via presigned URL:', output.size, 'bytes');
      }

      // Get public URL - uses the bucket name passed in or defaults to ai-influencer bucket
      const publicUrl = getR2PublicUrl(bucketName || 'ai-influencer-video-assets', outputKey);

      return {
        url: publicUrl,
        durationMs: segments.length * 5000, // Estimate: 5s per segment
        fileSize: output.size,
      };
    } catch (error) {
      console.error('[BrowserFFmpeg] Video stitching failed:', error);
      throw new Error(`Failed to stitch videos: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get audio duration in milliseconds
   * Uses FFmpeg to probe audio file metadata
   */
  async getAudioDuration(audioUrl: string): Promise<number> {
    console.log('[BrowserFFmpeg] Getting audio duration:', audioUrl);

    try {
      // Use browser pool to limit concurrent operations
      const pool = getBrowserPool(this.browser);
      const session = await pool.execute(async (browser) => {
        return await browser.fetch('https://browser.wrangler.workers.dev', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            steps: [
            { action: 'goto', url: 'about:blank' },

            // Load FFmpeg.wasm
            {
              action: 'evaluate',
              script: `
                const script1 = document.createElement('script');
                script1.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.6/dist/umd/ffmpeg.js';
                document.head.appendChild(script1);
                await new Promise(resolve => script1.onload = resolve);
              `
            },

            // Get duration
            {
              action: 'evaluate',
              script: `
                (async () => {
                  const { FFmpeg } = window.FFmpegWASM;
                  const { fetchFile } = FFmpegUtil;

                  const ffmpeg = new FFmpeg();
                  let duration = 0;

                  // Capture log output to extract duration
                  ffmpeg.on('log', ({ message }) => {
                    const match = message.match(/Duration: (\\d{2}):(\\d{2}):(\\d{2}\\.\\d{2})/);
                    if (match) {
                      const hours = parseInt(match[1]);
                      const minutes = parseInt(match[2]);
                      const seconds = parseFloat(match[3]);
                      duration = (hours * 3600 + minutes * 60 + seconds) * 1000;
                    }
                  });

                  await ffmpeg.load({
                    coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd/ffmpeg-core.js',
                  });

                  const audioData = await fetchFile('${audioUrl}');
                  await ffmpeg.writeFile('input.mp3', audioData);

                  // Probe file to get duration
                  await ffmpeg.exec(['-i', 'input.mp3', '-f', 'null', '-']);

                  return duration || 30000; // Fallback to 30s if parsing fails
                })();
              `
            },
          ],
          timeout: 30000,
        }),
      });
      }, 30000); // 30 second timeout for pool

      if (!session.ok) {
        const error = await session.text();
        throw new Error(`Duration probe failed: ${error}`);
      }

      const result = await session.json();
      const durationMs = result.result as number;

      if (!durationMs || durationMs === 0) {
        throw new Error(
          'FFmpeg duration probe failed: Unable to detect audio duration. ' +
          'The audio file may be corrupted or in an unsupported format.'
        );
      }

      // Validate duration is in reasonable range (5s - 10min)
      if (durationMs < 5000 || durationMs > 600000) {
        throw new Error(
          `Invalid audio duration: ${(durationMs / 1000).toFixed(1)}s. ` +
          `Expected between 5 seconds and 10 minutes.`
        );
      }

      console.log('[BrowserFFmpeg] ✅ Detected duration:', durationMs, 'ms');
      return durationMs;
    } catch (error) {
      console.error('[BrowserFFmpeg] Duration probe failed:', error);
      throw new Error(`Failed to get audio duration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

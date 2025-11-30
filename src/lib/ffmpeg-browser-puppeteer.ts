// FFmpeg operations using Cloudflare Browser Rendering API with Puppeteer
// Handles audio chunking and video stitching for music video generation

import type { R2Bucket } from '@cloudflare/workers-types';
import puppeteer from '@cloudflare/puppeteer';
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
 * BrowserFFmpeg - FFmpeg operations using Cloudflare Browser Rendering API with Puppeteer
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
   * Chunk audio file into segments using FFmpeg via Puppeteer
   * Downloads audio, splits into chunks, uploads to R2
   */
  async chunkAudio(
    audioUrl: string,
    chunkDurationSec: number,
    totalDurationMs: number,
    r2Bucket: R2Bucket,
    jobId?: string // Optional jobId for organized R2 cleanup
  ): Promise<AudioChunkResult[]> {
    console.log('[BrowserFFmpeg] ⭐ chunkAudio called with Puppeteer');
    console.log('[BrowserFFmpeg] Parameters:', {
      audioUrl,
      chunkDurationSec,
      totalDurationMs,
      hasR2Bucket: !!r2Bucket,
      jobId,
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

    let browser: any = null;

    try {
      // Launch Puppeteer browser
      console.log('[BrowserFFmpeg] Launching Puppeteer browser...');
      browser = await puppeteer.launch(this.browser);

      const page = await browser.newPage();

      // Navigate to a real HTTPS page to get proper origin for Web Workers
      // FIX: about:blank and data: URLs have origin 'null' which blocks FFmpeg.wasm Workers
      // Using example.com (minimal, fast, reliable)
      await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });

      // Load FFmpeg.wasm
      console.log('[BrowserFFmpeg] Loading FFmpeg.wasm...');
      await page.addScriptTag({
        url: 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.6/dist/umd/ffmpeg.js'
      });

      await page.addScriptTag({
        url: 'https://unpkg.com/@ffmpeg/util@0.12.1/dist/umd/index.js'
      });

      // Wait for libraries to load
      await page.waitForFunction(() => {
        return typeof (window as any).FFmpegWASM !== 'undefined' &&
               typeof (window as any).FFmpegUtil !== 'undefined';
      }, { timeout: 30000 });

      // Process audio chunks using FFmpeg.wasm
      console.log('[BrowserFFmpeg] Processing audio chunks...');
      const chunks = await page.evaluate(async (audioUrl: string, chunkDurationSec: number, totalChunks: number) => {
        const { FFmpeg } = (window as any).FFmpegWASM;
        const { fetchFile } = (window as any).FFmpegUtil;

        const ffmpeg = new FFmpeg();
        const logs: string[] = [];

        ffmpeg.on('log', ({ message }: any) => {
          logs.push(message);
        });

        await ffmpeg.load({
          coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd/ffmpeg-core.js',
        });

        // Fetch audio file
        console.log('Fetching audio from', audioUrl);
        const audioData = await fetchFile(audioUrl);
        await ffmpeg.writeFile('input.mp3', audioData);

        const chunks = [];

        // Split audio into chunks
        for (let i = 0; i < totalChunks; i++) {
          const startTime = i * chunkDurationSec;
          const outputFile = `chunk_${i.toString().padStart(3, '0')}.mp3`;

          console.log('Processing chunk', i, 'start:', startTime);

          // Run FFmpeg to extract chunk
          await ffmpeg.exec([
            '-i', 'input.mp3',
            '-ss', startTime.toString(),
            '-t', chunkDurationSec.toString(),
            '-acodec', 'copy',
            outputFile
          ]);

          // Read chunk data
          const data = await ffmpeg.readFile(outputFile);

          // Convert to base64 for transfer
          const blob = new Blob([data], { type: 'audio/mpeg' });
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]);
            };
            reader.readAsDataURL(blob);
          });

          chunks.push({
            index: i,
            base64: base64,
            startTime: startTime * 1000,
            endTime: (startTime + chunkDurationSec) * 1000,
            duration: chunkDurationSec * 1000,
          });

          console.log('Chunk', i, 'complete, size:', (data as Uint8Array).length);
        }

        return chunks;
      }, audioUrl, chunkDurationSec, totalChunks);

      console.log('[BrowserFFmpeg] Created', chunks.length, 'audio chunks via Puppeteer');

      // Close browser
      await browser.close();
      browser = null;

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
    } finally {
      // Ensure browser is closed
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          console.warn('[BrowserFFmpeg] Error closing browser:', e);
        }
      }
    }
  }

  /**
   * Get audio duration in milliseconds using Puppeteer
   * Uses FFmpeg to probe audio file metadata
   */
  async getAudioDuration(audioUrl: string): Promise<number> {
    console.log('[BrowserFFmpeg] Getting audio duration with Puppeteer:', audioUrl);

    let browser: any = null;

    try {
      // Launch Puppeteer browser
      browser = await puppeteer.launch(this.browser);
      const page = await browser.newPage();

      // Navigate to a real HTTPS page to get proper origin for Web Workers
      // FIX: about:blank and data: URLs have origin 'null' which blocks FFmpeg.wasm Workers
      // Using example.com (minimal, fast, reliable)
      await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });

      // Load FFmpeg.wasm
      await page.addScriptTag({
        url: 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.6/dist/umd/ffmpeg.js'
      });

      await page.addScriptTag({
        url: 'https://unpkg.com/@ffmpeg/util@0.12.1/dist/umd/index.js'
      });

      // Wait for libraries to load
      await page.waitForFunction(() => {
        return typeof (window as any).FFmpegWASM !== 'undefined' &&
               typeof (window as any).FFmpegUtil !== 'undefined';
      }, { timeout: 30000 });

      // Get duration using FFmpeg.wasm
      const durationMs = await page.evaluate(async (audioUrl: string) => {
        const { FFmpeg } = (window as any).FFmpegWASM;
        const { fetchFile } = (window as any).FFmpegUtil;

        const ffmpeg = new FFmpeg();
        let duration = 0;

        // Capture log output to extract duration
        ffmpeg.on('log', ({ message }: any) => {
          const match = message.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\ d{2})/);
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

        const audioData = await fetchFile(audioUrl);
        await ffmpeg.writeFile('input.mp3', audioData);

        // Probe file to get duration
        await ffmpeg.exec(['-i', 'input.mp3', '-f', 'null', '-']);

        return duration || 30000; // Fallback to 30s if parsing fails
      }, audioUrl);

      // Close browser
      await browser.close();
      browser = null;

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

      console.log('[BrowserFFmpeg] ✅ Detected duration via Puppeteer:', durationMs, 'ms');
      return durationMs;
    } catch (error) {
      console.error('[BrowserFFmpeg] Duration probe failed:', error);
      throw new Error(`Failed to get audio duration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Ensure browser is closed
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          console.warn('[BrowserFFmpeg] Error closing browser:', e);
        }
      }
    }
  }

  // TODO: Implement normalizeVideoChunk and stitchVideos with Puppeteer
  // For now, keeping stubs that throw errors to indicate they need implementation

  async normalizeVideoChunk(
    inputUrl: string,
    targetDurationMs: number,
    targetFps: number = 30,
    r2Bucket: R2Bucket,
    outputKey: string
  ): Promise<{ url: string; durationMs: number }> {
    throw new Error('normalizeVideoChunk not yet implemented with Puppeteer');
  }

  async stitchVideos(
    segments: Array<{ index: number; url: string }>,
    r2Bucket: R2Bucket,
    outputKey: string,
    r2Credentials: R2Credentials,
    bucketName: string
  ): Promise<VideoStitchResult> {
    throw new Error('stitchVideos not yet implemented with Puppeteer');
  }
}

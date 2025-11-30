/**
 * FIX #54: Client-side FFmpeg video merge
 *
 * Uses FFmpeg.wasm 0.11.x (legacy version) which doesn't require Web Workers.
 * The 0.12.x versions have a worker-based architecture that causes CORS issues
 * when loaded from CDN. The 0.11.x version runs entirely on the main thread.
 */

let ffmpegInstance: any = null;
let ffmpegLoaded = false;
let loadingPromise: Promise<any> | null = null;
let ffmpegUnavailable = false; // Track if FFmpeg can't load due to SharedArrayBuffer

/**
 * Check if SharedArrayBuffer is available (required for FFmpeg.wasm)
 */
function isSharedArrayBufferAvailable(): boolean {
  try {
    // Check if SharedArrayBuffer exists and is constructible
    if (typeof SharedArrayBuffer === 'undefined') {
      return false;
    }
    // Try to create one to ensure it's not blocked by CORS headers
    new SharedArrayBuffer(1);
    return true;
  } catch {
    return false;
  }
}

/**
 * Dynamically load FFmpeg 0.11.x (legacy, no workers) from CDN
 */
async function loadFFmpegFromCDN(): Promise<any> {
  // If we already know FFmpeg can't load, fail fast
  if (ffmpegUnavailable) {
    throw new Error('SharedArrayBuffer is not available - FFmpeg cannot run in this browser context');
  }

  // Check SharedArrayBuffer availability first
  if (!isSharedArrayBufferAvailable()) {
    ffmpegUnavailable = true;
    console.warn('[FFmpeg] SharedArrayBuffer not available. This usually means:');
    console.warn('  1. Cross-Origin-Embedder-Policy header missing on page');
    console.warn('  2. Cross-Origin-Opener-Policy header missing on page');
    console.warn('  3. Browser Incognito mode may have restrictions');
    throw new Error('SharedArrayBuffer is not defined');
  }

  // Check if already loaded
  if (ffmpegInstance && ffmpegLoaded) {
    return ffmpegInstance;
  }

  // Return existing loading promise if in progress
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    console.log('[FFmpeg] Loading FFmpeg 0.11.x (legacy, no workers) from CDN...');

    // Load FFmpeg 0.11.x which doesn't use Web Workers
    await loadScript('https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js');

    // Wait for global to be available
    const FFmpegLib = (window as any).FFmpeg;

    if (!FFmpegLib) {
      throw new Error('FFmpeg library failed to load');
    }

    const { createFFmpeg, fetchFile } = FFmpegLib;

    // Store fetchFile for later use
    (window as any)._ffmpegFetchFile = fetchFile;

    ffmpegInstance = createFFmpeg({
      log: true,
      corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
    });

    console.log('[FFmpeg] Loading FFmpeg core 0.11.0...');
    await ffmpegInstance.load();

    ffmpegLoaded = true;
    console.log('[FFmpeg] Loaded successfully (0.11.x legacy mode)');

    return ffmpegInstance;
  })();

  return loadingPromise;
}

/**
 * Helper to load a script from URL
 */
function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script already loaded
    if (document.querySelector(`script[src="${url}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  });
}

/**
 * Helper to fetch a file as Uint8Array
 */
async function fetchFileAsBuffer(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${url}`);
  }
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

export interface MergeProgress {
  stage: 'downloading' | 'merging' | 'finalizing';
  progress: number; // 0-100
  message: string;
}

export interface MergeResult {
  success: boolean;
  blob?: Blob;
  error?: string;
}

/**
 * Merge video segments with audio using FFmpeg.wasm 0.11.x API
 */
export async function mergeVideoWithAudio(
  segmentUrls: string[],
  audioUrl: string | null,
  onProgress?: (progress: MergeProgress) => void
): Promise<MergeResult> {
  try {
    onProgress?.({ stage: 'downloading', progress: 0, message: 'Loading FFmpeg...' });

    const ffmpeg = await loadFFmpegFromCDN();
    const fetchFile = (window as any)._ffmpegFetchFile;

    // Download all video segments
    onProgress?.({ stage: 'downloading', progress: 5, message: 'Downloading video segments...' });

    for (let i = 0; i < segmentUrls.length; i++) {
      const progress = 5 + Math.round((i / segmentUrls.length) * 45);
      onProgress?.({
        stage: 'downloading',
        progress,
        message: `Downloading segment ${i + 1}/${segmentUrls.length}...`
      });

      const videoData = await fetchFile(segmentUrls[i]);
      const filename = `segment_${i.toString().padStart(3, '0')}.mp4`;
      ffmpeg.FS('writeFile', filename, videoData);
    }

    // Download audio if available
    let hasAudio = false;
    if (audioUrl) {
      onProgress?.({ stage: 'downloading', progress: 55, message: 'Downloading audio track...' });
      const audioData = await fetchFile(audioUrl);
      ffmpeg.FS('writeFile', 'audio.mp3', audioData);
      hasAudio = true;
    }

    // Create concat file for video segments
    onProgress?.({ stage: 'merging', progress: 60, message: 'Preparing video concatenation...' });

    const concatList = segmentUrls
      .map((_, i) => `file segment_${i.toString().padStart(3, '0')}.mp4`)
      .join('\n');
    ffmpeg.FS('writeFile', 'concat.txt', new TextEncoder().encode(concatList));

    // Step 1: Concatenate video segments
    onProgress?.({ stage: 'merging', progress: 70, message: 'Concatenating video segments...' });

    await ffmpeg.run(
      '-f', 'concat',
      '-safe', '0',
      '-i', 'concat.txt',
      '-c', 'copy',
      'video_only.mp4'
    );

    let outputFile = 'video_only.mp4';

    // Step 2: If we have audio, merge it with the concatenated video
    if (hasAudio) {
      onProgress?.({ stage: 'merging', progress: 85, message: 'Merging audio with video...' });

      await ffmpeg.run(
        '-i', 'video_only.mp4',
        '-i', 'audio.mp3',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-shortest',
        'final.mp4'
      );
      outputFile = 'final.mp4';
    }

    // Read output
    onProgress?.({ stage: 'finalizing', progress: 95, message: 'Reading final video...' });

    const outputData = ffmpeg.FS('readFile', outputFile);
    const blob = new Blob([outputData.buffer], { type: 'video/mp4' });

    // Cleanup temporary files
    for (let i = 0; i < segmentUrls.length; i++) {
      try {
        ffmpeg.FS('unlink', `segment_${i.toString().padStart(3, '0')}.mp4`);
      } catch {}
    }
    try {
      ffmpeg.FS('unlink', 'concat.txt');
      ffmpeg.FS('unlink', 'video_only.mp4');
      if (hasAudio) {
        ffmpeg.FS('unlink', 'audio.mp3');
        ffmpeg.FS('unlink', 'final.mp4');
      }
    } catch {}

    onProgress?.({ stage: 'finalizing', progress: 100, message: 'Complete!' });

    console.log('[FFmpeg] Merge complete! Size:', blob.size, 'bytes');

    return { success: true, blob };

  } catch (error) {
    console.error('[FFmpeg] Merge error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Check if FFmpeg can be used (SharedArrayBuffer available)
 */
export function canUseFFmpeg(): boolean {
  return isSharedArrayBufferAvailable() && !ffmpegUnavailable;
}

/**
 * Download segments without merging (fallback when FFmpeg unavailable)
 * Returns the first segment as a preview
 */
export async function downloadSegmentsAsFallback(
  segmentUrls: string[],
  audioUrl: string | null,
  filename: string,
  onProgress?: (progress: MergeProgress) => void
): Promise<MergeResult> {
  try {
    if (segmentUrls.length === 0) {
      return { success: false, error: 'No video segments to download' };
    }

    onProgress?.({ stage: 'downloading', progress: 10, message: 'Downloading video (fallback mode)...' });

    // Download all segments and concatenate the raw bytes
    // Note: This is a simple concatenation that may not work perfectly,
    // but it's better than nothing when FFmpeg isn't available
    const chunks: Uint8Array[] = [];

    for (let i = 0; i < segmentUrls.length; i++) {
      const progress = 10 + Math.round((i / segmentUrls.length) * 80);
      onProgress?.({
        stage: 'downloading',
        progress,
        message: `Downloading segment ${i + 1}/${segmentUrls.length}...`
      });

      const response = await fetch(segmentUrls[i]);
      if (!response.ok) {
        throw new Error(`Failed to download segment ${i + 1}`);
      }
      const buffer = await response.arrayBuffer();
      chunks.push(new Uint8Array(buffer));
    }

    onProgress?.({ stage: 'finalizing', progress: 95, message: 'Preparing download...' });

    // Create blob from first segment (since raw concatenation won't work properly for MP4)
    // In the future, we could implement proper MP4 concatenation without FFmpeg
    const blob = new Blob([chunks[0]], { type: 'video/mp4' });

    onProgress?.({ stage: 'finalizing', progress: 100, message: 'Complete!' });

    console.log('[Fallback Download] Downloading first segment, size:', blob.size, 'bytes');
    console.warn('[Fallback Download] Note: Full video merge unavailable - downloading preview only');

    return { success: true, blob };
  } catch (error) {
    console.error('[Fallback Download] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

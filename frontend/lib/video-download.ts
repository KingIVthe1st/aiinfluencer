/**
 * FIX #54: Client-side Music Video Download
 *
 * Since the video is stored as segments + separate audio (due to video provider limitations),
 * this module provides functionality to download either:
 * 1. All segments as a ZIP file with the audio
 * 2. Just the audio (MP3)
 *
 * Full video merging would require FFmpeg which isn't available in browsers without WASM.
 * For now, we provide practical download options.
 */

export interface VideoManifest {
  version: number;
  jobId: string;
  totalDurationMs: number;
  segmentCount: number;
  audioUrl: string | null;
  audioSyncMode: 'client' | 'embedded';
  segments: {
    index: number;
    url: string;
    durationMs: number;
    startTimeMs: number;
    endTimeMs: number;
  }[];
}

/**
 * Download the audio track (song) from a music video
 */
export async function downloadAudio(manifestUrl: string, singerName: string): Promise<void> {
  try {
    const response = await fetch(manifestUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch manifest');
    }

    const manifest: VideoManifest = await response.json();

    if (!manifest.audioUrl) {
      throw new Error('No audio URL in manifest');
    }

    // Fetch the audio file
    const audioResponse = await fetch(manifest.audioUrl);
    if (!audioResponse.ok) {
      throw new Error('Failed to fetch audio');
    }

    const blob = await audioResponse.blob();
    const url = URL.createObjectURL(blob);

    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `${singerName || 'music'}-song.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error('[VideoDownload] Audio download failed:', error);
    throw error;
  }
}

/**
 * Download all video segments + audio as individual files
 * Opens multiple download dialogs (one per file)
 */
export async function downloadAllFiles(manifestUrl: string, singerName: string): Promise<void> {
  try {
    const response = await fetch(manifestUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch manifest');
    }

    const manifest: VideoManifest = await response.json();
    const prefix = singerName || 'music-video';

    // Download each segment
    for (let i = 0; i < manifest.segments.length; i++) {
      const segment = manifest.segments[i];
      const segResponse = await fetch(segment.url);
      if (!segResponse.ok) {
        console.error(`Failed to fetch segment ${i}`);
        continue;
      }

      const blob = await segResponse.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${prefix}-segment-${i + 1}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Download audio
    if (manifest.audioUrl) {
      const audioResponse = await fetch(manifest.audioUrl);
      if (audioResponse.ok) {
        const blob = await audioResponse.blob();
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${prefix}-audio.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
      }
    }
  } catch (error) {
    console.error('[VideoDownload] Download all failed:', error);
    throw error;
  }
}

/**
 * Get download options info for a music video
 */
export async function getDownloadInfo(manifestUrl: string): Promise<{
  segmentCount: number;
  totalDurationMs: number;
  hasAudio: boolean;
  segments: { index: number; url: string; durationMs: number }[];
  audioUrl: string | null;
}> {
  const response = await fetch(manifestUrl);
  if (!response.ok) {
    throw new Error('Failed to fetch manifest');
  }

  const manifest: VideoManifest = await response.json();

  return {
    segmentCount: manifest.segmentCount,
    totalDurationMs: manifest.totalDurationMs,
    hasAudio: !!manifest.audioUrl,
    segments: manifest.segments.map(s => ({
      index: s.index,
      url: s.url,
      durationMs: s.durationMs,
    })),
    audioUrl: manifest.audioUrl,
  };
}

'use client';

/**
 * FIX #53: Music Video Player with Audio Sync
 *
 * This component handles playback of segmented music videos with synchronized audio.
 * Since the video provider (Runway) generates silent videos, we play the original
 * song audio alongside the video segments to create the full music video experience.
 *
 * Features:
 * - Fetches manifest containing all video segments + audio URL
 * - Plays video segments sequentially
 * - Syncs audio playback with video
 * - Provides play/pause/seek controls
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Loader2, AlertCircle, SkipBack, SkipForward } from 'lucide-react';

interface VideoSegment {
  index: number;
  url: string;
  audioUrl?: string;
  durationMs: number;
  startTimeMs: number;
  endTimeMs: number;
}

interface MusicVideoManifest {
  version: number;
  jobId: string;
  totalDurationMs: number;
  segmentCount: number;
  audioUrl: string | null;
  audioSyncMode: 'client' | 'embedded';
  segments: VideoSegment[];
}

interface MusicVideoPlayerProps {
  manifestUrl: string;
  previewUrl?: string; // First segment as fallback
  className?: string;
}

export function MusicVideoPlayer({ manifestUrl, previewUrl, className = '' }: MusicVideoPlayerProps) {
  // State
  const [manifest, setManifest] = useState<MusicVideoManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch manifest on mount
  useEffect(() => {
    async function fetchManifest() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(manifestUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch manifest: ${response.status}`);
        }

        const data: MusicVideoManifest = await response.json();
        setManifest(data);
        setDuration(data.totalDurationMs / 1000);

        console.log('[MusicVideoPlayer] ✅ Manifest loaded:', {
          segments: data.segmentCount,
          totalDuration: `${(data.totalDurationMs / 1000).toFixed(1)}s`,
          hasAudio: !!data.audioUrl,
          audioUrl: data.audioUrl,
        });
      } catch (err) {
        console.error('[MusicVideoPlayer] Error loading manifest:', err);
        setError(err instanceof Error ? err.message : 'Failed to load video manifest');
      } finally {
        setLoading(false);
      }
    }

    fetchManifest();
  }, [manifestUrl]);

  // Sync audio with video playback
  const syncAudioWithVideo = useCallback(() => {
    if (!audioRef.current || !videoRef.current || !manifest) return;

    // Calculate total elapsed time based on current segment + video currentTime
    const segmentStartTime = manifest.segments
      .slice(0, currentSegmentIndex)
      .reduce((sum, seg) => sum + seg.durationMs, 0) / 1000;

    const totalElapsed = segmentStartTime + videoRef.current.currentTime;
    setCurrentTime(totalElapsed);

    // Sync audio position if drift is > 0.3s
    const audioDrift = Math.abs(audioRef.current.currentTime - totalElapsed);
    if (audioDrift > 0.3) {
      console.log('[MusicVideoPlayer] Syncing audio, drift:', audioDrift.toFixed(2));
      audioRef.current.currentTime = totalElapsed;
    }
  }, [currentSegmentIndex, manifest]);

  // Handle video segment ended - play next segment
  const handleVideoEnded = useCallback(() => {
    if (!manifest) return;

    const nextIndex = currentSegmentIndex + 1;
    if (nextIndex < manifest.segments.length) {
      console.log(`[MusicVideoPlayer] Segment ${currentSegmentIndex} ended, playing segment ${nextIndex}`);
      setCurrentSegmentIndex(nextIndex);
    } else {
      console.log('[MusicVideoPlayer] All segments completed');
      setIsPlaying(false);
      setCurrentSegmentIndex(0);
      setCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [currentSegmentIndex, manifest]);

  // Play/Pause toggle
  const togglePlayPause = useCallback(async () => {
    if (!videoRef.current || !manifest) return;

    if (isPlaying) {
      videoRef.current.pause();
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      try {
        // Play both video and audio
        console.log('[MusicVideoPlayer] 🎬 Starting playback...');
        await videoRef.current.play();
        if (audioRef.current && manifest.audioUrl) {
          console.log('[MusicVideoPlayer] 🎵 Starting audio playback at', currentTime, 'audioUrl:', manifest.audioUrl);
          audioRef.current.currentTime = currentTime;
          await audioRef.current.play();
          console.log('[MusicVideoPlayer] ✅ Audio playing');
        } else {
          console.warn('[MusicVideoPlayer] ⚠️ No audio - audioRef:', !!audioRef.current, 'audioUrl:', manifest?.audioUrl);
        }
        setIsPlaying(true);
      } catch (err) {
        console.error('[MusicVideoPlayer] ❌ Playback error:', err);
      }
    }
  }, [isPlaying, currentTime, manifest]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Seek to time
  const seekTo = useCallback((timeSeconds: number) => {
    if (!manifest || !videoRef.current) return;

    // Find which segment this time falls into
    let accumulatedTime = 0;
    let targetSegmentIndex = 0;
    let segmentOffset = 0;

    for (let i = 0; i < manifest.segments.length; i++) {
      const segmentDuration = manifest.segments[i].durationMs / 1000;
      if (accumulatedTime + segmentDuration > timeSeconds) {
        targetSegmentIndex = i;
        segmentOffset = timeSeconds - accumulatedTime;
        break;
      }
      accumulatedTime += segmentDuration;
    }

    console.log(`[MusicVideoPlayer] Seeking to ${timeSeconds.toFixed(1)}s → segment ${targetSegmentIndex} @ ${segmentOffset.toFixed(1)}s`);

    setCurrentSegmentIndex(targetSegmentIndex);
    setCurrentTime(timeSeconds);

    // Update video position after segment change
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = segmentOffset;
      }
      if (audioRef.current) {
        audioRef.current.currentTime = timeSeconds;
      }
    }, 100);
  }, [manifest]);

  // Progress tracking interval
  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = setInterval(syncAudioWithVideo, 250);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying, syncAudioWithVideo]);

  // Auto-play new segment when index changes
  useEffect(() => {
    if (videoRef.current && manifest && isPlaying) {
      videoRef.current.play().catch(console.error);
    }
  }, [currentSegmentIndex, manifest, isPlaying]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className={`relative aspect-video bg-slate-900/50 rounded-2xl flex items-center justify-center ${className}`}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          <span className="text-sm text-slate-400">Loading music video...</span>
        </div>
      </div>
    );
  }

  // Error state - fall back to preview
  if (error || !manifest) {
    if (previewUrl) {
      return (
        <div className={`relative ${className}`}>
          <video
            src={previewUrl}
            controls
            className="w-full aspect-video object-contain rounded-2xl bg-slate-900/50"
          />
          <div className="absolute top-2 left-2 bg-amber-500/90 text-black text-xs px-2 py-1 rounded">
            Preview Only (full video unavailable)
          </div>
        </div>
      );
    }

    return (
      <div className={`relative aspect-video bg-slate-900/50 rounded-2xl flex items-center justify-center ${className}`}>
        <div className="flex flex-col items-center gap-3 text-red-400">
          <AlertCircle className="w-8 h-8" />
          <span className="text-sm">{error || 'Failed to load video'}</span>
        </div>
      </div>
    );
  }

  const currentSegment = manifest.segments[currentSegmentIndex];
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`relative bg-slate-900 rounded-2xl overflow-hidden ${className}`}>
      {/* Video Element */}
      <video
        ref={videoRef}
        src={currentSegment?.url}
        className="w-full aspect-video object-contain"
        onEnded={handleVideoEnded}
        playsInline
        muted // Video is silent, audio comes from separate track
      />

      {/* Hidden Audio Element for song sync */}
      {manifest.audioUrl && (
        <audio
          ref={audioRef}
          src={manifest.audioUrl}
          preload="auto"
        />
      )}

      {/* Custom Controls Overlay */}
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
        {/* Progress Bar */}
        <div
          className="w-full h-1 bg-slate-700 cursor-pointer group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            seekTo(percent * duration);
          }}
        >
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-purple-500 group-hover:h-2 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Controls Bar */}
        <div className="flex items-center gap-4 px-4 py-3">
          {/* Play/Pause */}
          <button
            onClick={togglePlayPause}
            className="text-white hover:text-primary-400 transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6" />
            )}
          </button>

          {/* Skip Backward */}
          <button
            onClick={() => seekTo(Math.max(0, currentTime - 10))}
            className="text-white/70 hover:text-white transition-colors"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          {/* Skip Forward */}
          <button
            onClick={() => seekTo(Math.min(duration, currentTime + 10))}
            className="text-white/70 hover:text-white transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          {/* Time Display */}
          <span className="text-white text-sm font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Segment indicator */}
          <span className="text-white/50 text-xs">
            Segment {currentSegmentIndex + 1}/{manifest.segmentCount}
          </span>

          {/* Mute Toggle */}
          <button
            onClick={toggleMute}
            className="text-white/70 hover:text-white transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Music Video Badge */}
      <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full">
        <span className="animate-pulse">🎵</span>
        <span>Music Video</span>
      </div>
    </div>
  );
}

export default MusicVideoPlayer;

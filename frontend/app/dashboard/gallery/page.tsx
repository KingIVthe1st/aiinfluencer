'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { assetsAPI, singersAPI, API_BASE_URL } from '@/lib/api-client';
import { MusicVideoPlayer } from '@/components/MusicVideoPlayer';
import { mergeVideoWithAudio, downloadBlob, downloadSegmentsAsFallback, canUseFFmpeg, type MergeProgress } from '@/lib/ffmpeg-merge';

interface Asset {
  id: string;
  type: 'image' | 'audio' | 'video';
  url: string;
  singerId: string | null;
  singerName: string | null;
  provider: string;
  createdAt: number;
  metadata?: any;
  proxyManifestUrl?: string | null; // FIX #53: For music videos with audio sync
}

interface Singer {
  id: string;
  name: string;
}

type ViewMode = 'grid' | 'list';
type ContentType = 'all' | 'image' | 'audio' | 'video';

// FIX #54: Extract jobId from manifest URL to use download endpoint
function extractJobIdFromManifestUrl(manifestUrl: string): string | null {
  // manifestUrl format: https://...workers.dev/api/manifest/:jobId
  const match = manifestUrl.match(/\/api\/manifest\/([^/?]+)/);
  return match ? match[1] : null;
}

export default function GalleryPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [singers, setSingers] = useState<Singer[]>([]);
  const [stats, setStats] = useState({ total: 0, images: 0, videos: 0, audio: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [contentType, setContentType] = useState<ContentType>('all');
  const [selectedSingerId, setSelectedSingerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // FIX #54: Download state for music videos
  const [downloadingVideoId, setDownloadingVideoId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<MergeProgress | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      // Load assets and singers
      const [assetsData, singersData] = await Promise.all([
        assetsAPI.list({ limit: 100 }),
        singersAPI.list(),
      ]);

      setAssets(assetsData.assets);
      setSingers(singersData.singers || []);

      // Try to load stats, but calculate from assets if endpoint doesn't exist
      try {
        const statsData = await assetsAPI.getStats();
        setStats(statsData.stats);
      } catch (statsErr) {
        console.log('[Gallery] Stats endpoint not available, calculating from assets data');
        // Calculate stats from assets data
        const calculatedStats = {
          total: assetsData.assets.length,
          images: assetsData.assets.filter((a: Asset) => a.type === 'image').length,
          videos: assetsData.assets.filter((a: Asset) => a.type === 'video').length,
          audio: assetsData.assets.filter((a: Asset) => a.type === 'audio').length,
        };
        setStats(calculatedStats);
      }

      setLoading(false);
    } catch (err) {
      console.error('[Gallery] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load content');
      setLoading(false);
    }
  }

  async function handleDelete(assetId: string) {
    if (!confirm('Are you sure you want to delete this content?')) return;

    try {
      await assetsAPI.delete(assetId);
      await loadData();
    } catch (err) {
      console.error('[Gallery] Delete error:', err);
      alert('Failed to delete content');
    }
  }

  // FIX #54: Download full music video with audio merged
  async function downloadMusicVideo(asset: Asset) {
    if (!asset.proxyManifestUrl) {
      alert('Cannot download: no video manifest available');
      return;
    }

    const jobId = extractJobIdFromManifestUrl(asset.proxyManifestUrl);
    if (!jobId) {
      alert('Cannot download: unable to extract video ID');
      return;
    }

    setDownloadingVideoId(asset.id);
    setDownloadProgress({ stage: 'downloading', progress: 0, message: 'Checking for cached video...' });

    try {
      // Call the server download endpoint - it either returns cached video or info for client-side merge
      const downloadUrl = `${API_BASE_URL}/api/download/${jobId}`;
      console.log('[Gallery] Downloading music video:', downloadUrl);

      const response = await fetch(downloadUrl, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Download failed: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');

      // If we get video/mp4 back, it's a cached video - download directly
      if (contentType?.includes('video/mp4')) {
        console.log('[Gallery] Serving cached merged video');
        const blob = await response.blob();
        downloadBlob(blob, `music-video-${asset.singerName || 'singer'}-${jobId.slice(-8)}.mp4`);
        console.log('[Gallery] Music video download complete (cached)');
        return;
      }

      // Otherwise, we need to do client-side merge
      const mergeData = await response.json();

      if (!mergeData.needsClientMerge) {
        throw new Error('Unexpected response from download endpoint');
      }

      const filename = `music-video-${asset.singerName || 'singer'}-${jobId.slice(-8)}.mp4`;
      let result;

      // Check if FFmpeg is available (requires SharedArrayBuffer)
      if (canUseFFmpeg()) {
        console.log('[Gallery] Starting client-side FFmpeg merge...');
        setDownloadProgress({ stage: 'downloading', progress: 0, message: 'Loading FFmpeg...' });

        // Use client-side FFmpeg to merge
        result = await mergeVideoWithAudio(
          mergeData.segments,
          mergeData.audioUrl,
          (progress) => setDownloadProgress(progress)
        );
      } else {
        // FFmpeg not available - use fallback download
        console.warn('[Gallery] FFmpeg unavailable (SharedArrayBuffer not supported), using fallback download');
        setDownloadProgress({ stage: 'downloading', progress: 0, message: 'Preparing download (preview mode)...' });

        result = await downloadSegmentsAsFallback(
          mergeData.segments,
          mergeData.audioUrl,
          filename,
          (progress) => setDownloadProgress(progress)
        );

        if (result.success) {
          // Notify user this is a preview
          console.warn('[Gallery] Downloaded preview only - full video merge requires a compatible browser');
        }
      }

      if (!result.success || !result.blob) {
        throw new Error(result.error || 'Download failed');
      }

      // Download the video
      downloadBlob(result.blob, filename);

      // Only cache if we did a full FFmpeg merge (not fallback)
      if (canUseFFmpeg() && mergeData.cacheEndpoint) {
        fetch(mergeData.cacheEndpoint, {
          method: 'POST',
          body: result.blob,
          headers: { 'Content-Type': 'video/mp4' },
          credentials: 'include',
        }).then(() => {
          console.log('[Gallery] Merged video cached for future downloads');
        }).catch((err) => {
          console.warn('[Gallery] Failed to cache merged video:', err);
        });
      }

      console.log('[Gallery] Music video download complete');
    } catch (err) {
      console.error('[Gallery] Download error:', err);
      alert(`Failed to download video: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDownloadingVideoId(null);
      setDownloadProgress(null);
    }
  }

  const filteredAssets = assets.filter((asset) => {
    if (contentType !== 'all' && asset.type !== contentType) return false;
    if (selectedSingerId && asset.singerId !== selectedSingerId) return false;
    if (searchQuery && asset.singerName && !asset.singerName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Map provider codes to user-friendly display names
  const getProviderDisplayName = (provider: string): string => {
    const mapping: Record<string, string> = {
      'openai-dalle': 'Image AI',
      'elevenlabs-music': 'Music AI',
      'gemini-flash': 'AI',
      'sora-2': 'Video AI',
      'veo3': 'Video AI',
      'elevenlabs': 'Voice AI',
    };
    return mapping[provider] || 'AI';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-violet-200 animate-pulse" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-12 border border-red-200 shadow-lg text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Failed to Load Content</h3>
        <p className="text-slate-600 mb-6">{error}</p>
        <button
          onClick={loadData}
          className="px-6 py-3 rounded-xl text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:shadow-xl font-semibold transition-all duration-300"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">Content Library</h1>
        <p className="text-lg text-slate-600">Browse and manage all your AI-generated content</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-6 border border-slate-200/50 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Total Content</p>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-violet-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-6 border border-slate-200/50 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Images</p>
              <p className="text-3xl font-bold text-slate-900">{stats.images}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-100 to-fuchsia-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-6 border border-slate-200/50 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Videos</p>
              <p className="text-3xl font-bold text-slate-900">{stats.videos}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-6 border border-slate-200/50 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Audio</p>
              <p className="text-3xl font-bold text-slate-900">{stats.audio}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-6 border border-slate-200/50 shadow-lg space-y-6">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by singer name..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-100 transition-all duration-300"
          />
        </div>

        {/* Type Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-slate-700">Type:</span>
          <button
            onClick={() => setContentType('all')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
              contentType === 'all'
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/40'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setContentType('image')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
              contentType === 'image'
                ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-lg shadow-fuchsia-500/40'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Images
          </button>
          <button
            onClick={() => setContentType('video')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
              contentType === 'video'
                ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg shadow-purple-500/40'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Videos
          </button>
          <button
            onClick={() => setContentType('audio')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
              contentType === 'audio'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-lg shadow-pink-500/40'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            Audio
          </button>
        </div>

        {/* Singer Filters */}
        {singers.length > 0 && (
          <div>
            <span className="text-sm font-semibold text-slate-700 block mb-3">Singer:</span>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedSingerId(null)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
                  selectedSingerId === null
                    ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/40'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Singers
              </button>
              {singers.map((singer) => (
                <button
                  key={singer.id}
                  onClick={() => setSelectedSingerId(singer.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
                    selectedSingerId === singer.id
                      ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/40'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {singer.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <p className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{filteredAssets.length}</span> of{' '}
            <span className="font-semibold text-slate-900">{assets.length}</span> items
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
                viewMode === 'grid'
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/40'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
                viewMode === 'list'
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/40'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredAssets.length === 0 && (
        <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-12 border border-slate-200/50 shadow-lg text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No content found</h3>
          <p className="text-slate-600 mb-6">
            {assets.length === 0 ? 'Start creating content to see it here' : 'Try adjusting your filters'}
          </p>
          <div className="flex gap-3 justify-center">
            {assets.length > 0 && (
              <button
                onClick={() => {
                  setContentType('all');
                  setSelectedSingerId(null);
                  setSearchQuery('');
                }}
                className="px-6 py-3 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-semibold transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
              >
                Clear Filters
              </button>
            )}
            <Link
              href="/generate/image"
              className="px-6 py-3 rounded-xl text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:shadow-xl hover:shadow-violet-500/60 font-semibold transition-all duration-500 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
            >
              Create Content
            </Link>
          </div>
        </div>
      )}

      {/* Grid View */}
      {filteredAssets.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="group rounded-2xl bg-white/70 backdrop-blur-xl border border-slate-200/50 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden"
            >
              {/* Preview */}
              <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden">
                {asset.type === 'image' && (
                  <img src={asset.url} alt="Generated content" className="w-full h-full object-cover" />
                )}
                {asset.type === 'audio' && (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-24 h-24 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                )}
                {asset.type === 'video' && (
                  asset.proxyManifestUrl ? (
                    // FIX #53: Use MusicVideoPlayer for segmented music videos with audio sync
                    <MusicVideoPlayer
                      manifestUrl={asset.proxyManifestUrl}
                      previewUrl={asset.url}
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-24 h-24 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )
                )}

                {/* Type Badge */}
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-xl text-slate-900 capitalize shadow-lg">
                    {asset.type}
                  </span>
                </div>

                {/* Provider Badge */}
                <div className="absolute top-3 right-3">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-600/90 backdrop-blur-xl text-white shadow-lg">
                    {getProviderDisplayName(asset.provider)}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-6">
                <h3 className="font-bold text-slate-900 mb-1">{asset.singerName || 'Unknown Singer'}</h3>
                <p className="text-sm text-slate-600 mb-4">{formatDate(asset.createdAt)}</p>

                {/* Actions */}
                <div className="flex gap-2">
                  {/* FIX #54: Download full music video with audio merged */}
                  {asset.type === 'video' && asset.proxyManifestUrl ? (
                    <button
                      onClick={() => downloadMusicVideo(asset)}
                      disabled={downloadingVideoId === asset.id}
                      className={`flex-1 px-4 py-2 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
                        downloadingVideoId === asset.id
                          ? 'text-slate-400 bg-slate-100 cursor-wait'
                          : 'text-violet-700 bg-violet-50 hover:bg-violet-100'
                      }`}
                      title="Download full music video with audio"
                    >
                      {downloadingVideoId === asset.id ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          {downloadProgress ? `${downloadProgress.progress}%` : 'Preparing...'}
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download Video
                        </>
                      )}
                    </button>
                  ) : (
                    <a
                      href={asset.url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-4 py-2 rounded-xl text-violet-700 bg-violet-50 hover:bg-violet-100 font-semibold transition-all duration-300 flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(asset.id)}
                    className="px-4 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-red-50 hover:text-red-600 font-semibold transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {filteredAssets.length > 0 && viewMode === 'list' && (
        <div className="space-y-4">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="rounded-2xl bg-white/70 backdrop-blur-xl p-6 border border-slate-200/50 shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              <div className="flex items-center gap-6">
                {/* Thumbnail */}
                <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex-shrink-0 overflow-hidden">
                  {asset.type === 'image' && (
                    <img src={asset.url} alt="Generated content" className="w-full h-full object-cover" />
                  )}
                  {asset.type === 'audio' && (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                    </div>
                  )}
                  {asset.type === 'video' && (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 capitalize">
                      {asset.type}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      {getProviderDisplayName(asset.provider)}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1">{asset.singerName || 'Unknown Singer'}</h3>
                  <p className="text-sm text-slate-600">Created {formatDate(asset.createdAt)}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {/* FIX #54: Download full music video with audio merged */}
                  {asset.type === 'video' && asset.proxyManifestUrl ? (
                    <button
                      onClick={() => downloadMusicVideo(asset)}
                      disabled={downloadingVideoId === asset.id}
                      className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
                        downloadingVideoId === asset.id
                          ? 'text-slate-400 bg-slate-100 cursor-wait'
                          : 'text-violet-700 bg-violet-50 hover:bg-violet-100'
                      }`}
                      title="Download full music video with audio"
                    >
                      {downloadingVideoId === asset.id ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          {downloadProgress ? `${downloadProgress.progress}%` : 'Preparing...'}
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download Video
                        </>
                      )}
                    </button>
                  ) : (
                    <a
                      href={asset.url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 rounded-xl text-violet-700 bg-violet-50 hover:bg-violet-100 font-semibold transition-all duration-300 flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(asset.id)}
                    className="px-4 py-3 rounded-xl text-slate-700 bg-slate-100 hover:bg-red-50 hover:text-red-600 font-semibold transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

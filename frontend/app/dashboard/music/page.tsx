'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { musicAPI, singersAPI, jobsAPI } from '@/lib/api-client';

interface Song {
  id: string;
  userId: string;
  singerId: string;
  title: string;
  description: string | null;
  genre: string | null;
  mood: string | null;
  bpm: number;
  key: string;
  status: string;
  activeVersionId: string | null;
  playCount: number;
  likeCount: number;
  createdAt: number;
  updatedAt: number;
}

interface Singer {
  id: string;
  name: string;
}

type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | 'draft' | 'generating' | 'completed' | 'failed';

export default function MusicCatalogPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [singers, setSingers] = useState<Singer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedSingerId, setSelectedSingerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pollingJobs, setPollingJobs] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Poll for generating songs
    const generatingSongs = songs.filter(s => s.status === 'generating');
    if (generatingSongs.length > 0) {
      const interval = setInterval(() => {
        loadData();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [songs]);

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      const [songsData, singersData] = await Promise.all([
        musicAPI.listSongs({ limit: 100 }),
        singersAPI.list(),
      ]);

      setSongs(songsData.songs);
      setSingers(singersData.singers || []);
      setLoading(false);
    } catch (err) {
      console.error('[Music] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load songs');
      setLoading(false);
    }
  }

  async function handleDelete(songId: string) {
    if (!confirm('Are you sure you want to delete this song? This will delete all versions and cannot be undone.')) return;

    try {
      await musicAPI.deleteSong(songId);
      await loadData();
    } catch (err) {
      console.error('[Music] Delete error:', err);
      alert('Failed to delete song');
    }
  }

  const filteredSongs = songs.filter((song) => {
    if (statusFilter !== 'all' && song.status !== statusFilter) return false;
    if (selectedSingerId && song.singerId !== selectedSingerId) return false;
    if (searchQuery && !song.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: songs.length,
    draft: songs.filter(s => s.status === 'draft').length,
    generating: songs.filter(s => s.status === 'generating').length,
    completed: songs.filter(s => s.status === 'completed').length,
    totalPlays: songs.reduce((sum, s) => sum + s.playCount, 0),
  };

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

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSingerName = (singerId: string) => {
    const singer = singers.find(s => s.id === singerId);
    return singer?.name || 'Unknown Singer';
  };

  const parseMood = (moodString: string | null): string[] => {
    if (!moodString) return [];
    try {
      return JSON.parse(moodString);
    } catch {
      return [];
    }
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
        <h3 className="text-xl font-bold text-slate-900 mb-2">Failed to Load Songs</h3>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Music Studio</h1>
          <p className="text-lg text-slate-600">Create, manage, and iterate on your songs</p>
        </div>
        <Link
          href="/dashboard/music/create"
          className="px-6 py-3 rounded-xl text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:shadow-xl hover:shadow-violet-500/60 font-semibold transition-all duration-500 hover:scale-105 flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Song
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-6 border border-slate-200/50 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Total Songs</p>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-violet-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-6 border border-slate-200/50 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Completed</p>
              <p className="text-3xl font-bold text-slate-900">{stats.completed}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-6 border border-slate-200/50 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Generating</p>
              <p className="text-3xl font-bold text-slate-900">{stats.generating}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-100 to-yellow-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-6 border border-slate-200/50 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Total Plays</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalPlays}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-100 to-fuchsia-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
            placeholder="Search songs by title..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-violet-400 focus:ring-4 focus:ring-violet-100 transition-all duration-300"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-slate-700">Status:</span>
          {(['all', 'draft', 'generating', 'completed', 'failed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
                statusFilter === status
                  ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/40'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
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
            Showing <span className="font-semibold text-slate-900">{filteredSongs.length}</span> of{' '}
            <span className="font-semibold text-slate-900">{songs.length}</span> songs
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
      {filteredSongs.length === 0 && (
        <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-12 border border-slate-200/50 shadow-lg text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No songs found</h3>
          <p className="text-slate-600 mb-6">
            {songs.length === 0 ? 'Create your first song to get started' : 'Try adjusting your filters'}
          </p>
          <div className="flex gap-3 justify-center">
            {songs.length > 0 && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setSelectedSingerId(null);
                  setSearchQuery('');
                }}
                className="px-6 py-3 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-semibold transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
              >
                Clear Filters
              </button>
            )}
            <Link
              href="/dashboard/music/create"
              className="px-6 py-3 rounded-xl text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:shadow-xl hover:shadow-violet-500/60 font-semibold transition-all duration-500 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
            >
              Create Song
            </Link>
          </div>
        </div>
      )}

      {/* Grid View */}
      {filteredSongs.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSongs.map((song) => {
            const mood = parseMood(song.mood);
            return (
              <Link
                key={song.id}
                href={`/dashboard/music/${song.id}`}
                className="group rounded-2xl bg-white/70 backdrop-blur-xl border border-slate-200/50 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
              >
                {/* Header */}
                <div className="p-6 bg-gradient-to-br from-violet-50 to-fuchsia-50 border-b border-slate-200/50">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 text-lg mb-1">{song.title}</h3>
                      <p className="text-sm text-slate-600">{getSingerName(song.singerId)}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                      song.status === 'completed' ? 'bg-green-100 text-green-700' :
                      song.status === 'generating' ? 'bg-yellow-100 text-yellow-700' :
                      song.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {song.status}
                    </div>
                  </div>

                  {/* Musical Info */}
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>{song.bpm} BPM</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      <span>{song.key}</span>
                    </div>
                    {song.genre && (
                      <div className="px-2 py-1 rounded-lg bg-violet-100 text-violet-700 text-xs font-semibold">
                        {song.genre}
                      </div>
                    )}
                  </div>

                  {/* Mood Tags */}
                  {mood.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {mood.slice(0, 3).map((m, i) => (
                        <span key={i} className="px-2 py-1 rounded-lg bg-fuchsia-100 text-fuchsia-700 text-xs">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="p-6">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-slate-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{song.playCount}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span>{song.likeCount}</span>
                      </div>
                    </div>
                    <span className="text-slate-500">{formatDate(song.updatedAt)}</span>
                  </div>

                  {/* Action Hint */}
                  <div className="mt-4 pt-4 border-t border-slate-200 text-center">
                    <span className="text-sm text-violet-600 font-semibold group-hover:text-fuchsia-600 transition-colors">
                      View Details →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* List View */}
      {filteredSongs.length > 0 && viewMode === 'list' && (
        <div className="space-y-4">
          {filteredSongs.map((song) => {
            const mood = parseMood(song.mood);
            return (
              <Link
                key={song.id}
                href={`/dashboard/music/${song.id}`}
                className="block rounded-2xl bg-white/70 backdrop-blur-xl p-6 border border-slate-200/50 shadow-lg hover:shadow-2xl transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
              >
                <div className="flex items-center gap-6">
                  {/* Icon */}
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-100 to-fuchsia-100 flex-shrink-0 flex items-center justify-center">
                    <svg className="w-8 h-8 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-slate-900 text-lg">{song.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                        song.status === 'completed' ? 'bg-green-100 text-green-700' :
                        song.status === 'generating' ? 'bg-yellow-100 text-yellow-700' :
                        song.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {song.status}
                      </span>
                      {song.genre && (
                        <span className="px-2 py-1 rounded-lg bg-violet-100 text-violet-700 text-xs font-semibold">
                          {song.genre}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span>{getSingerName(song.singerId)}</span>
                      <span>•</span>
                      <span>{song.bpm} BPM</span>
                      <span>•</span>
                      <span>{song.key}</span>
                      <span>•</span>
                      <span>{formatDate(song.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{song.playCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span>{song.likeCount}</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div>
                    <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

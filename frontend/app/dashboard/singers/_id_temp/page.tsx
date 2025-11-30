'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { singersAPI, musicAPI } from '@/lib/api-client';

interface Singer {
  id: string;
  name: string;
  description: string | null;
  voiceId: string | null;
  attributes: any;
  imageGenerationSettings: any;
  profileImageUrl: string | null;
  createdAt: number;
  updatedAt: number;
}

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

export default function SingerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const singerId = params.id as string;

  const [singer, setSinger] = useState<Singer | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [singerId]);

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      const [singerData, songsData] = await Promise.all([
        singersAPI.get(singerId),
        musicAPI.listSongs({ singerId, limit: 100 }),
      ]);

      setSinger(singerData.singer);
      setSongs(songsData.songs || []);
      setLoading(false);
    } catch (err) {
      console.error('[SingerProfile] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load singer');
      setLoading(false);
    }
  }

  async function handleDeleteSinger() {
    try {
      await singersAPI.delete(singerId);
      router.push('/dashboard/singers');
    } catch (err) {
      console.error('[SingerProfile] Delete error:', err);
      alert('Failed to delete singer');
    }
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  const stats = {
    totalSongs: songs.length,
    completedSongs: songs.filter(s => s.status === 'completed').length,
    totalPlays: songs.reduce((sum, s) => sum + s.playCount, 0),
    totalLikes: songs.reduce((sum, s) => sum + s.likeCount, 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !singer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-white/70 backdrop-blur-xl p-8 border border-slate-200/50 shadow-lg text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Singer Not Found</h2>
          <p className="text-slate-600 mb-6">{error || 'The singer you\'re looking for doesn\'t exist.'}</p>
          <Link
            href="/dashboard/singers"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold hover:from-violet-700 hover:to-fuchsia-700 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Singers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/singers"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Back to Singers</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/singers/${singerId}/edit`}
              className="px-4 py-2 rounded-xl bg-white/70 backdrop-blur-xl border border-slate-200/50 text-slate-700 font-semibold hover:bg-white/90 transition-all"
            >
              Edit Singer
            </Link>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 font-semibold hover:bg-red-100 transition-all"
            >
              Delete Singer
            </button>
          </div>
        </div>

        {/* Singer Profile Card */}
        <div className="rounded-2xl bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 backdrop-blur-xl p-8 border border-slate-200/50 shadow-lg">
          <div className="flex items-start gap-8">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              {singer.profileImageUrl ? (
                <img
                  src={singer.profileImageUrl}
                  alt={singer.name}
                  className="w-32 h-32 rounded-2xl object-cover border-4 border-white shadow-xl"
                />
              ) : (
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-xl">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Singer Info */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-slate-900 mb-3">{singer.name}</h1>
              {singer.description && (
                <p className="text-lg text-slate-600 mb-6 max-w-3xl">{singer.description}</p>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl bg-white/70 backdrop-blur-xl p-4 border border-slate-200/50">
                  <p className="text-sm text-slate-500 mb-1">Total Songs</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.totalSongs}</p>
                </div>
                <div className="rounded-xl bg-white/70 backdrop-blur-xl p-4 border border-slate-200/50">
                  <p className="text-sm text-slate-500 mb-1">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{stats.completedSongs}</p>
                </div>
                <div className="rounded-xl bg-white/70 backdrop-blur-xl p-4 border border-slate-200/50">
                  <p className="text-sm text-slate-500 mb-1">Total Plays</p>
                  <p className="text-3xl font-bold text-violet-600">{stats.totalPlays}</p>
                </div>
                <div className="rounded-xl bg-white/70 backdrop-blur-xl p-4 border border-slate-200/50">
                  <p className="text-sm text-slate-500 mb-1">Total Likes</p>
                  <p className="text-3xl font-bold text-fuchsia-600">{stats.totalLikes}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 mt-6 pt-6 border-t border-slate-200/50 text-sm text-slate-600">
                {singer.voiceId && (
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span className="font-medium">Voice ID: {singer.voiceId.substring(0, 8)}...</span>
                  </div>
                )}
                <div className="text-slate-500">
                  Created {formatDate(singer.createdAt)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Music Catalog */}
        <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-6 border border-slate-200/50 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Music Catalog</h2>
              <p className="text-slate-600 mt-1">All songs by {singer.name}</p>
            </div>
            <Link
              href={`/dashboard/music/create?singerId=${singerId}`}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold hover:from-violet-700 hover:to-fuchsia-700 transition-all"
            >
              + New Song
            </Link>
          </div>

          {songs.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Songs Yet</h3>
              <p className="text-slate-600 mb-6">Create your first song with {singer.name}</p>
              <Link
                href={`/dashboard/music/create?singerId=${singerId}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold hover:from-violet-700 hover:to-fuchsia-700 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create First Song
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {songs.map((song) => {
                const mood = song.mood ? JSON.parse(song.mood) : [];
                return (
                  <Link
                    key={song.id}
                    href={`/dashboard/music/${song.id}`}
                    className="group rounded-xl bg-gradient-to-br from-white to-slate-50 border border-slate-200/50 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-105 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="p-4 bg-gradient-to-br from-violet-50 to-fuchsia-50 border-b border-slate-200/50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-900 mb-1 line-clamp-1">{song.title}</h3>
                          {song.genre && (
                            <span className="inline-block px-2 py-1 rounded-lg bg-violet-100 text-violet-700 text-xs font-semibold">
                              {song.genre}
                            </span>
                          )}
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${
                          song.status === 'completed' ? 'bg-green-100 text-green-700' :
                          song.status === 'generating' ? 'bg-yellow-100 text-yellow-700' :
                          song.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {song.status}
                        </div>
                      </div>

                      {/* Musical Info */}
                      <div className="flex items-center gap-3 text-xs text-slate-600">
                        <span>{song.bpm} BPM</span>
                        <span>•</span>
                        <span>{song.key}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="p-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
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
                        <span className="text-slate-500 text-xs">{formatDate(song.updatedAt)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="max-w-md w-full rounded-2xl bg-white/90 backdrop-blur-xl p-8 border border-slate-200/50 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2 text-center">Delete Singer?</h3>
            <p className="text-slate-600 mb-6 text-center">
              This will permanently delete "{singer.name}" and all associated songs ({stats.totalSongs}). This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSinger}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-all"
              >
                Delete Singer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

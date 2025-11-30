'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { singersAPI } from '@/lib/api-client';

// Generate static params for build - returns empty array since we handle this client-side
export async function generateStaticParams() {
  return [];
}

export default function SingerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const singerId = params.id as string;

  const [singer, setSinger] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editGenre, setEditGenre] = useState('');

  useEffect(() => {
    loadSinger();
  }, [singerId]);

  async function loadSinger() {
    try {
      // TODO: Implement singersAPI.get(singerId) in the API client
      // For now, fetch from the list
      const data = await singersAPI.list();
      const foundSinger = data.singers?.find((s: any) => s.id === singerId);

      if (foundSinger) {
        setSinger(foundSinger);
        setEditName(foundSinger.name || '');
        setEditDescription(foundSinger.description || '');
        setEditGenre(foundSinger.genre || '');
      } else {
        setError('Singer not found');
      }

      setLoading(false);
    } catch (err) {
      console.error('[Singer Detail] Load error:', err);
      setError('Failed to load singer');
      setLoading(false);
    }
  }

  async function handleSave() {
    // TODO: Implement singersAPI.update(singerId, data)
    // For now, just simulate success
    setIsEditing(false);
    setSinger({
      ...singer,
      name: editName,
      description: editDescription,
      genre: editGenre,
    });
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      // TODO: Implement singersAPI.delete(singerId)
      // For now, just navigate back
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      router.push('/dashboard/singers');
    } catch (err) {
      console.error('[Singer Detail] Delete error:', err);
      setError('Failed to delete singer');
      setIsDeleting(false);
    }
  }

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

  if (error || !singer) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-12 border border-red-200/50 shadow-lg text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">{error || 'Singer not found'}</h2>
          <p className="text-slate-600 mb-6">The singer you're looking for doesn't exist or has been deleted.</p>
          <Link
            href="/dashboard/singers"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-semibold shadow-lg shadow-violet-500/40 hover:shadow-xl hover:shadow-violet-500/60 transition-all duration-500 hover:scale-105"
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
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/singers"
          className="p-2 rounded-xl text-slate-600 hover:text-violet-600 hover:bg-white/60 transition-all duration-300"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900">{singer.name}</h1>
          <p className="text-slate-600">Singer Profile</p>
        </div>
        <div className="flex gap-3">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-xl text-violet-700 bg-violet-50 hover:bg-violet-100 font-semibold transition-all duration-300"
              >
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-xl text-red-700 bg-red-50 hover:bg-red-100 font-semibold transition-all duration-300"
              >
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-semibold transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-xl text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:shadow-lg hover:shadow-violet-500/40 font-semibold transition-all duration-300"
              >
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Singer Profile Card */}
      <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-8 border border-slate-200/50 shadow-lg">
        <div className="flex items-start gap-8">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white text-5xl font-bold shadow-2xl shadow-violet-500/40">
              {singer.name[0]?.toUpperCase() || 'S'}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-6">
            {isEditing ? (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Singer Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 transition-all duration-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Genre</label>
                  <input
                    type="text"
                    value={editGenre}
                    onChange={(e) => setEditGenre(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 transition-all duration-300"
                    placeholder="e.g., Pop, Rock, Jazz"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 transition-all duration-300"
                    placeholder="Describe your singer..."
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{singer.name}</h3>
                  {singer.genre && (
                    <span className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold bg-violet-100 text-violet-700">
                      {singer.genre}
                    </span>
                  )}
                </div>

                {singer.description && (
                  <div>
                    <p className="text-slate-700 leading-relaxed">{singer.description}</p>
                  </div>
                )}

                <div className="flex items-center gap-6 pt-4 border-t border-slate-200">
                  <div>
                    <p className="text-sm text-slate-500">Voice Type</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {singer.voiceSettings?.type === 'ai-generated' ? 'AI Generated' : 'Premade'}
                    </p>
                  </div>
                  <div className="w-px h-12 bg-slate-200" />
                  <div>
                    <p className="text-sm text-slate-500">Created</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {new Date(singer.createdAt || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-6 border border-slate-200/50 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-100 to-violet-200 flex items-center justify-center">
              <svg className="w-7 h-7 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Videos</p>
              <p className="text-3xl font-bold text-slate-900">0</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-6 border border-slate-200/50 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-fuchsia-100 to-fuchsia-200 flex items-center justify-center">
              <svg className="w-7 h-7 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Images</p>
              <p className="text-3xl font-bold text-slate-900">0</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-6 border border-slate-200/50 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
              <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Audio</p>
              <p className="text-3xl font-bold text-slate-900">0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-violet-600 to-fuchsia-600 rounded-full" />
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href={`/generate/video?singerId=${singerId}`}
            className="group rounded-2xl bg-white/70 backdrop-blur-xl p-6 border border-slate-200/50 hover:border-violet-300 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-violet-200 flex items-center justify-center text-violet-600 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 mb-1">Generate Video</h3>
                <p className="text-sm text-slate-600">Create videos with this singer</p>
              </div>
              <svg
                className="w-5 h-5 text-slate-400 group-hover:text-violet-600 group-hover:translate-x-1 transition-all duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href={`/generate/image?singerId=${singerId}`}
            className="group rounded-2xl bg-white/70 backdrop-blur-xl p-6 border border-slate-200/50 hover:border-fuchsia-300 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-100 to-fuchsia-200 flex items-center justify-center text-fuchsia-600 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 mb-1">Generate Image</h3>
                <p className="text-sm text-slate-600">Create images with this singer</p>
              </div>
              <svg
                className="w-5 h-5 text-slate-400 group-hover:text-fuchsia-600 group-hover:translate-x-1 transition-all duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href={`/generate/song?singerId=${singerId}`}
            className="group rounded-2xl bg-white/70 backdrop-blur-xl p-6 border border-slate-200/50 hover:border-purple-300 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 mb-1">Generate Audio</h3>
                <p className="text-sm text-slate-600">Create audio with this singer</p>
              </div>
              <svg
                className="w-5 h-5 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Content - Placeholder */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-violet-600 to-fuchsia-600 rounded-full" />
          Recent Content
        </h2>

        <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-12 border border-slate-200/50 shadow-lg text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No content yet</h3>
          <p className="text-slate-600 mb-6">Start creating content with {singer.name}</p>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-2xl bg-white p-8 shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3 text-center">Delete Singer?</h3>
            <p className="text-slate-600 mb-6 text-center">
              Are you sure you want to delete <strong>{singer.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-6 py-3 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-semibold transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-6 py-3 rounded-xl text-white bg-gradient-to-r from-red-600 to-red-700 hover:shadow-lg hover:shadow-red-500/40 font-semibold transition-all duration-300 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { singersAPI, assetsAPI } from '@/lib/api-client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Heading,
  Text,
  Button,
  Input,
  Textarea,
  Label,
  Spin,
  FadeIn,
  ScaleIn,
} from '@/components/ui';

interface Singer {
  id: string;
  name: string;
  description?: string;
  genre?: string;
  voiceSettings?: any;
  stylePreferences?: any;
  referenceImageUrl?: string;
  createdAt: number;
  updatedAt: number;
}

interface Asset {
  id: string;
  type: 'image' | 'audio' | 'video';
  url: string;
  provider: string;
  createdAt: number;
}

export default function SingerProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const singerId = searchParams.get('id');

  const [singer, setSinger] = useState<Singer | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');

  useEffect(() => {
    if (singerId) {
      loadData();
    } else {
      setError('No singer ID provided');
      setLoading(false);
    }
  }, [singerId]);

  async function loadData() {
    if (!singerId) return;

    try {
      setLoading(true);
      setError('');

      const [singerData, assetsData] = await Promise.all([
        singersAPI.get(singerId),
        assetsAPI.list({ singerId, limit: 100 }),
      ]);

      setSinger(singerData.singer);
      setAssets(assetsData.assets);

      // Set form values
      setName(singerData.singer.name);
      setDescription(singerData.singer.description || '');
      setGenre(singerData.singer.genre || '');

      setLoading(false);
    } catch (err) {
      console.error('[Singer Profile] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load singer');
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!singerId || !name.trim()) return;

    try {
      setSaving(true);
      setError('');

      await singersAPI.update(singerId, {
        name,
        description,
        genre,
      });

      // Reload data
      await loadData();
      setIsEditing(false);
      setSaving(false);
    } catch (err) {
      console.error('[Singer Profile] Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!singerId) return;

    try {
      await singersAPI.delete(singerId);
      router.push('/dashboard/singers');
    } catch (err) {
      console.error('[Singer Profile] Delete error:', err);
      alert('Failed to delete singer');
    }
  }

  const stats = {
    images: assets.filter(a => a.type === 'image').length,
    videos: assets.filter(a => a.type === 'video').length,
    audio: assets.filter(a => a.type === 'audio').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spin size="lg" className="text-primary" />
      </div>
    );
  }

  if (error || !singer) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/singers" className="text-violet-600 hover:text-violet-700 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Singers
        </Link>

        <Card variant="default" className="border-error-200 bg-error-50">
          <CardContent className="p-6">
            <Text className="text-error-700">{error || 'Singer not found'}</Text>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/singers" className="text-violet-600 hover:text-violet-700 flex items-center gap-2 font-semibold">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Singers
        </Link>

        <div className="flex gap-3">
          {!isEditing ? (
            <>
              <Button variant="outline" size="md" onClick={() => setIsEditing(true)}>
                Edit Singer
              </Button>
              <Button variant="outline" size="md" onClick={() => setShowDeleteConfirm(true)} className="text-red-600 hover:bg-red-50">
                Delete Singer
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="md" onClick={() => setIsEditing(false)} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" size="md" onClick={handleSave} loading={saving} disabled={saving || !name.trim()}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Singer Info */}
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-violet-500/40">
              {singer.name[0]?.toUpperCase() || 'S'}
            </div>
            <div className="flex-1">
              {isEditing ? (
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Singer name"
                  className="text-2xl font-bold"
                />
              ) : (
                <>
                  <CardTitle className="text-3xl">{singer.name}</CardTitle>
                  {singer.genre && (
                    <span className="inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold bg-violet-100 text-violet-700">
                      {singer.genre}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {isEditing ? (
            <>
              <div>
                <Label>Genre</Label>
                <Input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="e.g., Pop, Rock, Jazz"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe your singer..."
                />
              </div>
            </>
          ) : (
            <>
              {singer.description && (
                <div>
                  <Text variant="muted" className="mb-2">About</Text>
                  <Text>{singer.description}</Text>
                </div>
              )}

              {singer.voiceSettings && (
                <div>
                  <Text variant="muted" className="mb-2">Voice Settings</Text>
                  <Card variant="default" className="bg-slate-50">
                    <CardContent className="p-4">
                      <Text className="text-sm font-mono">{JSON.stringify(singer.voiceSettings, null, 2)}</Text>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <Text variant="muted" className="mb-1">Images Generated</Text>
                <Heading as="h2" className="text-3xl">{stats.images}</Heading>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-100 to-fuchsia-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <Text variant="muted" className="mb-1">Videos Created</Text>
                <Heading as="h2" className="text-3xl">{stats.videos}</Heading>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <Text variant="muted" className="mb-1">Audio Tracks</Text>
                <Heading as="h2" className="text-3xl">{stats.audio}</Heading>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Generate Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href={`/generate/image?singerId=${singerId}`}>
              <Card variant="default" className="hover:border-violet-300 hover:shadow-lg transition-all duration-300 cursor-pointer">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-fuchsia-100 to-fuchsia-200 flex items-center justify-center">
                    <svg className="w-6 h-6 text-fuchsia-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <Text className="font-semibold">Generate Image</Text>
                </CardContent>
              </Card>
            </Link>

            <Link href={`/generate/video?singerId=${singerId}`}>
              <Card variant="default" className="hover:border-violet-300 hover:shadow-lg transition-all duration-300 cursor-pointer">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <Text className="font-semibold">Generate Video</Text>
                </CardContent>
              </Card>
            </Link>

            <Link href={`/generate/song?singerId=${singerId}`}>
              <Card variant="default" className="hover:border-violet-300 hover:shadow-lg transition-all duration-300 cursor-pointer">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center">
                    <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                  <Text className="font-semibold">Generate Song</Text>
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Content */}
      {assets.length > 0 && (
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Content</CardTitle>
              <Link href={`/dashboard/gallery?singerId=${singerId}`} className="text-violet-600 hover:text-violet-700 text-sm font-semibold">
                View All →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {assets.slice(0, 4).map((asset) => (
                <div key={asset.id} className="rounded-xl overflow-hidden border border-slate-200 hover:border-violet-300 transition-all duration-300">
                  <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 relative">
                    {asset.type === 'image' && (
                      <img src={asset.url} alt="Generated content" className="w-full h-full object-cover" />
                    )}
                    {asset.type === 'audio' && (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                    )}
                    {asset.type === 'video' && (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-xl text-slate-900 capitalize">
                        {asset.type}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card variant="glass" className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Delete Singer?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Text>
                Are you sure you want to delete <strong>{singer.name}</strong>? This action cannot be undone.
              </Text>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" size="md" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                  Delete Singer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

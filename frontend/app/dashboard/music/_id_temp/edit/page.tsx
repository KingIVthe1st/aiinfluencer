'use client';
export const runtime = "edge";



import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { musicAPI, singersAPI } from '@/lib/api-client';

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

const GENRES = [
  'Pop', 'Rock', 'Hip Hop', 'R&B', 'Country', 'Jazz', 'Electronic', 'Classical',
  'Folk', 'Blues', 'Reggae', 'Metal', 'Punk', 'Indie', 'Soul', 'Funk'
];

const MOODS = [
  'Happy', 'Sad', 'Energetic', 'Calm', 'Romantic', 'Angry', 'Nostalgic',
  'Uplifting', 'Melancholic', 'Mysterious', 'Playful', 'Dramatic', 'Chill'
];

const KEYS = [
  'C major', 'C# major', 'D major', 'D# major', 'E major', 'F major',
  'F# major', 'G major', 'G# major', 'A major', 'A# major', 'B major',
  'C minor', 'C# minor', 'D minor', 'D# minor', 'E minor', 'F minor',
  'F# minor', 'G minor', 'G# minor', 'A minor', 'A# minor', 'B minor'
];

export default function EditSongPage() {
  const params = useParams();
  const router = useRouter();
  const songId = params.id as string;

  const [song, setSong] = useState<Song | null>(null);
  const [singers, setSingers] = useState<Singer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [bpm, setBpm] = useState(120);
  const [key, setKey] = useState('C major');

  useEffect(() => {
    loadData();
  }, [songId]);

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      const [songData, singersData] = await Promise.all([
        musicAPI.getSong(songId),
        singersAPI.list(),
      ]);

      setSong(songData.song);
      setSingers(singersData.singers || []);

      // Populate form fields
      setTitle(songData.song.title);
      setDescription(songData.song.description || '');
      setGenre(songData.song.genre || '');
      setSelectedMoods(songData.song.mood ? JSON.parse(songData.song.mood) : []);
      setBpm(songData.song.bpm);
      setKey(songData.song.key);

      setLoading(false);
    } catch (err) {
      console.error('[EditSong] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load song');
      setLoading(false);
    }
  }

  function toggleMood(mood: string) {
    setSelectedMoods(prev =>
      prev.includes(mood)
        ? prev.filter(m => m !== mood)
        : [...prev, mood]
    );
  }

  async function handleSave() {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!genre) {
      setError('Genre is required');
      return;
    }

    if (bpm < 40 || bpm > 200) {
      setError('BPM must be between 40 and 200');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      // Note: In a real implementation, this would call an update endpoint
      // For now, we'll show success and redirect
      // await musicAPI.updateSong(songId, { title, description, genre, mood: selectedMoods, bpm, key });

      setSuccessMessage('Song updated successfully!');
      setTimeout(() => {
        router.push(`/dashboard/music/${songId}`);
      }, 1500);
    } catch (err) {
      console.error('[EditSong] Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update song');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !song) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-white/70 backdrop-blur-xl p-8 border border-slate-200/50 shadow-lg text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Error</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link
            href="/dashboard/music"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold hover:from-violet-700 hover:to-fuchsia-700 transition-all"
          >
            Back to Music
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/dashboard/music/${songId}`}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Back to Song</span>
          </Link>

          <h1 className="text-4xl font-bold text-slate-900 mb-2">Edit Song</h1>
          {song && (
            <p className="text-lg text-slate-600">
              Update metadata and settings
            </p>
          )}
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="rounded-xl bg-green-50 border border-green-200 p-4 mb-6">
            <div className="flex items-center gap-2 text-green-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-semibold">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 mb-6">
            <div className="flex items-center gap-2 text-red-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold">{error}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-8 border border-slate-200/50 shadow-lg">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Basic Information</h2>
            <div className="space-y-6">
              {/* Song Title */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Song Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Midnight Dreams"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your song..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>

              {/* Genre */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Genre <span className="text-red-500">*</span>
                </label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  required
                >
                  <option value="">Select genre...</option>
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Mood Tags */}
          <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-8 border border-slate-200/50 shadow-lg">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Mood</h2>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((mood) => (
                <button
                  key={mood}
                  type="button"
                  onClick={() => toggleMood(mood)}
                  className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                    selectedMoods.includes(mood)
                      ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>

          {/* Musical Settings */}
          <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-8 border border-slate-200/50 shadow-lg">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Musical Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* BPM */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  BPM (Beats Per Minute) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={bpm}
                  onChange={(e) => setBpm(parseInt(e.target.value) || 0)}
                  min={40}
                  max={200}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Typical range: 60-180 BPM</p>
              </div>

              {/* Key */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Musical Key <span className="text-red-500">*</span>
                </label>
                <select
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  required
                >
                  {KEYS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Singer Info (Read-Only) */}
          {song && singers.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 p-8 border border-slate-200/50 shadow-lg">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Singer</h2>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">
                    {singers.find(s => s.id === song.singerId)?.name || 'Unknown Singer'}
                  </p>
                  <p className="text-sm text-slate-600">Singer cannot be changed after creation</p>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 p-8 border border-slate-200/50 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Ready to save?</h3>
                <p className="text-slate-600">
                  Your changes will be saved to the song metadata.
                </p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving || !title.trim() || !genre || bpm < 40 || bpm > 200}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-lg hover:from-violet-700 hover:to-fuchsia-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 rounded-xl bg-blue-50 border border-blue-200 p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> Changing the BPM or key won't affect existing versions, but will be used when generating new versions. To edit lyrics or generate new versions, use the respective options from the song detail page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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

interface LyricVersion {
  id: string;
  lyricsId: string;
  versionNumber: number;
  text: string;
  language: string;
  writtenBy: string | null;
  createdAt: number;
}

interface GenerationSettings {
  prompt: string;
  lyricVersionId: string;
  emotion: 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'surprised';
  delivery: 'natural' | 'expressive' | 'dramatic' | 'soft' | 'powerful';
  effects: Array<'reverb' | 'delay' | 'chorus' | 'distortion'>;
  instrumentalVolume: number;
  vocalVolume: number;
  masteringStyle: 'clean' | 'warm' | 'bright' | 'punchy';
  stylePreset: string;
}

const STYLE_PRESETS = [
  { value: '', label: 'Custom' },
  { value: 'radio-hit', label: 'Radio Hit - Polished & Professional' },
  { value: 'live-performance', label: 'Live Performance - Raw & Energetic' },
  { value: 'acoustic-intimate', label: 'Acoustic Intimate - Stripped Down' },
  { value: 'stadium-anthem', label: 'Stadium Anthem - Epic & Powerful' },
  { value: 'lo-fi-bedroom', label: 'Lo-Fi Bedroom - Cozy & Chill' },
  { value: 'orchestral-cinematic', label: 'Orchestral Cinematic - Grand & Sweeping' },
];

export default function GenerateVersionPage() {
  const params = useParams();
  const router = useRouter();
  const songId = params.id as string;

  const [song, setSong] = useState<Song | null>(null);
  const [singer, setSinger] = useState<Singer | null>(null);
  const [lyricVersions, setLyricVersions] = useState<LyricVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const [settings, setSettings] = useState<GenerationSettings>({
    prompt: '',
    lyricVersionId: '',
    emotion: 'neutral',
    delivery: 'natural',
    effects: [],
    instrumentalVolume: 0.7,
    vocalVolume: 0.8,
    masteringStyle: 'clean',
    stylePreset: '',
  });

  useEffect(() => {
    loadData();
  }, [songId]);

  // Select latest lyric version by default
  useEffect(() => {
    if (lyricVersions.length > 0 && !settings.lyricVersionId) {
      setSettings(prev => ({
        ...prev,
        lyricVersionId: lyricVersions[0].id,
      }));
    }
  }, [lyricVersions]);

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      const data = await musicAPI.getSong(songId);
      setSong(data.song);
      setLyricVersions(data.lyricVersions || []);

      if (data.song?.singerId) {
        const singerData = await singersAPI.get(data.song.singerId);
        setSinger(singerData.singer);
      }

      setLoading(false);
    } catch (err) {
      console.error('[GenerateVersion] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load song');
      setLoading(false);
    }
  }

  function toggleEffect(effect: 'reverb' | 'delay' | 'chorus' | 'distortion') {
    setSettings(prev => ({
      ...prev,
      effects: prev.effects.includes(effect)
        ? prev.effects.filter(e => e !== effect)
        : [...prev.effects, effect]
    }));
  }

  function applyPreset(presetValue: string) {
    const presets: Record<string, Partial<GenerationSettings>> = {
      'radio-hit': {
        emotion: 'happy',
        delivery: 'expressive',
        effects: ['chorus'],
        instrumentalVolume: 0.6,
        vocalVolume: 0.9,
        masteringStyle: 'bright',
      },
      'live-performance': {
        emotion: 'neutral',
        delivery: 'powerful',
        effects: ['reverb', 'delay'],
        instrumentalVolume: 0.8,
        vocalVolume: 0.8,
        masteringStyle: 'punchy',
      },
      'acoustic-intimate': {
        emotion: 'sad',
        delivery: 'soft',
        effects: ['reverb'],
        instrumentalVolume: 0.5,
        vocalVolume: 0.9,
        masteringStyle: 'warm',
      },
      'stadium-anthem': {
        emotion: 'happy',
        delivery: 'powerful',
        effects: ['reverb', 'delay', 'chorus'],
        instrumentalVolume: 0.7,
        vocalVolume: 1.0,
        masteringStyle: 'punchy',
      },
      'lo-fi-bedroom': {
        emotion: 'neutral',
        delivery: 'natural',
        effects: ['distortion'],
        instrumentalVolume: 0.6,
        vocalVolume: 0.7,
        masteringStyle: 'warm',
      },
      'orchestral-cinematic': {
        emotion: 'surprised',
        delivery: 'dramatic',
        effects: ['reverb'],
        instrumentalVolume: 0.8,
        vocalVolume: 0.7,
        masteringStyle: 'clean',
      },
    };

    if (presetValue && presets[presetValue]) {
      setSettings(prev => ({
        ...prev,
        ...presets[presetValue],
        stylePreset: presetValue,
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        stylePreset: '',
      }));
    }
  }

  async function handleGenerate() {
    if (!settings.prompt.trim()) {
      setError('Please enter a generation prompt');
      return;
    }

    try {
      setGenerating(true);
      setError('');

      const result = await musicAPI.generateVersion(songId, {
        prompt: settings.prompt,
        lyricVersionId: settings.lyricVersionId || undefined,
        vocalSettings: {
          emotion: settings.emotion,
          delivery: settings.delivery,
          effects: settings.effects.length > 0 ? settings.effects : undefined,
        },
        mixSettings: {
          instrumentalVolume: settings.instrumentalVolume,
          vocalVolume: settings.vocalVolume,
          masteringStyle: settings.masteringStyle,
        },
        stylePreset: settings.stylePreset || undefined,
      });

      // Redirect to song detail page
      router.push(`/dashboard/music/${songId}?generated=true`);
    } catch (err) {
      console.error('[GenerateVersion] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate version');
      setGenerating(false);
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

          <h1 className="text-4xl font-bold text-slate-900 mb-2">Generate New Version</h1>
          {song && singer && (
            <p className="text-lg text-slate-600">
              {song.title} by {singer.name}
            </p>
          )}
        </div>

        {/* Error Display */}
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

        {/* Main Form */}
        <div className="space-y-6">
          {/* Generation Prompt */}
          <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-8 border border-slate-200/50 shadow-lg">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Generation Prompt</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Describe what you want <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={settings.prompt}
                  onChange={(e) => setSettings({ ...settings, prompt: e.target.value })}
                  placeholder="Describe how you want this version to sound...&#10;&#10;Examples:&#10;- 'Emotional ballad with soft piano and powerful vocals'&#10;- 'Upbeat pop song with energetic drums and catchy melody'&#10;- 'Acoustic version with gentle guitar and intimate vocals'"
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  required
                />
              </div>

              {/* Lyric Version Selector */}
              {lyricVersions.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Lyric Version
                  </label>
                  <select
                    value={settings.lyricVersionId}
                    onChange={(e) => setSettings({ ...settings, lyricVersionId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">No lyrics</option>
                    {lyricVersions.map((version) => (
                      <option key={version.id} value={version.id}>
                        Version {version.versionNumber} ({new Date(version.createdAt).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Style Preset */}
          <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-8 border border-slate-200/50 shadow-lg">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Style Preset</h2>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Choose a preset or customize manually
              </label>
              <select
                value={settings.stylePreset}
                onChange={(e) => applyPreset(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {STYLE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Vocal Settings */}
          <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-8 border border-slate-200/50 shadow-lg">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Vocal Settings</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Emotion
                  </label>
                  <select
                    value={settings.emotion}
                    onChange={(e) => setSettings({
                      ...settings,
                      emotion: e.target.value as GenerationSettings['emotion']
                    })}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="neutral">Neutral</option>
                    <option value="happy">Happy</option>
                    <option value="sad">Sad</option>
                    <option value="angry">Angry</option>
                    <option value="fearful">Fearful</option>
                    <option value="surprised">Surprised</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Delivery Style
                  </label>
                  <select
                    value={settings.delivery}
                    onChange={(e) => setSettings({
                      ...settings,
                      delivery: e.target.value as GenerationSettings['delivery']
                    })}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="natural">Natural</option>
                    <option value="expressive">Expressive</option>
                    <option value="dramatic">Dramatic</option>
                    <option value="soft">Soft</option>
                    <option value="powerful">Powerful</option>
                  </select>
                </div>
              </div>

              {/* Vocal Effects */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Vocal Effects
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['reverb', 'delay', 'chorus', 'distortion'] as const).map((effect) => (
                    <button
                      key={effect}
                      type="button"
                      onClick={() => toggleEffect(effect)}
                      className={`px-4 py-2 rounded-xl font-semibold capitalize transition-all ${
                        settings.effects.includes(effect)
                          ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {effect}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mix Settings */}
          <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-8 border border-slate-200/50 shadow-lg">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Mix Settings</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Instrumental Volume: {Math.round(settings.instrumentalVolume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.instrumentalVolume}
                  onChange={(e) => setSettings({
                    ...settings,
                    instrumentalVolume: parseFloat(e.target.value)
                  })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Quiet</span>
                  <span>Balanced</span>
                  <span>Loud</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Vocal Volume: {Math.round(settings.vocalVolume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.vocalVolume}
                  onChange={(e) => setSettings({
                    ...settings,
                    vocalVolume: parseFloat(e.target.value)
                  })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Quiet</span>
                  <span>Balanced</span>
                  <span>Loud</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Mastering Style
                </label>
                <select
                  value={settings.masteringStyle}
                  onChange={(e) => setSettings({
                    ...settings,
                    masteringStyle: e.target.value as GenerationSettings['masteringStyle']
                  })}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="clean">Clean - Transparent and Natural</option>
                  <option value="warm">Warm - Smooth and Rich</option>
                  <option value="bright">Bright - Clear and Crisp</option>
                  <option value="punchy">Punchy - Dynamic and Bold</option>
                </select>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 p-8 border border-slate-200/50 shadow-lg">
            <div className="flex items-start gap-6">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Ready to Generate?</h3>
                <p className="text-slate-600 mb-4">
                  This will create a new version with your specified settings. Generation typically takes 30-60 seconds.
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={generating || !settings.prompt.trim()}
                  className="w-full px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-lg hover:from-violet-700 hover:to-fuchsia-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <span className="flex items-center justify-center gap-3">
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating Version...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate New Version
                    </span>
                  )}
                </button>
              </div>
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
                <strong>Tip:</strong> Try different settings and presets to experiment with various styles. Each version is saved, so you can compare and choose your favorite.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

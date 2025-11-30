'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { musicAPI, singersAPI } from '@/lib/api-client';

interface Singer {
  id: string;
  name: string;
  description: string | null;
}

type Step = 'basics' | 'lyrics' | 'structure' | 'generate';

interface SongData {
  singerId: string;
  title: string;
  description: string;
  genre: string;
  mood: string[];
  bpm: number;
  key: string;
}

interface LyricsData {
  text: string;
  language: string;
  writtenBy: string;
}

interface Section {
  type: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'pre-chorus' | 'post-chorus';
  name: string;
  order: number;
  text: string;
}

interface GenerationSettings {
  prompt: string;
  emotion: 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'surprised';
  delivery: 'natural' | 'expressive' | 'dramatic' | 'soft' | 'powerful';
  instrumentalVolume: number;
  vocalVolume: number;
  masteringStyle: 'clean' | 'warm' | 'bright' | 'punchy';
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

const SECTION_TYPES = [
  { value: 'intro', label: 'Intro' },
  { value: 'verse', label: 'Verse' },
  { value: 'pre-chorus', label: 'Pre-Chorus' },
  { value: 'chorus', label: 'Chorus' },
  { value: 'post-chorus', label: 'Post-Chorus' },
  { value: 'bridge', label: 'Bridge' },
  { value: 'outro', label: 'Outro' },
];

export default function CreateSongPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('basics');
  const [singers, setSingers] = useState<Singer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Song Basics
  const [songData, setSongData] = useState<SongData>({
    singerId: '',
    title: '',
    description: '',
    genre: '',
    mood: [],
    bpm: 120,
    key: 'C major',
  });

  // Step 2: Lyrics
  const [lyricsData, setLyricsData] = useState<LyricsData>({
    text: '',
    language: 'en',
    writtenBy: '',
  });

  // Step 3: Structure
  const [sections, setSections] = useState<Section[]>([
    { type: 'intro', name: 'Intro', order: 0, text: '' },
    { type: 'verse', name: 'Verse 1', order: 1, text: '' },
    { type: 'chorus', name: 'Chorus', order: 2, text: '' },
  ]);

  // Step 4: Generation
  const [generationSettings, setGenerationSettings] = useState<GenerationSettings>({
    prompt: '',
    emotion: 'neutral',
    delivery: 'natural',
    instrumentalVolume: 0.7,
    vocalVolume: 0.8,
    masteringStyle: 'clean',
  });

  const [createdSongId, setCreatedSongId] = useState<string | null>(null);

  useEffect(() => {
    loadSingers();
  }, []);

  async function loadSingers() {
    try {
      const data = await singersAPI.list();
      setSingers(data.singers || []);
    } catch (err) {
      console.error('[CreateSong] Load singers error:', err);
    }
  }

  function toggleMood(mood: string) {
    setSongData(prev => ({
      ...prev,
      mood: prev.mood.includes(mood)
        ? prev.mood.filter(m => m !== mood)
        : [...prev.mood, mood]
    }));
  }

  function addSection() {
    const newSection: Section = {
      type: 'verse',
      name: `Verse ${sections.filter(s => s.type === 'verse').length + 1}`,
      order: sections.length,
      text: '',
    };
    setSections([...sections, newSection]);
  }

  function removeSection(index: number) {
    setSections(sections.filter((_, i) => i !== index));
  }

  function updateSection(index: number, updates: Partial<Section>) {
    setSections(sections.map((section, i) =>
      i === index ? { ...section, ...updates } : section
    ));
  }

  function moveSection(index: number, direction: 'up' | 'down') {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sections.length - 1)
    ) {
      return;
    }

    const newSections = [...sections];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newSections[index], newSections[swapIndex]] = [newSections[swapIndex], newSections[index]];

    // Update order numbers
    newSections.forEach((section, i) => {
      section.order = i;
    });

    setSections(newSections);
  }

  async function handleCreateSong() {
    try {
      setLoading(true);
      setError('');

      // Step 1: Create song
      const { song } = await musicAPI.createSong({
        singerId: songData.singerId,
        title: songData.title,
        description: songData.description || undefined,
        genre: songData.genre || undefined,
        mood: songData.mood,
        bpm: songData.bpm,
        key: songData.key,
      });

      setCreatedSongId(song.id);

      // Step 2: Add lyrics (if provided)
      if (lyricsData.text.trim()) {
        const sectionsWithText = sections.map(s => ({
          type: s.type,
          name: s.name,
          text: s.text,
          order: s.order,
        }));

        await musicAPI.updateLyrics(song.id, {
          text: lyricsData.text,
          sections: sectionsWithText,
          language: lyricsData.language,
          writtenBy: lyricsData.writtenBy || undefined,
        });
      }

      // Step 3: Define structure (if sections provided)
      if (sections.length > 0) {
        await musicAPI.updateStructure(song.id, {
          structure: sections.map(s => ({
            type: s.type,
            name: s.name,
            order: s.order,
          })),
        });
      }

      // Step 4: Generate first version (if prompt provided)
      if (generationSettings.prompt.trim()) {
        await musicAPI.generateVersion(song.id, {
          prompt: generationSettings.prompt,
          vocalSettings: {
            emotion: generationSettings.emotion,
            delivery: generationSettings.delivery,
          },
          mixSettings: {
            instrumentalVolume: generationSettings.instrumentalVolume,
            vocalVolume: generationSettings.vocalVolume,
            masteringStyle: generationSettings.masteringStyle,
          },
        });
      }

      // Redirect to song detail page
      router.push(`/dashboard/music/${song.id}`);
    } catch (err) {
      console.error('[CreateSong] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create song');
      setLoading(false);
    }
  }

  function canProceed() {
    if (step === 'basics') {
      return songData.singerId && songData.title.trim() && songData.genre && songData.bpm > 0;
    }
    return true; // Other steps are optional
  }

  const stepTitles = {
    basics: 'Song Basics',
    lyrics: 'Write Lyrics',
    structure: 'Define Structure',
    generate: 'Generate Audio',
  };

  const steps: Step[] = ['basics', 'lyrics', 'structure', 'generate'];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/music')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Back to Music</span>
          </button>

          <h1 className="text-4xl font-bold text-slate-900 mb-2">Create New Song</h1>
          <p className="text-lg text-slate-600">
            Follow the steps to create and generate your song
          </p>
        </div>

        {/* Progress Steps */}
        <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-6 border border-slate-200/50 shadow-lg mb-6">
          <div className="flex items-center justify-between">
            {steps.map((s, index) => (
              <div key={s} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                      index <= currentStepIndex
                        ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {index < currentStepIndex ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <p className={`text-sm font-semibold mt-2 ${
                    index <= currentStepIndex ? 'text-slate-900' : 'text-slate-500'
                  }`}>
                    {stepTitles[s]}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-1 flex-1 mx-2 rounded-full transition-all ${
                    index < currentStepIndex ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
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

        {/* Step Content */}
        <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-8 border border-slate-200/50 shadow-lg">
          {/* Step 1: Song Basics */}
          {step === 'basics' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Song Basics</h2>

              {/* Singer Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Select Singer <span className="text-red-500">*</span>
                </label>
                <select
                  value={songData.singerId}
                  onChange={(e) => setSongData({ ...songData, singerId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  required
                >
                  <option value="">Choose a singer...</option>
                  {singers.map((singer) => (
                    <option key={singer.id} value={singer.id}>
                      {singer.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Song Title */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Song Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={songData.title}
                  onChange={(e) => setSongData({ ...songData, title: e.target.value })}
                  placeholder="e.g., Midnight Dreams"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={songData.description}
                  onChange={(e) => setSongData({ ...songData, description: e.target.value })}
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
                  value={songData.genre}
                  onChange={(e) => setSongData({ ...songData, genre: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  required
                >
                  <option value="">Select genre...</option>
                  {GENRES.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mood Tags */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Mood (Select multiple)
                </label>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map((mood) => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => toggleMood(mood)}
                      className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                        songData.mood.includes(mood)
                          ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              {/* BPM and Key */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    BPM <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={songData.bpm}
                    onChange={(e) => setSongData({ ...songData, bpm: parseInt(e.target.value) || 0 })}
                    min={40}
                    max={200}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Typical: 60-180 BPM</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Key <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={songData.key}
                    onChange={(e) => setSongData({ ...songData, key: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    required
                  >
                    {KEYS.map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Lyrics */}
          {step === 'lyrics' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Write Lyrics</h2>
                  <p className="text-slate-600 mt-1">Add lyrics for your song (optional - can be added later)</p>
                </div>
              </div>

              {/* Lyrics Text */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Lyrics
                </label>
                <textarea
                  value={lyricsData.text}
                  onChange={(e) => setLyricsData({ ...lyricsData, text: e.target.value })}
                  placeholder="Write your lyrics here...&#10;&#10;Verse 1:&#10;[Your lyrics]&#10;&#10;Chorus:&#10;[Your lyrics]"
                  rows={15}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none font-mono"
                />
              </div>

              {/* Language and Writer */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Language
                  </label>
                  <select
                    value={lyricsData.language}
                    onChange={(e) => setLyricsData({ ...lyricsData, language: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Written By (Optional)
                  </label>
                  <input
                    type="text"
                    value={lyricsData.writtenBy}
                    onChange={(e) => setLyricsData({ ...lyricsData, writtenBy: e.target.value })}
                    placeholder="Your name"
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Structure */}
          {step === 'structure' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Define Structure</h2>
                  <p className="text-slate-600 mt-1">Organize your song structure (optional)</p>
                </div>
                <button
                  onClick={addSection}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold hover:from-violet-700 hover:to-fuchsia-700 transition-all"
                >
                  + Add Section
                </button>
              </div>

              <div className="space-y-3">
                {sections.map((section, index) => (
                  <div
                    key={index}
                    className="rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4 border border-slate-200/50"
                  >
                    <div className="flex items-start gap-4">
                      {/* Order Controls */}
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveSection(index, 'up')}
                          disabled={index === 0}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          ↑
                        </button>
                        <span className="w-8 h-8 rounded-lg bg-violet-600 text-white font-bold flex items-center justify-center text-sm">
                          {index + 1}
                        </span>
                        <button
                          onClick={() => moveSection(index, 'down')}
                          disabled={index === sections.length - 1}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          ↓
                        </button>
                      </div>

                      {/* Section Content */}
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Type
                            </label>
                            <select
                              value={section.type}
                              onChange={(e) => updateSection(index, {
                                type: e.target.value as Section['type']
                              })}
                              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                            >
                              {SECTION_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              value={section.name}
                              onChange={(e) => updateSection(index, { name: e.target.value })}
                              placeholder="e.g., Verse 1"
                              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Lyrics for this section (optional)
                          </label>
                          <textarea
                            value={section.text}
                            onChange={(e) => updateSection(index, { text: e.target.value })}
                            placeholder="Enter lyrics for this section..."
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none font-mono"
                          />
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => removeSection(index)}
                        className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-all"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Generate */}
          {step === 'generate' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Generate Audio</h2>
                <p className="text-slate-600 mt-1">Configure generation settings (optional - can generate later)</p>
              </div>

              {/* Generation Prompt */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Generation Prompt
                </label>
                <textarea
                  value={generationSettings.prompt}
                  onChange={(e) => setGenerationSettings({ ...generationSettings, prompt: e.target.value })}
                  placeholder="Describe how you want the song to sound...&#10;e.g., 'Emotional ballad with soft piano and powerful vocals'"
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>

              {/* Vocal Settings */}
              <div className="rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 p-6 border border-slate-200/50">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Vocal Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Emotion
                    </label>
                    <select
                      value={generationSettings.emotion}
                      onChange={(e) => setGenerationSettings({
                        ...generationSettings,
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
                      Delivery
                    </label>
                    <select
                      value={generationSettings.delivery}
                      onChange={(e) => setGenerationSettings({
                        ...generationSettings,
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
              </div>

              {/* Mix Settings */}
              <div className="rounded-xl bg-gradient-to-br from-violet-50 to-fuchsia-50 p-6 border border-slate-200/50">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Mix Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Instrumental Volume: {Math.round(generationSettings.instrumentalVolume * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={generationSettings.instrumentalVolume}
                      onChange={(e) => setGenerationSettings({
                        ...generationSettings,
                        instrumentalVolume: parseFloat(e.target.value)
                      })}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Vocal Volume: {Math.round(generationSettings.vocalVolume * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={generationSettings.vocalVolume}
                      onChange={(e) => setGenerationSettings({
                        ...generationSettings,
                        vocalVolume: parseFloat(e.target.value)
                      })}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Mastering Style
                    </label>
                    <select
                      value={generationSettings.masteringStyle}
                      onChange={(e) => setGenerationSettings({
                        ...generationSettings,
                        masteringStyle: e.target.value as GenerationSettings['masteringStyle']
                      })}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="clean">Clean</option>
                      <option value="warm">Warm</option>
                      <option value="bright">Bright</option>
                      <option value="punchy">Punchy</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-8 border-t border-slate-200/50">
            {currentStepIndex > 0 ? (
              <button
                onClick={() => setStep(steps[currentStepIndex - 1])}
                className="px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-all"
              >
                ← Previous
              </button>
            ) : (
              <div />
            )}

            {currentStepIndex < steps.length - 1 ? (
              <button
                onClick={() => setStep(steps[currentStepIndex + 1])}
                disabled={!canProceed()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold hover:from-violet-700 hover:to-fuchsia-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleCreateSong}
                disabled={loading || !canProceed()}
                className="px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-lg hover:from-violet-700 hover:to-fuchsia-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Song...
                  </span>
                ) : (
                  'Create Song'
                )}
              </button>
            )}
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
                <strong>Tip:</strong> You can skip optional steps and add details later. Only the basics (singer, title, genre, BPM, key) are required to create a song.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

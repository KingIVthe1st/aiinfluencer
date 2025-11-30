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

interface Section {
  type: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'pre-chorus' | 'post-chorus';
  name: string;
  text: string;
  order: number;
}

const SECTION_TYPES = [
  { value: 'intro', label: 'Intro', color: 'violet' },
  { value: 'verse', label: 'Verse', color: 'blue' },
  { value: 'pre-chorus', label: 'Pre-Chorus', color: 'cyan' },
  { value: 'chorus', label: 'Chorus', color: 'fuchsia' },
  { value: 'post-chorus', label: 'Post-Chorus', color: 'pink' },
  { value: 'bridge', label: 'Bridge', color: 'amber' },
  { value: 'outro', label: 'Outro', color: 'slate' },
];

export default function EditLyricsPage() {
  const params = useParams();
  const router = useRouter();
  const songId = params.id as string;

  const [song, setSong] = useState<Song | null>(null);
  const [singer, setSinger] = useState<Singer | null>(null);
  const [lyricVersions, setLyricVersions] = useState<LyricVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [editMode, setEditMode] = useState<'full' | 'sections'>('full');
  const [lyricsText, setLyricsText] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [language, setLanguage] = useState('en');
  const [writtenBy, setWrittenBy] = useState('');

  useEffect(() => {
    loadData();
  }, [songId]);

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

      // Load latest lyrics if available
      if (data.lyricVersions && data.lyricVersions.length > 0) {
        const latest = data.lyricVersions[0];
        setLyricsText(latest.text);
        setLanguage(latest.language);
        setWrittenBy(latest.writtenBy || '');
      }

      // Load sections if available
      if (data.sections && data.sections.length > 0) {
        setSections(
          data.sections.map((s: any) => ({
            type: s.type,
            name: s.name || s.type,
            text: s.text || '',
            order: s.order,
          }))
        );
      } else {
        // Initialize with basic structure
        setSections([
          { type: 'verse', name: 'Verse 1', text: '', order: 0 },
          { type: 'chorus', name: 'Chorus', text: '', order: 1 },
          { type: 'verse', name: 'Verse 2', text: '', order: 2 },
          { type: 'chorus', name: 'Chorus', text: '', order: 3 },
        ]);
      }

      setLoading(false);
    } catch (err) {
      console.error('[EditLyrics] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load song');
      setLoading(false);
    }
  }

  function addSection() {
    const newSection: Section = {
      type: 'verse',
      name: `Verse ${sections.filter(s => s.type === 'verse').length + 1}`,
      text: '',
      order: sections.length,
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

  function getSectionColor(type: string) {
    const section = SECTION_TYPES.find(s => s.value === type);
    return section?.color || 'slate';
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      const payload: any = {
        text: lyricsText,
        language,
        writtenBy: writtenBy || undefined,
      };

      // If using sections mode and sections have text, include them
      if (editMode === 'sections' && sections.some(s => s.text.trim())) {
        payload.sections = sections.map(s => ({
          type: s.type,
          name: s.name,
          text: s.text,
          order: s.order,
        }));
      }

      await musicAPI.updateLyrics(songId, payload);

      setSuccessMessage('Lyrics saved successfully!');
      setTimeout(() => {
        router.push(`/dashboard/music/${songId}`);
      }, 1500);
    } catch (err) {
      console.error('[EditLyrics] Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save lyrics');
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
      <div className="max-w-6xl mx-auto">
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

          <h1 className="text-4xl font-bold text-slate-900 mb-2">Edit Lyrics</h1>
          {song && singer && (
            <p className="text-lg text-slate-600">
              {song.title} by {singer.name}
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

        {/* Edit Mode Toggle */}
        <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-6 border border-slate-200/50 shadow-lg mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Editing Mode</h2>
              <p className="text-sm text-slate-600">Choose how you want to edit your lyrics</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setEditMode('full')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  editMode === 'full'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Full Text
              </button>
              <button
                onClick={() => setEditMode('sections')}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  editMode === 'sections'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                By Section
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Editor */}
          <div className="lg:col-span-2 space-y-6">
            {editMode === 'full' ? (
              /* Full Text Editor */
              <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-8 border border-slate-200/50 shadow-lg">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Full Lyrics</h2>
                <textarea
                  value={lyricsText}
                  onChange={(e) => setLyricsText(e.target.value)}
                  placeholder="Write your lyrics here...&#10;&#10;Verse 1:&#10;[Your lyrics]&#10;&#10;Chorus:&#10;[Your lyrics]&#10;&#10;Verse 2:&#10;[Your lyrics]"
                  rows={20}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none font-mono leading-relaxed"
                />
                <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
                  <span>{lyricsText.split('\n').length} lines</span>
                  <span>{lyricsText.split(' ').filter(w => w.length > 0).length} words</span>
                </div>
              </div>
            ) : (
              /* Section Editor */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">Edit by Section</h2>
                  <button
                    onClick={addSection}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold hover:from-violet-700 hover:to-fuchsia-700 transition-all"
                  >
                    + Add Section
                  </button>
                </div>

                {sections.map((section, index) => (
                  <div
                    key={index}
                    className="rounded-2xl bg-white/70 backdrop-blur-xl p-6 border border-slate-200/50 shadow-lg"
                  >
                    <div className="flex items-start gap-4">
                      {/* Order Controls */}
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveSection(index, 'up')}
                          disabled={index === 0}
                          className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          ↑
                        </button>
                        <span className={`w-8 h-8 rounded-lg bg-${getSectionColor(section.type)}-600 text-white font-bold flex items-center justify-center text-sm`}>
                          {index + 1}
                        </span>
                        <button
                          onClick={() => moveSection(index, 'down')}
                          disabled={index === sections.length - 1}
                          className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
                            Lyrics
                          </label>
                          <textarea
                            value={section.text}
                            onChange={(e) => updateSection(index, { text: e.target.value })}
                            placeholder="Enter lyrics for this section..."
                            rows={6}
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
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Metadata */}
            <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-6 border border-slate-200/50 shadow-lg">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Metadata</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                    Written By
                  </label>
                  <input
                    type="text"
                    value={writtenBy}
                    onChange={(e) => setWrittenBy(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
            </div>

            {/* Version History */}
            {lyricVersions.length > 0 && (
              <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-6 border border-slate-200/50 shadow-lg">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Version History</h3>
                <div className="space-y-2">
                  {lyricVersions.slice(0, 5).map((version) => (
                    <div
                      key={version.id}
                      className="p-3 rounded-lg bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-slate-200/50"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-900 text-sm">
                          Version {version.versionNumber}
                        </span>
                        <button
                          onClick={() => setLyricsText(version.text)}
                          className="text-xs text-violet-600 hover:text-violet-700 font-semibold"
                        >
                          Load
                        </button>
                      </div>
                      <p className="text-xs text-slate-600">
                        {new Date(version.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 p-6 border border-slate-200/50 shadow-lg">
              <button
                onClick={handleSave}
                disabled={saving || !lyricsText.trim()}
                className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold hover:from-violet-700 hover:to-fuchsia-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  'Save Lyrics'
                )}
              </button>
              <p className="text-xs text-slate-600 mt-3 text-center">
                This will create a new lyric version
              </p>
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
                <strong>Tip:</strong> Use "Full Text" mode for free-form writing, or "By Section" mode to organize your lyrics into structured parts. Both approaches save version history for easy comparison.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { Music, Sparkles, Loader2, CheckCircle, AlertCircle, Volume2, Pause, Play, User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { singersAPI } from '@/lib/api-client';
import {
  MotionProvider,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Textarea,
  Input,
  Label,
  Heading,
  Text,
  GradientText,
  FadeIn,
  ScaleIn,
  Stagger,
  GradientShift,
} from '@/components/ui';
import {
  PremiumCard,
  LoadingSkeleton,
  EmptyState,
} from '@/components/premium';

interface Singer {
  id: string;
  name: string;
  description?: string;
  genre?: string;
  voiceId?: string;
  profileImageUrl?: string;
  imageUrl?: string;
  createdAt?: number;
  updatedAt?: number;
}

type GenerationMode = 'song' | 'speech' | 'lyrics' | 'instrumental';

export default function GenerateSongPage() {
  // Singer data
  const [singers, setSingers] = useState<Singer[]>([]);
  const [loadingSingers, setLoadingSingers] = useState(true);
  const [singersError, setSingersError] = useState<string | null>(null);

  // Form state
  const [selectedSingerId, setSelectedSingerId] = useState<string | null>(null);
  const [mode, setMode] = useState<GenerationMode>('song');
  const [songName, setSongName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('');
  const [duration, setDuration] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<'pending' | 'processing' | 'completed' | 'failed' | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load singers on mount
  useEffect(() => {
    loadSingers();
  }, []);

  async function loadSingers() {
    try {
      setLoadingSingers(true);
      const data = await singersAPI.list();
      setSingers(data.singers || []);
      setSingersError(null);
    } catch (err) {
      console.error('[Generate Song] Error loading singers:', err);
      setSingersError(err instanceof Error ? err.message : 'Failed to load singers');
      setSingers([]);
    } finally {
      setLoadingSingers(false);
    }
  }

  // Poll job status with simulated progress
  useEffect(() => {
    if (!jobId) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
    const token = localStorage.getItem('token') || 'test-token-demo-user';

    const startTime = Date.now();
    const expectedDuration = 45000; // 45 seconds for audio
    let simulatedProgress = 0;

    const pollJob = async () => {
      try {
        // Calculate simulated progress (smooth 0% -> 90% over expected duration)
        const elapsed = Date.now() - startTime;
        simulatedProgress = Math.min(90, Math.floor((elapsed / expectedDuration) * 90));

        const response = await fetch(`${apiUrl}/api/jobs/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          console.error('Failed to fetch job status');
          return;
        }

        const data = await response.json();
        const job = data.job; // API returns { job: {...} }

        setJobStatus(job.status);

        if (job.status === 'completed' && job.assetUrl) {
          setProgress(100);
          setProgressMessage('Audio generated successfully!');
          await new Promise(resolve => setTimeout(resolve, 500));
          setAudioUrl(job.assetUrl);
          setIsGenerating(false);
        } else if (job.status === 'failed') {
          setError(job.error || 'Generation failed');
          setProgress(0);
          setProgressMessage('');
          setIsGenerating(false);
        } else {
          // Use simulated progress for better UX
          const displayProgress = Math.max(simulatedProgress, job.progress || 0);
          setProgress(displayProgress);
          setProgressMessage(`Generating audio... ${displayProgress}%`);
        }
      } catch (err) {
        console.error('Error polling job:', err);
      }
    };

    // Poll immediately
    setProgressMessage('Initializing audio generation...');
    pollJob();

    // Poll every 2 seconds until completed or failed
    const interval = setInterval(pollJob, 2000);

    return () => clearInterval(interval);
  }, [jobId]);

  // Audio player controls
  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSingerId) {
      setError('Please select a singer');
      return;
    }

    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    if (mode === 'lyrics' && !lyrics.trim()) {
      setError('Please enter lyrics for lyrics mode');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setJobId(null);
    setJobStatus(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setProgress(0);
    setProgressMessage('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
      const token = localStorage.getItem('token') || 'test-token-demo-user';

      const response = await fetch(`${apiUrl}/api/generate/audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          singerId: selectedSingerId,
          prompt: prompt,
          durationSeconds: duration,
          mode: mode,
          songName: songName.trim() || undefined,
          lyrics: lyrics || undefined,
          genre: genre || undefined,
          mood: mood || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate audio');
      }

      setJobId(data.jobId);
    } catch (err) {
      console.error('Error generating audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate audio');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <MotionProvider>
      <div className="min-h-screen bg-background relative overflow-hidden py-8 px-4">
        {/* Animated gradient background */}
        <GradientShift className="absolute inset-0 opacity-30" />

        <div className="max-w-4xl mx-auto relative z-10">
          <FadeIn>
            {/* Back to Dashboard Button */}
            <Link href="/dashboard">
              <Button
                variant="ghost"
                className="mb-6 -ml-2 text-slate-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>

            <div className="mb-8">
              <Heading as="h1" className="mb-2">
                <GradientText>Generate Music & Audio</GradientText>
              </Heading>
              <Text size="lg" variant="muted">
                Create songs, speech, and audio with your AI singers
              </Text>
            </div>
          </FadeIn>

          <form onSubmit={handleGenerate} className="space-y-6">
            <Stagger staggerDelay={100} animation="scale">
              {/* Generation Mode Selection */}
              <Card variant="glass">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <CardTitle>Generation Mode</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button
                      type="button"
                      onClick={() => setMode('song')}
                      variant={mode === 'song' ? 'primary' : 'outline'}
                      className="h-auto p-4 flex-col items-start"
                    >
                      <Text weight="semibold" className="mb-1">Song</Text>
                      <Text size="sm" variant="muted">Full music track</Text>
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setMode('speech')}
                      variant={mode === 'speech' ? 'primary' : 'outline'}
                      className="h-auto p-4 flex-col items-start"
                    >
                      <Text weight="semibold" className="mb-1">Speech</Text>
                      <Text size="sm" variant="muted">Spoken words</Text>
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setMode('lyrics')}
                      variant={mode === 'lyrics' ? 'primary' : 'outline'}
                      className="h-auto p-4 flex-col items-start"
                    >
                      <Text weight="semibold" className="mb-1">Lyrics</Text>
                      <Text size="sm" variant="muted">Sing custom lyrics</Text>
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setMode('instrumental')}
                      variant={mode === 'instrumental' ? 'primary' : 'outline'}
                      className="h-auto p-4 flex-col items-start"
                    >
                      <Text weight="semibold" className="mb-1">Instrumental</Text>
                      <Text size="sm" variant="muted">Music only</Text>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Singer Selection */}
              <Card variant="glass">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    <CardTitle>Select Singer</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingSingers ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <LoadingSkeleton className="h-40" />
                      <LoadingSkeleton className="h-40" />
                      <LoadingSkeleton className="h-40" />
                    </div>
                  ) : singersError ? (
                    <EmptyState
                      icon={<AlertCircle className="w-12 h-12" />}
                      title="Failed to load singers"
                      description={singersError}
                      action={
                        <Button onClick={loadSingers} variant="outline">
                          Retry
                        </Button>
                      }
                    />
                  ) : singers.length === 0 ? (
                    <EmptyState
                      icon={<User className="w-12 h-12" />}
                      title="No singers yet"
                      description="Create your first AI singer to get started"
                      action={
                        <Button onClick={() => window.location.href = '/dashboard/singers'} variant="primary">
                          Create Singer
                        </Button>
                      }
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {singers.map((singer) => (
                        <PremiumCard
                          key={singer.id}
                          variant={selectedSingerId === singer.id ? 'gradient' : 'glass'}
                          hover
                          glow={selectedSingerId === singer.id}
                          padding="md"
                          className="cursor-pointer"
                          onClick={() => setSelectedSingerId(singer.id)}
                        >
                          {(singer.profileImageUrl || singer.imageUrl) && (
                            <img
                              src={singer.profileImageUrl || singer.imageUrl}
                              alt={singer.name}
                              className="w-full aspect-square object-contain rounded-lg mb-3 bg-slate-900/50"
                            />
                          )}
                          <Heading as="h4" className="text-white mb-1">{singer.name}</Heading>
                          {singer.genre && (
                            <Text size="sm" className="text-violet-300 mb-1">{singer.genre}</Text>
                          )}
                          {singer.description && (
                            <Text size="sm" className="text-slate-300 line-clamp-2">{singer.description}</Text>
                          )}
                        </PremiumCard>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Audio Details */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle>Audio Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label>Song Name (Optional)</Label>
                      <Input
                        type="text"
                        value={songName}
                        onChange={(e) => setSongName(e.target.value)}
                        placeholder="My Amazing Song"
                      />
                      <Text size="sm" variant="muted" className="mt-1">
                        Give your song a memorable name (will be auto-generated if left blank)
                      </Text>
                    </div>

                    <div>
                      <Label required>Prompt</Label>
                      <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={
                          mode === 'song' ? 'A beautiful pop ballad about summer...' :
                          mode === 'speech' ? 'An inspirational speech about dreams...' :
                          mode === 'lyrics' ? 'Describe the musical style and mood...' :
                          'An uplifting instrumental track...'
                        }
                        rows={3}
                        required
                      />
                    </div>

                    {/* Lyrics Input - Only for lyrics mode */}
                    {mode === 'lyrics' && (
                      <ScaleIn>
                        <div>
                          <Label required>Lyrics</Label>
                          <Textarea
                            value={lyrics}
                            onChange={(e) => setLyrics(e.target.value)}
                            placeholder="Enter your custom lyrics here..."
                            rows={6}
                            required
                          />
                        </div>
                      </ScaleIn>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Genre (Optional)</Label>
                        <Input
                          type="text"
                          value={genre}
                          onChange={(e) => setGenre(e.target.value)}
                          placeholder="Pop, Rock, Jazz, etc."
                        />
                      </div>

                      <div>
                        <Label>Mood (Optional)</Label>
                        <Input
                          type="text"
                          value={mood}
                          onChange={(e) => setMood(e.target.value)}
                          placeholder="Happy, Sad, Energetic, etc."
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Duration: {duration} seconds</Label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="5"
                          max="300"
                          step="5"
                          value={duration}
                          onChange={(e) => setDuration(Number(e.target.value))}
                          className="flex-1 h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <Text size="sm" variant="muted" className="min-w-[60px] text-right">
                          {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                        </Text>
                      </div>
                      <Text size="sm" variant="muted" className="mt-1">
                        Range: 5 seconds to 5 minutes
                      </Text>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Error Display */}
              {error && (
                <ScaleIn>
                  <Card variant="default" className="border-error-200 bg-error-50">
                    <CardContent className="p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <Text weight="semibold" className="text-error-900">Error</Text>
                        <Text size="sm" className="text-error-700">{error}</Text>
                      </div>
                    </CardContent>
                  </Card>
                </ScaleIn>
              )}

              {/* Progress Display */}
              {progressMessage && (
                <ScaleIn>
                  <PremiumCard variant="bordered" padding="md" className="border-primary-500/50 bg-primary-500/10">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-primary-400" />
                        </div>
                        <div className="flex-1">
                          <Text className="text-primary-200">{progressMessage}</Text>
                          {jobId && (
                            <Text size="xs" className="text-primary-300/60 mt-1">Job ID: {jobId}</Text>
                          )}
                        </div>
                      </div>
                      {/* Progress Bar */}
                      {progress > 0 && progress < 100 && (
                        <div className="w-full bg-slate-800/50 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary-500 to-purple-500 transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </PremiumCard>
                </ScaleIn>
              )}

              {/* Audio Player - When Completed */}
              {audioUrl && (
                <ScaleIn>
                  <Card variant="glass" className="border-success-200">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle className="w-6 h-6 text-success-600" />
                        <Text weight="semibold" size="lg" className="text-success-900">
                          Audio Generated Successfully!
                        </Text>
                      </div>

                      {/* Audio Player Controls */}
                      <div className="bg-gradient-to-r from-violet-500/10 to-blue-500/10 backdrop-blur-sm rounded-xl p-6 border border-primary-200/50">
                        <div className="flex items-center gap-4">
                          <Button
                            type="button"
                            onClick={togglePlayPause}
                            variant="primary"
                            size="lg"
                            className="rounded-full w-14 h-14 flex items-center justify-center"
                          >
                            {isPlaying ? (
                              <Pause className="w-6 h-6" />
                            ) : (
                              <Play className="w-6 h-6" />
                            )}
                          </Button>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Volume2 className="w-5 h-5 text-primary-600" />
                              <Text weight="semibold">
                                {mode === 'song' ? 'Song' : mode === 'speech' ? 'Speech' : mode === 'lyrics' ? 'Lyrics' : 'Instrumental'}
                              </Text>
                            </div>
                            <Text size="sm" variant="muted">
                              {prompt.length > 60 ? prompt.substring(0, 60) + '...' : prompt}
                            </Text>
                          </div>

                          <audio
                            ref={audioRef}
                            src={audioUrl}
                            onEnded={() => setIsPlaying(false)}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                          />
                        </div>

                        {/* Download Link */}
                        <div className="mt-4 pt-4 border-t border-primary-200/50">
                          <a
                            href={audioUrl}
                            download
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-2"
                          >
                            <Music className="w-4 h-4" />
                            Download Audio File
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </ScaleIn>
              )}

              {/* Generate Button */}
              <Button
                type="submit"
                disabled={isGenerating || !selectedSingerId || !prompt.trim()}
                loading={isGenerating}
                variant="primary"
                size="xl"
                fullWidth
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Music className="w-5 h-5" />
                    Generate {mode === 'song' ? 'Song' : mode === 'speech' ? 'Speech' : mode === 'lyrics' ? 'Lyrics' : 'Instrumental'}
                  </>
                )}
              </Button>
            </Stagger>
          </form>
        </div>
      </div>
    </MotionProvider>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { SongSelector } from '@/components/SongSelector';
import { MusicVideoPlayer } from '@/components/MusicVideoPlayer';
import { Music, Video, Loader2, CheckCircle, AlertCircle, User, Sparkles, ArrowLeft } from 'lucide-react';
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

export default function GenerateVideoPage() {
  // Singer data
  const [singers, setSingers] = useState<Singer[]>([]);
  const [loadingSingers, setLoadingSingers] = useState(true);
  const [singersError, setSingersError] = useState<string | null>(null);

  // Form state
  const [selectedSingerId, setSelectedSingerId] = useState<string | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [mode, setMode] = useState<'standard' | 'music-video'>('music-video');
  const [selectedProvider, setSelectedProvider] = useState<'veo3' | 'sora2' | 'kie-wan25'>('kie-wan25');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(5);
  const [chunkDuration, setChunkDuration] = useState<5 | 10>(5);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<'pending' | 'processing' | 'completed' | 'failed' | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  // FIX #53: Track manifest URL for music videos with audio sync
  const [manifestUrl, setManifestUrl] = useState<string | null>(null);

  // Load singers on mount
  useEffect(() => {
    loadSingers();
  }, []);

  // Poll job status with simulated progress
  useEffect(() => {
    if (!jobId) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
    const token = localStorage.getItem('token') || 'test-token-demo-user';

    const startTime = Date.now();
    const expectedDuration = 60000; // 60 seconds for video (longer than image/audio)
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
        const job = data.job; // Unwrap the { job: {...} } response

        setJobStatus(job.status);

        if (job.status === 'completed' && job.assetUrl) {
          // Show 100% before completing
          setProgress(100);
          setProgressMessage('Video generated successfully!');
          await new Promise(resolve => setTimeout(resolve, 500));

          // FIX #53: Log all job data for debugging audio sync
          console.log('[VideoPage] ✅ Job completed! Full job data:', JSON.stringify({
            assetUrl: job.assetUrl,
            manifestUrl: job.manifestUrl,
            isSegmented: job.isSegmented,
            status: job.status
          }, null, 2));

          setGeneratedVideoUrl(job.assetUrl);
          // FIX #53: Capture manifest URL for music videos with audio sync
          if (job.manifestUrl) {
            console.log('[VideoPage] 🎵 Setting manifestUrl:', job.manifestUrl);
            setManifestUrl(job.manifestUrl);
          } else {
            console.warn('[VideoPage] ⚠️ No manifestUrl in job response - plain video will be used (no audio sync)');
          }
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
          setProgressMessage(`Generating video... ${displayProgress}%`);
        }
      } catch (err) {
        console.error('Error polling job:', err);
      }
    };

    // Poll immediately
    setProgressMessage('Initializing video generation...');
    pollJob();

    // Poll every 2 seconds until completed or failed
    const interval = setInterval(pollJob, 2000);

    return () => clearInterval(interval);
  }, [jobId]);

  async function loadSingers() {
    try {
      setLoadingSingers(true);
      const data = await singersAPI.list();
      setSingers(data.singers || []);
      setSingersError(null);
    } catch (err) {
      console.error('[Generate Video] Error loading singers:', err);
      setSingersError(err instanceof Error ? err.message : 'Failed to load singers');
      setSingers([]);
    } finally {
      setLoadingSingers(false);
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    // FIX MEDIUM: Double-tap protection - prevent duplicate submissions
    if (isGenerating) {
      console.warn('[Generate Video] Already generating, ignoring duplicate submit');
      return;
    }

    if (!selectedSingerId) {
      setError('Please select a singer');
      return;
    }

    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    // Validate music video mode requirements
    if (mode === 'music-video' && !selectedSongId) {
      setError('Please select a song for music video generation');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setJobId(null);
    setProgress(0);
    setProgressMessage('');
    setGeneratedVideoUrl(null);
    setManifestUrl(null); // FIX #53: Reset manifest URL

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
      const token = localStorage.getItem('token') || 'test-token-demo-user';

      const requestBody: any = {
        singerId: selectedSingerId,
        prompt: prompt,
        mode: mode,
        provider: selectedProvider,
        aspectRatio: aspectRatio,
        durationSeconds: duration,
      };

      // Add music video specific params
      if (mode === 'music-video') {
        requestBody.songId = selectedSongId;
        requestBody.chunkDurationSeconds = chunkDuration;
      }

      const response = await fetch(`${apiUrl}/api/generate/video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate video');
      }

      setJobId(data.jobId);
    } catch (err) {
      console.error('Error generating video:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate video');
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
                <GradientText>Generate Music Video</GradientText>
              </Heading>
              <Text size="lg" variant="muted">
                Create AI-generated videos with optional music integration
              </Text>
            </div>
          </FadeIn>

        <form onSubmit={handleGenerate} className="space-y-6">
          <Stagger staggerDelay={100} animation="scale">
            {/* Mode Selection */}
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Music className="w-5 h-5 text-primary" />
                  <CardTitle>Video Mode</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    onClick={() => {
                      setMode('music-video');
                      setSelectedProvider('kie-wan25');
                    }}
                    variant={mode === 'music-video' ? 'primary' : 'outline'}
                    className="h-auto p-4 flex-col items-start"
                  >
                    <Text weight="semibold" className="mb-1">🎵 Music Video</Text>
                    <Text size="sm" variant="muted">Synced to song audio</Text>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setMode('standard');
                      setSelectedProvider('veo3');
                    }}
                    variant={mode === 'standard' ? 'primary' : 'outline'}
                    className="h-auto p-4 flex-col items-start"
                  >
                    <Text weight="semibold" className="mb-1">Standard Video</Text>
                    <Text size="sm" variant="muted">Single video clip</Text>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI Provider Selection - Only for standard mode */}
            {mode === 'standard' && (
              <ScaleIn>
                <Card variant="glass">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Video className="w-5 h-5 text-primary" />
                      <CardTitle>AI Provider</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        type="button"
                        onClick={() => setSelectedProvider('veo3')}
                        variant={selectedProvider === 'veo3' ? 'primary' : 'outline'}
                        className="h-auto p-4 flex-col items-start"
                      >
                        <Text weight="semibold" className="mb-1">Veo 3</Text>
                        <Text size="sm" variant="muted">Google's advanced video model</Text>
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setSelectedProvider('sora2')}
                        variant={selectedProvider === 'sora2' ? 'primary' : 'outline'}
                        className="h-auto p-4 flex-col items-start"
                      >
                        <Text weight="semibold" className="mb-1">Sora 2</Text>
                        <Text size="sm" variant="muted">OpenAI's video generation</Text>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </ScaleIn>
            )}

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
                        onClick={() => {
                          setSelectedSingerId(singer.id);
                          setSelectedSongId(null); // Reset song when changing singer
                        }}
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

            {/* Song Selector - Only shows when singer is selected and in music video mode */}
            {mode === 'music-video' && selectedSingerId && !loadingSingers && (
              <ScaleIn>
                <Card variant="glass">
                  <CardContent className="p-6">
                    <SongSelector
                      singerId={selectedSingerId}
                      selectedSongId={selectedSongId}
                      onSongSelect={setSelectedSongId}
                    />
                  </CardContent>
                </Card>
              </ScaleIn>
            )}

            {/* Video Details */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle>Video Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label required>Prompt</Label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={mode === 'music-video'
                        ? "A singer performing on stage with colorful lights..."
                        : "A beautiful singer performing on stage..."}
                      rows={3}
                      required
                    />
                    {mode === 'music-video' && (
                      <Text size="sm" variant="muted" className="mt-1">
                        This prompt will be used for all video segments, synced to the song's audio
                      </Text>
                    )}
                  </div>

                  <div className={`grid ${mode === 'music-video' ? 'grid-cols-2' : 'grid-cols-2'} gap-4`}>
                    {/* Duration - Only for standard mode */}
                    {mode === 'standard' && (
                      <div>
                        <Label>Duration (seconds)</Label>
                        <select
                          value={duration}
                          onChange={(e) => setDuration(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-fast"
                        >
                          <option value={5}>5 seconds</option>
                          <option value={10}>10 seconds</option>
                        </select>
                      </div>
                    )}

                    {/* Chunk Duration - Only for music video mode */}
                    {mode === 'music-video' && (
                      <div>
                        <Label>Chunk Duration</Label>
                        <select
                          value={chunkDuration}
                          onChange={(e) => setChunkDuration(Number(e.target.value) as 5 | 10)}
                          className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-fast"
                        >
                          <option value={5}>5 seconds per segment</option>
                          <option value={10}>10 seconds per segment</option>
                        </select>
                        <Text size="sm" variant="muted" className="mt-1">
                          Song will be split into {chunkDuration}s segments for generation
                        </Text>
                      </div>
                    )}

                    <div>
                      <Label>Aspect Ratio</Label>
                      <select
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value)}
                        className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-fast"
                      >
                        <option value="16:9">16:9 (Landscape)</option>
                        <option value="9:16">9:16 (Portrait)</option>
                        <option value="1:1">1:1 (Square)</option>
                      </select>
                    </div>
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

            {/* Generated Video Display */}
            {generatedVideoUrl && (
              <ScaleIn>
                <PremiumCard variant="glass" padding="none">
                  {/* FIX #53: Use MusicVideoPlayer for segmented videos with audio sync */}
                  {manifestUrl ? (
                    <MusicVideoPlayer
                      manifestUrl={manifestUrl}
                      previewUrl={generatedVideoUrl}
                      className="rounded-2xl"
                    />
                  ) : (
                    <video
                      src={generatedVideoUrl}
                      controls
                      className="w-full aspect-video object-contain rounded-2xl bg-slate-900/50"
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                </PremiumCard>
              </ScaleIn>
            )}

            {/* Generate Button */}
            <Button
              type="submit"
              disabled={
                isGenerating ||
                !selectedSingerId ||
                !prompt.trim() ||
                (mode === 'music-video' && !selectedSongId)
              }
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
                  {mode === 'music-video' ? '🎵 Generate Music Video' : 'Generate Video'}
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

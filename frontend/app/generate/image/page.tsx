'use client';

import { useState, useEffect } from 'react';
import { Image as ImageIcon, Palette, Loader2, CheckCircle, AlertCircle, User, Sparkles, ArrowLeft } from 'lucide-react';
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

const STYLE_TEMPLATES = [
  {
    name: 'Photorealistic',
    prompt: 'ultra photorealistic, extremely detailed, 8k uhd, professional DSLR photography, sharp focus, natural lighting, depth of field, realistic skin texture, hyperdetailed, award-winning photography, National Geographic quality, studio lighting, bokeh, photographic quality, lifelike, authentic, professional color grading',
    negativePrompt: 'cartoon, anime, illustration, painting, drawing, art, sketch, rendered, cgi, 3d render, unreal engine, digital art, artificial, fake, plastic, doll, mannequin, low quality, blurry, distorted, deformed, watermark, text, signature'
  },
  { name: 'Artistic', prompt: 'artistic, painterly, expressive brushstrokes', negativePrompt: '' },
  { name: 'Digital Art', prompt: 'digital art, vibrant colors, modern illustration', negativePrompt: '' },
  { name: 'Cinematic', prompt: 'cinematic lighting, dramatic composition, film still', negativePrompt: '' },
  { name: 'Anime', prompt: 'anime style, cel shaded, manga inspired', negativePrompt: '' },
  { name: 'Oil Painting', prompt: 'oil painting, classic art style, textured canvas', negativePrompt: '' },
];

type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3';

export default function GenerateImagePage() {
  // Singer data
  const [singers, setSingers] = useState<Singer[]>([]);
  const [loadingSingers, setLoadingSingers] = useState(true);
  const [singersError, setSingersError] = useState<string | null>(null);

  // Form state
  const [selectedSingerId, setSelectedSingerId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [stylePrompt, setStylePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [usePersonaContext, setUsePersonaContext] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

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
      console.error('[Generate Image] Error loading singers:', err);
      setSingersError(err instanceof Error ? err.message : 'Failed to load singers');
      setSingers([]);
    } finally {
      setLoadingSingers(false);
    }
  }

  const handleStyleSelect = (template: typeof STYLE_TEMPLATES[0]) => {
    setStylePrompt(template.prompt);
    setNegativePrompt(template.negativePrompt || '');
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

    setIsGenerating(true);
    setError(null);
    setJobId(null);
    setProgress(0);
    setProgressMessage('');
    setGeneratedImageUrl(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
      const token = localStorage.getItem('token') || 'test-token-demo-user';

      // Start generation
      const response = await fetch(`${apiUrl}/api/generate/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          singerId: selectedSingerId,
          prompt: prompt,
          stylePrompt: stylePrompt || undefined,
          aspectRatio: aspectRatio,
          negativePrompt: negativePrompt || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      const generatedJobId = data.jobId;
      setJobId(generatedJobId);
      setProgressMessage('Initializing image generation...');

      // Poll job status with simulated progress
      const startTime = Date.now();
      const expectedDuration = 30000; // 30 seconds
      const pollInterval = 1000; // Poll every 1 second
      const maxPolls = 60; // Max 60 seconds
      let simulatedProgress = 0;

      for (let i = 0; i < maxPolls; i++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        // Calculate simulated progress (smooth 0% -> 90% over expected duration)
        const elapsed = Date.now() - startTime;
        simulatedProgress = Math.min(90, Math.floor((elapsed / expectedDuration) * 90));

        // Fetch job status
        const jobResponse = await fetch(`${apiUrl}/api/jobs/${generatedJobId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const jobData = await jobResponse.json();
        const job = jobData.job; // Unwrap the { job: {...} } response

        if (job.status === 'completed' && job.assetUrl) {
          // Show 100% before completing
          setProgress(100);
          setProgressMessage('Image generated successfully!');
          await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause at 100%

          setGeneratedImageUrl(job.assetUrl);
          setIsGenerating(false);
          return;
        } else if (job.status === 'failed') {
          throw new Error(job.error || 'Image generation failed');
        }

        // Use simulated progress for better UX
        const displayProgress = Math.max(simulatedProgress, job.progress || 0);
        setProgress(displayProgress);
        setProgressMessage(`Generating image... ${displayProgress}%`);
      }

      throw new Error('Image generation timed out. Please try again.');
    } catch (err) {
      console.error('Error generating image:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate image');
      setJobId(null);
      setProgress(0);
      setProgressMessage('');
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
                <GradientText>Generate Images</GradientText>
              </Heading>
              <Text size="lg" variant="muted">
                Create stunning AI-generated images with your singers
              </Text>
            </div>
          </FadeIn>

          <form onSubmit={handleGenerate} className="space-y-6">
            <Stagger staggerDelay={100} animation="scale">
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

                  {/* Singer Context Toggle */}
                  {selectedSingerId && !loadingSingers && (
                    <ScaleIn delay={100}>
                      <div className="mt-4 pt-4 border-t border-border">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={usePersonaContext}
                            onChange={(e) => setUsePersonaContext(e.target.checked)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
                          />
                          <Text size="sm">Include singer's persona in generation</Text>
                        </label>
                        <Text size="xs" variant="muted" className="ml-6 mt-1">
                          Uses the singer's reference image to maintain consistency
                        </Text>
                      </div>
                    </ScaleIn>
                  )}
                </CardContent>
              </Card>

              {/* Style Templates */}
              <Card variant="glass">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    <CardTitle>Style Templates</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {STYLE_TEMPLATES.map((template) => (
                      <Button
                        key={template.name}
                        type="button"
                        onClick={() => handleStyleSelect(template)}
                        variant={stylePrompt === template.prompt ? 'primary' : 'outline'}
                        size="sm"
                      >
                        {template.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Image Details */}
              <Card variant="glass">
                <CardHeader>
                  <CardTitle>Image Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label required>Prompt</Label>
                      <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="A beautiful singer performing on a grand stage with dramatic lighting..."
                        rows={4}
                        required
                      />
                    </div>

                    <div>
                      <Label>Style Prompt (Optional)</Label>
                      <Textarea
                        value={stylePrompt}
                        onChange={(e) => setStylePrompt(e.target.value)}
                        placeholder="photorealistic, high detail, cinematic lighting..."
                        rows={2}
                      />
                      <Text size="xs" variant="muted" className="mt-1">
                        Or select a style template above
                      </Text>
                    </div>

                    <div>
                      <Label>Aspect Ratio</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                        <Button
                          type="button"
                          onClick={() => setAspectRatio('1:1')}
                          variant={aspectRatio === '1:1' ? 'primary' : 'outline'}
                          className="h-auto py-3"
                        >
                          <div className="text-center">
                            <div className="w-8 h-8 border-2 border-current mx-auto mb-1 rounded" />
                            <Text size="sm">1:1</Text>
                            <Text size="xs" variant="muted">Square</Text>
                          </div>
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setAspectRatio('16:9')}
                          variant={aspectRatio === '16:9' ? 'primary' : 'outline'}
                          className="h-auto py-3"
                        >
                          <div className="text-center">
                            <div className="w-10 h-6 border-2 border-current mx-auto mb-1 rounded" />
                            <Text size="sm">16:9</Text>
                            <Text size="xs" variant="muted">Landscape</Text>
                          </div>
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setAspectRatio('9:16')}
                          variant={aspectRatio === '9:16' ? 'primary' : 'outline'}
                          className="h-auto py-3"
                        >
                          <div className="text-center">
                            <div className="w-6 h-10 border-2 border-current mx-auto mb-1 rounded" />
                            <Text size="sm">9:16</Text>
                            <Text size="xs" variant="muted">Portrait</Text>
                          </div>
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setAspectRatio('4:3')}
                          variant={aspectRatio === '4:3' ? 'primary' : 'outline'}
                          className="h-auto py-3"
                        >
                          <div className="text-center">
                            <div className="w-9 h-7 border-2 border-current mx-auto mb-1 rounded" />
                            <Text size="sm">4:3</Text>
                            <Text size="xs" variant="muted">Classic</Text>
                          </div>
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label>Negative Prompt (Optional)</Label>
                      <Textarea
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder="blurry, low quality, distorted..."
                        rows={2}
                      />
                      <Text size="xs" variant="muted" className="mt-1">
                        Describe what you don't want in the image
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

              {/* Generated Image Display */}
              {generatedImageUrl && (
                <ScaleIn>
                  <PremiumCard variant="glass" padding="none">
                    <img
                      src={generatedImageUrl}
                      alt="Generated image"
                      className="w-full aspect-square object-contain rounded-2xl bg-slate-900/50"
                    />
                  </PremiumCard>
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
                    <ImageIcon className="w-5 h-5" />
                    Generate Image
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

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { singersAPI, imagesAPI, jobsAPI, APIClientError } from '@/lib/api-client';
import {
  MotionProvider,
  GradientText,
  FadeIn,
  Stagger,
  ScaleIn,
  Heading,
  Text,
  Input,
  Textarea,
  Label,
} from '@/components/ui';
import {
  PremiumCard,
  PremiumButton,
  LoadingSkeleton,
} from '@/components/premium';
import { ArrowLeft, Image as ImageIcon, Sparkles, Save, Trash2, X } from 'lucide-react';

interface Singer {
  id: string;
  name: string;
  description?: string;
  genre?: string;
  voiceId: string;
  profileImageUrl?: string;
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export default function EditSingerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const singerId = searchParams.get('id');

  // Singer data
  const [singer, setSinger] = useState<Singer | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');

  // Image generation state
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [imageError, setImageError] = useState('');
  const [imageSuccess, setImageSuccess] = useState('');

  // Update/Delete state
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load singer data
  useEffect(() => {
    if (singerId) {
      loadSinger();
    }
  }, [singerId]);

  async function loadSinger() {
    if (!singerId) return;

    try {
      setLoading(true);
      const response = await singersAPI.get(singerId);
      const singerData = (response as any).singer || response;

      setSinger(singerData);
      setName(singerData.name || '');
      setDescription(singerData.description || '');
      setGenre(singerData.genre || '');
    } catch (err) {
      console.error('[Singer Edit] Load error:', err);
      setError('Failed to load singer details');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateImage() {
    if (!imagePrompt.trim()) {
      setImageError('Please enter an image description');
      return;
    }

    if (imagePrompt.trim().length < 10) {
      setImageError('Image description must be at least 10 characters');
      return;
    }

    setGeneratingImage(true);
    setImageError('');
    setImageSuccess('');

    try {
      const enhancedPrompt = `Professional portrait headshot photo of ${imagePrompt}. Clear facial features, centered composition, studio lighting, high quality.`;

      const data = await imagesAPI.generateImage({
        prompt: enhancedPrompt,
        aspectRatio: '1:1',
      });

      const jobId = (data as any).jobId;

      if (!jobId) {
        throw new Error('No job ID returned from API');
      }

      setImageSuccess('Generating image... 0% complete');

      // Poll job status
      let attempts = 0;
      const maxAttempts = 60;
      let simulatedProgress = 0;
      const startTime = Date.now();
      const expectedDuration = 30000;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;

        const elapsed = Date.now() - startTime;
        simulatedProgress = Math.min(90, Math.floor((elapsed / expectedDuration) * 90));

        const response = await jobsAPI.get(jobId);
        const job = (response as any).job;

        if (job.status === 'completed') {
          const imageUrl = job.assetUrl;

          if (!imageUrl) {
            throw new Error('Job completed but no image URL available');
          }

          setImageSuccess('Generating image... 100% complete');
          await new Promise(resolve => setTimeout(resolve, 500));

          setGeneratedImageUrl(imageUrl);
          setImageSuccess('Image generated successfully! Click "Save Changes" to apply.');
          return;
        } else if (job.status === 'failed') {
          throw new Error(job.error || 'Image generation failed');
        }

        const displayProgress = Math.max(simulatedProgress, job.progress || 0);
        setImageSuccess(`Generating image... ${displayProgress}% complete`);
      }

      throw new Error('Image generation timed out. Please try again.');
    } catch (err) {
      console.error('[Singer Edit] Image generation error:', err);

      if (err instanceof APIClientError) {
        if (err.status === 400) {
          setImageError(`Validation Error: ${err.message}`);
        } else if (err.status === 403) {
          setImageError('Image generation requires a premium plan.');
        } else {
          setImageError(err.message || 'Failed to generate image');
        }
      } else {
        setImageError(err instanceof Error ? err.message : 'Failed to generate image');
      }
    } finally {
      setGeneratingImage(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();

    if (!singerId) return;

    if (!name.trim()) {
      setError('Please enter a singer name');
      return;
    }

    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      await singersAPI.update(singerId, {
        name: name.trim(),
        description: description.trim() || undefined,
        genre: genre.trim() || undefined,
        profileImageUrl: generatedImageUrl || undefined,
      });

      setSuccess('Singer updated successfully!');

      // Reload singer data to show updates
      await loadSinger();

      // Clear generated image state
      setGeneratedImageUrl('');
      setImagePrompt('');
      setImageSuccess('');
    } catch (err) {
      console.error('[Singer Edit] Update error:', err);

      if (err instanceof APIClientError) {
        setError(err.message || 'Failed to update singer');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to update singer');
      }
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!singerId) return;

    if (!confirm(`Are you sure you want to delete "${singer?.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
      await singersAPI.delete(singerId);
      router.push('/dashboard/singers');
    } catch (err) {
      console.error('[Singer Edit] Delete error:', err);

      if (err instanceof APIClientError) {
        setError(err.message || 'Failed to delete singer');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to delete singer');
      }
      setDeleting(false);
    }
  }

  if (!singerId) {
    return (
      <MotionProvider>
        <div className="min-h-screen bg-background py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <PremiumCard variant="bordered" padding="xl" className="border-red-500/50 bg-red-500/10">
              <div className="text-center">
                <Text size="xl" weight="semibold" className="text-red-200 mb-4">
                  No Singer ID Provided
                </Text>
                <Text className="text-red-300 mb-6">
                  Please select a singer from the singers list to edit.
                </Text>
                <Link href="/dashboard/singers">
                  <PremiumButton variant="outline">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Singers
                  </PremiumButton>
                </Link>
              </div>
            </PremiumCard>
          </div>
        </div>
      </MotionProvider>
    );
  }

  if (loading) {
    return (
      <MotionProvider>
        <div className="min-h-screen bg-background py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <LoadingSkeleton className="h-8 w-48 mb-6" />
            <LoadingSkeleton className="h-64 w-full mb-6" />
            <LoadingSkeleton className="h-96 w-full" />
          </div>
        </div>
      </MotionProvider>
    );
  }

  if (!singer) {
    return (
      <MotionProvider>
        <div className="min-h-screen bg-background py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <PremiumCard variant="bordered" padding="xl" className="border-red-500/50 bg-red-500/10">
              <div className="text-center">
                <Text size="xl" weight="semibold" className="text-red-200 mb-4">
                  Singer Not Found
                </Text>
                <Link href="/dashboard/singers">
                  <PremiumButton variant="outline">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Singers
                  </PremiumButton>
                </Link>
              </div>
            </PremiumCard>
          </div>
        </div>
      </MotionProvider>
    );
  }

  const currentImage = generatedImageUrl || singer.profileImageUrl || singer.imageUrl;

  return (
    <MotionProvider>
      <div className="min-h-screen bg-background relative overflow-hidden py-8 px-4">
        <div className="max-w-4xl mx-auto relative z-10">
          <FadeIn>
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <Link href="/dashboard/singers" className="inline-flex items-center gap-2 text-violet-300 hover:text-violet-200 transition-colors mb-4">
                  <ArrowLeft className="w-4 h-4" />
                  <Text size="sm">Back to Singers</Text>
                </Link>
                <Heading as="h1" className="mb-2">
                  <GradientText>Edit Singer</GradientText>
                </Heading>
                <Text size="lg" variant="muted">
                  Update singer details and profile image
                </Text>
              </div>
            </div>
          </FadeIn>

          <form onSubmit={handleUpdate} className="space-y-6">
            <Stagger staggerDelay={100} animation="scale">
              {/* Current Profile Image */}
              {currentImage && (
                <ScaleIn>
                  <PremiumCard variant="glass" padding="md">
                    <Heading as="h3" className="mb-4 text-white">Current Profile Image</Heading>
                    <img
                      src={currentImage}
                      alt={singer.name}
                      className="w-full aspect-square object-contain rounded-xl bg-slate-900/50"
                    />
                  </PremiumCard>
                </ScaleIn>
              )}

              {/* Basic Details */}
              <PremiumCard variant="glass" padding="xl">
                <Heading as="h3" className="mb-6 text-white">
                  <GradientText>Basic Details</GradientText>
                </Heading>

                <div className="space-y-4">
                  <div>
                    <Label required>Singer Name</Label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter singer name"
                      required
                      className="bg-white/5 border-white/10 focus:border-violet-500 text-white"
                    />
                  </div>

                  <div>
                    <Label>Genre</Label>
                    <Input
                      type="text"
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      placeholder="Pop, Rock, Jazz, etc."
                      className="bg-white/5 border-white/10 focus:border-violet-500 text-white"
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Describe this singer..."
                      className="bg-white/5 border-white/10 focus:border-violet-500 text-white"
                    />
                  </div>
                </div>
              </PremiumCard>

              {/* Image Generation */}
              <PremiumCard variant="glass" padding="xl">
                <Heading as="h3" className="mb-6 text-white">
                  <GradientText>Regenerate Profile Image</GradientText>
                </Heading>

                <div className="space-y-4">
                  <div>
                    <Label>Image Description</Label>
                    <Textarea
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      rows={2}
                      placeholder="Describe the new profile image you want..."
                      className="bg-white/5 border-white/10 focus:border-violet-500"
                    />
                  </div>

                  <PremiumButton
                    type="button"
                    onClick={handleGenerateImage}
                    variant="gradient"
                    size="lg"
                    icon={<ImageIcon className="w-5 h-5" />}
                    loading={generatingImage}
                    glow
                  >
                    {generatingImage ? 'Generating...' : 'Generate New Image'}
                  </PremiumButton>

                  {imageError && (
                    <ScaleIn>
                      <PremiumCard variant="bordered" padding="md" className="border-red-500/50 bg-red-500/10">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                            <X className="w-4 h-4 text-red-400" />
                          </div>
                          <Text className="text-red-200 flex-1">{imageError}</Text>
                        </div>
                      </PremiumCard>
                    </ScaleIn>
                  )}

                  {imageSuccess && (
                    <ScaleIn>
                      <PremiumCard variant="bordered" padding="md" className="border-green-500/50 bg-green-500/10">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-green-400" />
                          </div>
                          <Text className="text-green-200 flex-1">{imageSuccess}</Text>
                        </div>
                      </PremiumCard>
                    </ScaleIn>
                  )}

                  {generatedImageUrl && (
                    <ScaleIn>
                      <PremiumCard variant="glass" padding="none">
                        <img
                          src={generatedImageUrl}
                          alt="New generated profile"
                          className="w-full aspect-square object-contain rounded-2xl bg-slate-900/50"
                        />
                      </PremiumCard>
                    </ScaleIn>
                  )}
                </div>
              </PremiumCard>

              {/* Error/Success Messages */}
              {error && (
                <ScaleIn>
                  <PremiumCard variant="bordered" padding="md" className="border-red-500/50 bg-red-500/10">
                    <Text className="text-red-200">{error}</Text>
                  </PremiumCard>
                </ScaleIn>
              )}

              {success && (
                <ScaleIn>
                  <PremiumCard variant="bordered" padding="md" className="border-green-500/50 bg-green-500/10">
                    <Text className="text-green-200">{success}</Text>
                  </PremiumCard>
                </ScaleIn>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <PremiumButton
                  type="submit"
                  variant="gradient"
                  size="xl"
                  loading={updating}
                  glow
                  icon={<Save className="w-5 h-5" />}
                  className="flex-1"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </PremiumButton>

                <PremiumButton
                  type="button"
                  onClick={handleDelete}
                  variant="outline"
                  size="xl"
                  loading={deleting}
                  icon={<Trash2 className="w-5 h-5" />}
                  className="border-red-500/50 hover:bg-red-500/10"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </PremiumButton>
              </div>
            </Stagger>
          </form>
        </div>
      </div>
    </MotionProvider>
  );
}

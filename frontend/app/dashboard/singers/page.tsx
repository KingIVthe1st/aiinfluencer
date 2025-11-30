'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { singersAPI, voicesAPI, imagesAPI, jobsAPI, APIClientError } from '@/lib/api-client';
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
  HelperText,
} from '@/components/ui';
import {
  PremiumCard,
  PremiumCardHeader,
  PremiumButton,
  LoadingSkeleton,
  NoSingersEmptyState,
} from '@/components/premium';
import { Mic2, Sparkles, Image as ImageIcon, Play, X } from 'lucide-react';

export default function SingersPage() {
  const [singers, setSingers] = useState<any[]>([]);
  const [voices, setVoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [generatingVoice, setGeneratingVoice] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [voiceType, setVoiceType] = useState<'premade' | 'ai-generated'>('premade');
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [voiceDescription, setVoiceDescription] = useState('');
  const [generatedVoiceId, setGeneratedVoiceId] = useState('');
  const [generatedVoicePreview, setGeneratedVoicePreview] = useState('');

  // Image generation state
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [imageError, setImageError] = useState('');
  const [imageSuccess, setImageSuccess] = useState('');

  // Error and success states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [singersData, voicesData] = await Promise.all([
        singersAPI.list(),
        voicesAPI.listVoices(),
      ]);

      setSingers(singersData.singers || []);
      setVoices(voicesData.voices || []);
      setLoading(false);
    } catch (err) {
      console.error('[Singers Page] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setLoading(false);
    }
  }

  async function handleGenerateVoice() {
    if (!voiceDescription.trim()) {
      setError('Please enter a voice description');
      return;
    }

    setGeneratingVoice(true);
    setError('');
    setSuccess('');

    try {
      const response = await voicesAPI.generateVoice({
        name: name || 'Custom Voice',
        description: voiceDescription,
      }) as any;

      setGeneratedVoiceId(response.voice_id);
      setGeneratedVoicePreview(response.preview_url);
      setSuccess('Voice generated successfully! You can now create your singer.');
    } catch (err) {
      console.error('[Singers Page] Voice generation error:', err);

      if (err instanceof APIClientError) {
        if (err.status === 403) {
          setError('Voice generation requires a premium plan. Please upgrade your account.');
        } else if (err.status === 422) {
          setError('Invalid voice description. Please provide more detail.');
        } else {
          setError(err.message || 'Failed to generate voice');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setGeneratingVoice(false);
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

    if (imagePrompt.trim().length > 1000) {
      setImageError('Image description must be less than 1000 characters');
      return;
    }

    setGeneratingImage(true);
    setImageError('');
    setImageSuccess('');

    try {
      // Enhance prompt for profile picture generation
      // Ensure it generates a proper face/headshot by adding portrait keywords
      const enhancedPrompt = `Professional portrait headshot photo of ${imagePrompt}. Clear facial features, centered composition, studio lighting, high quality.`;

      // Ultra-photorealistic style for profile images (same as Generate Image page)
      const photorealisticStyle = 'ultra photorealistic, extremely detailed, 8k uhd, professional DSLR photography, sharp focus, natural lighting, depth of field, realistic skin texture, hyperdetailed, award-winning photography, National Geographic quality, studio lighting, bokeh, photographic quality, lifelike, authentic, professional color grading';

      const photorealisticNegative = 'cartoon, anime, illustration, painting, drawing, art, sketch, rendered, cgi, 3d render, unreal engine, digital art, artificial, fake, plastic, doll, mannequin, low quality, blurry, distorted, deformed, watermark, text, signature';

      // Start image generation job
      const data = await imagesAPI.generateImage({
        prompt: enhancedPrompt,
        aspectRatio: '1:1', // Square aspect ratio for profile pictures
        stylePrompt: photorealisticStyle,
        negativePrompt: photorealisticNegative,
        // singerId is optional for preview mode before singer creation
      });

      // Backend returns async job, not immediate URL
      const jobId = (data as any).jobId;

      if (!jobId) {
        throw new Error('No job ID returned from API');
      }

      setImageSuccess('Generating image... 0% complete');

      // Poll job status until complete with simulated progress
      let attempts = 0;
      const maxAttempts = 60; // 60 attempts * 2 seconds = 2 minutes max
      let simulatedProgress = 0;
      const startTime = Date.now();
      const expectedDuration = 30000; // 30 seconds expected duration

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        attempts++;

        // Calculate simulated progress (smooth 0% -> 90% over expected duration)
        const elapsed = Date.now() - startTime;
        simulatedProgress = Math.min(90, Math.floor((elapsed / expectedDuration) * 90));

        const response = await jobsAPI.get(jobId);
        const job = (response as any).job; // API returns { job: {...} }

        if (job.status === 'completed') {
          const imageUrl = job.assetUrl;

          if (!imageUrl) {
            throw new Error('Job completed but no image URL available');
          }

          // Show 100% before completing
          setImageSuccess('Generating image... 100% complete');
          await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause at 100%

          setGeneratedImageUrl(imageUrl);
          setImageSuccess('Image generated successfully! Preview below.');
          return;
        } else if (job.status === 'failed') {
          throw new Error(job.error || 'Image generation failed');
        }

        // Use simulated progress for better UX (DALL-E doesn't report real progress)
        const displayProgress = Math.max(simulatedProgress, job.progress || 0);
        setImageSuccess(`Generating image... ${displayProgress}% complete`);
      }

      throw new Error('Image generation timed out. Please try again.');
    } catch (err) {
      console.error('[Singers Page] Image generation error:', err);

      if (err instanceof APIClientError) {
        if (err.status === 400) {
          const message = err.message || 'Invalid image parameters';
          setImageError(`Validation Error: ${message}`);
        } else if (err.status === 403) {
          setImageError('Image generation requires a premium plan. Please upgrade your account.');
        } else {
          setImageError(err.message || 'Failed to generate image');
        }
      } else {
        setImageError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setGeneratingImage(false);
    }
  }

  async function handleCreateSinger(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please enter a singer name');
      return;
    }

    const voiceId = voiceType === 'ai-generated' ? generatedVoiceId : selectedVoiceId;

    if (!voiceId) {
      setError('Please select or generate a voice');
      return;
    }

    setCreating(true);
    setError('');
    setSuccess('');

    try {
      // Find selected voice to extract metadata
      const selectedVoice = voices.find(v => v.voice_id === voiceId);

      // Build voiceSettings
      const voiceSettings = {
        provider: 'elevenlabs',
        voiceId: voiceId,
        stability: 0.5,
        similarity: 0.75,
      };

      // Build stylePreferences from voice metadata if available
      let stylePreferences = undefined;
      if (selectedVoice?.labels) {
        stylePreferences = {
          gender: selectedVoice.labels.gender || 'neutral',
          ageRange: selectedVoice.labels.age || 'adult',
          tone: 'warm',
          accent: selectedVoice.labels.accent || 'american',
          vocalStyle: genre.trim() || 'pop',
          intensity: 'dynamic',
          vibrato: 'moderate',
        };
      }

      await singersAPI.create({
        name: name.trim(),
        description: description.trim(),
        genre: genre.trim(),
        voiceSettings,
        stylePreferences,
        profileImageUrl: generatedImageUrl || undefined,
      });

      setSuccess('Influencer created successfully!');

      // Reset form
      setName('');
      setDescription('');
      setGenre('');
      setVoiceType('premade');
      setSelectedVoiceId('');
      setVoiceDescription('');
      setGeneratedVoiceId('');
      setGeneratedVoicePreview('');
      setImagePrompt('');
      setGeneratedImageUrl('');

      // Reload singers
      loadData();
    } catch (err) {
      console.error('[Singers Page] Create error:', err);

      if (err instanceof APIClientError) {
        setError(err.message || 'Failed to create singer');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setCreating(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <MotionProvider>
        <div className="space-y-8">
          <FadeIn>
            <Heading as="h1">
              <GradientText>My Influencers</GradientText>
            </Heading>
          </FadeIn>
          <LoadingSkeleton variant="card" count={3} />
        </div>
      </MotionProvider>
    );
  }

  return (
    <MotionProvider>
      <div className="space-y-8">
        {/* Header */}
        <FadeIn>
          <div className="flex justify-between items-center">
            <Heading as="h1">
              <GradientText>My Influencers</GradientText>
            </Heading>
          </div>
        </FadeIn>

        {/* Error/Success Messages */}
        {error && (
          <ScaleIn>
            <PremiumCard variant="bordered" padding="md" className="border-red-500/50 bg-red-500/10">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                  <X className="w-4 h-4 text-red-400" />
                </div>
                <Text className="text-red-200 flex-1">{error}</Text>
              </div>
            </PremiumCard>
          </ScaleIn>
        )}

        {success && (
          <ScaleIn>
            <PremiumCard variant="bordered" padding="md" className="border-green-500/50 bg-green-500/10">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-green-400" />
                </div>
                <Text className="text-green-200 flex-1">{success}</Text>
              </div>
            </PremiumCard>
          </ScaleIn>
        )}

        {/* Create Singer Form */}
        <FadeIn delay={0.1}>
          <PremiumCard variant="glass" padding="lg">
            <PremiumCardHeader
              title="Create New Influencer"
              subtitle="Design your AI influencer with custom voice and persona"
            />

            <form onSubmit={handleCreateSinger} className="space-y-8 mt-6">
              {/* Basic Info */}
              <Stagger staggerDelay={50} animation="fade">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <Label required>Influencer Name</Label>
                      <Input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Luna, Kai, Maya"
                        required
                        className="bg-white/5 border-white/10 focus:border-violet-500"
                      />
                    </div>

                    <div>
                      <Label>Niche / Category</Label>
                      <Input
                        type="text"
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        placeholder="e.g., Fashion, Fitness, Tech, Lifestyle"
                        className="bg-white/5 border-white/10 focus:border-violet-500"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Describe your influencer's personality, style, and content focus..."
                      className="bg-white/5 border-white/10 focus:border-violet-500"
                    />
                  </div>
                </div>
              </Stagger>

              {/* Voice Selection */}
              <div className="border-t border-white/10 pt-8">
                <FadeIn delay={0.2}>
                  <Heading as="h3" className="mb-6">
                    <GradientText>Voice Selection</GradientText>
                  </Heading>
                </FadeIn>

                <div className="space-y-6">
                  {/* Voice Type Toggle */}
                  <div className="flex gap-4">
                    <PremiumButton
                      type="button"
                      onClick={() => setVoiceType('premade')}
                      variant={voiceType === 'premade' ? 'gradient' : 'ghost'}
                      size="md"
                      icon={<Mic2 className="w-4 h-4" />}
                      glow={voiceType === 'premade'}
                    >
                      Premade Voices
                    </PremiumButton>
                    <PremiumButton
                      type="button"
                      onClick={() => setVoiceType('ai-generated')}
                      variant={voiceType === 'ai-generated' ? 'gradient' : 'ghost'}
                      size="md"
                      icon={<Sparkles className="w-4 h-4" />}
                      glow={voiceType === 'ai-generated'}
                    >
                      AI Voice Generation
                    </PremiumButton>
                  </div>

                  {/* Premade Voices */}
                  {voiceType === 'premade' && (
                    <ScaleIn>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {voices.map((voice) => (
                          <PremiumCard
                            key={voice.voice_id}
                            variant={selectedVoiceId === voice.voice_id ? 'gradient' : 'glass'}
                            hover
                            glow={selectedVoiceId === voice.voice_id}
                            padding="md"
                            onClick={() => setSelectedVoiceId(voice.voice_id)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <Text weight="semibold" className="text-white mb-1">
                                  {voice.name}
                                </Text>
                                <Text size="sm" className="text-slate-400">
                                  {voice.labels?.gender || 'Unknown'}
                                </Text>
                              </div>
                              {voice.preview_url && (
                                <button
                                  type="button"
                                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Play preview
                                    const audio = new Audio(voice.preview_url);
                                    audio.play();
                                  }}
                                >
                                  <Play className="w-4 h-4 text-white" />
                                </button>
                              )}
                            </div>
                          </PremiumCard>
                        ))}
                      </div>
                    </ScaleIn>
                  )}

                  {/* AI Voice Generation */}
                  {voiceType === 'ai-generated' && (
                    <ScaleIn>
                      <div className="space-y-4">
                        <div>
                          <Label>Voice Description</Label>
                          <Textarea
                            value={voiceDescription}
                            onChange={(e) => setVoiceDescription(e.target.value)}
                            rows={3}
                            placeholder="Describe the voice you want: age, gender, accent, tone..."
                            className="bg-white/5 border-white/10 focus:border-violet-500"
                          />
                          <HelperText>
                            e.g., "A warm, friendly female voice with a British accent, mid-30s"
                          </HelperText>
                        </div>

                        <PremiumButton
                          type="button"
                          onClick={handleGenerateVoice}
                          variant="gradient"
                          size="lg"
                          icon={<Sparkles className="w-5 h-5" />}
                          loading={generatingVoice}
                          glow
                        >
                          {generatingVoice ? 'Generating Voice...' : 'Generate Voice'}
                        </PremiumButton>

                        {generatedVoicePreview && (
                          <PremiumCard variant="bordered" padding="md" className="border-green-500/50">
                            <div className="flex items-center justify-between">
                              <Text className="text-green-200">Voice generated successfully!</Text>
                              <button
                                type="button"
                                className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 transition-colors"
                                onClick={() => {
                                  const audio = new Audio(generatedVoicePreview);
                                  audio.play();
                                }}
                              >
                                <Play className="w-4 h-4 text-green-400" />
                              </button>
                            </div>
                          </PremiumCard>
                        )}
                      </div>
                    </ScaleIn>
                  )}
                </div>
              </div>

              {/* Image Generation */}
              <div className="border-t border-white/10 pt-8">
                <FadeIn delay={0.3}>
                  <Heading as="h3" className="mb-6">
                    <GradientText>Profile Image (Optional)</GradientText>
                  </Heading>
                </FadeIn>

                <div className="space-y-4">
                  <div>
                    <Label>Image Description</Label>
                    <Textarea
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      rows={2}
                      placeholder="Describe the profile image you want..."
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
                    {generatingImage ? 'Generating Image...' : 'Generate Image'}
                  </PremiumButton>

                  {/* Image-specific status messages */}
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
                          alt="Generated singer profile"
                          className="w-full aspect-square object-contain rounded-2xl bg-slate-900/50"
                        />
                      </PremiumCard>
                    </ScaleIn>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-6">
                <PremiumButton
                  type="submit"
                  variant="gradient"
                  size="xl"
                  loading={creating}
                  fullWidth
                  glow
                  icon={<Sparkles className="w-5 h-5" />}
                >
                  {creating ? 'Creating Influencer...' : 'Create Influencer'}
                </PremiumButton>
              </div>
            </form>
          </PremiumCard>
        </FadeIn>

        {/* Existing Singers */}
        {singers.length > 0 && (
          <div>
            <FadeIn delay={0.4}>
              <Heading as="h2" className="mb-6">
                <GradientText>Your Influencers</GradientText>
              </Heading>
            </FadeIn>

            <Stagger staggerDelay={100} animation="scale">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {singers.map((singer) => (
                  <Link
                    key={singer.id}
                    href={`/dashboard/edit-singer?id=${singer.id}`}
                    className="block group"
                  >
                    <PremiumCard
                      variant="glass"
                      hover
                      glow
                      padding="md"
                    >
                      {(singer.profileImageUrl || singer.imageUrl) && (
                        <img
                          src={singer.profileImageUrl || singer.imageUrl}
                          alt={singer.name}
                          className="w-full h-48 object-cover rounded-xl mb-4 group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                      <Heading as="h3" className="text-white mb-2 group-hover:text-violet-300 transition-colors">{singer.name}</Heading>
                      {singer.genre && (
                        <Text size="sm" className="text-violet-300 mb-2">{singer.genre}</Text>
                      )}
                      {singer.description && (
                        <Text size="sm" className="text-slate-200">{singer.description}</Text>
                      )}
                    </PremiumCard>
                  </Link>
                ))}
              </div>
            </Stagger>
          </div>
        )}
      </div>
    </MotionProvider>
  );
}

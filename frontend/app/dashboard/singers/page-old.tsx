'use client';

import { useState, useEffect } from 'react';
import { singersAPI, voicesAPI, imagesAPI, APIClientError } from '@/lib/api-client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Textarea,
  Label,
  HelperText,
  Heading,
  Text,
  Spin,
  FadeIn,
  SlideIn,
  Stagger,
  ScaleIn,
} from '@/components/ui';

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
      console.log('[Singers Page] Generating voice with description:', voiceDescription);

      const response = await voicesAPI.generateVoice({
        name: name || 'Custom Voice',
        description: voiceDescription,
      }) as any;

      console.log('[Singers Page] Voice generated successfully:', response);

      setGeneratedVoiceId(response.voice_id);
      setGeneratedVoicePreview(response.preview_url);
      setSuccess('Voice generated successfully! You can now create your singer.');

    } catch (err) {
      console.error('[Singers Page] Voice generation error:', err);

      if (err instanceof APIClientError) {
        // Handle specific error cases
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
      setError('Please enter an image description');
      return;
    }

    setGeneratingImage(true);
    setError('');
    setSuccess('');

    try {
      console.log('[Singers Page] Generating image with prompt:', imagePrompt);

      // Use API client (fixes auth token and hardcoded URL issues)
      const data = await imagesAPI.generateImage({
        prompt: imagePrompt,
        name: name || 'Singer Profile',
      });

      console.log('[Singers Page] Image generated successfully:', data);

      // Extract URL from various possible response formats
      const imageUrl = data.url || data.imageUrl || data.image_url;

      if (!imageUrl) {
        throw new Error('No image URL returned from API');
      }

      setGeneratedImageUrl(imageUrl);
      setSuccess('Image generated successfully! Preview below.');

    } catch (err) {
      console.error('[Singers Page] Image generation error:', err);

      if (err instanceof APIClientError) {
        // Provide helpful error messages
        if (err.statusCode === 401) {
          setError('Authentication failed. Please log in again.');
        } else if (err.statusCode === 403) {
          setError('Premium feature. Please upgrade your plan.');
        } else {
          setError(err.message || 'Failed to generate image');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Failed to generate image');
      }
    } finally {
      setGeneratingImage(false);
    }
  }

  async function handleCreateSinger(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError('Singer name is required');
      return;
    }

    if (voiceType === 'premade' && !selectedVoiceId) {
      setError('Please select a voice');
      return;
    }

    if (voiceType === 'ai-generated' && !generatedVoiceId) {
      setError('Please generate a voice first');
      return;
    }

    setCreating(true);
    setError('');
    setSuccess('');

    try {
      const voiceId = voiceType === 'premade' ? selectedVoiceId : generatedVoiceId;

      await singersAPI.create({
        name,
        description,
        genre,
        voiceSettings: {
          voiceId,
          type: voiceType,
        },
        profileImageUrl: generatedImageUrl || null,
      });

      setSuccess('Singer created successfully!');

      // Reset form
      setName('');
      setDescription('');
      setGenre('');
      setVoiceDescription('');
      setSelectedVoiceId('');
      setGeneratedVoiceId('');
      setGeneratedVoicePreview('');
      setImagePrompt('');
      setGeneratedImageUrl('');

      // Reload singers list
      await loadData();

    } catch (err) {
      console.error('[Singers Page] Create error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create singer');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spin size="lg" className="text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <FadeIn>
        <div className="flex justify-between items-center">
          <Heading as="h1">My Singers</Heading>
        </div>
      </FadeIn>

      {/* Error/Success Messages */}
      {error && (
        <ScaleIn>
          <Card variant="default" className="border-error-200 bg-error-50">
            <CardContent className="p-4">
              <Text className="text-error-700">{error}</Text>
            </CardContent>
          </Card>
        </ScaleIn>
      )}

      {success && (
        <ScaleIn>
          <Card variant="default" className="border-success-200 bg-success-50">
            <CardContent className="p-4">
              <Text className="text-success-700">{success}</Text>
            </CardContent>
          </Card>
        </ScaleIn>
      )}

      {/* Create Singer Form */}
      <SlideIn direction="bottom">
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Create New Singer</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSinger} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <Label required>Singer Name</Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Luna"
                required
              />
            </div>

            <div>
              <Label>Genre</Label>
              <Input
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="e.g., Pop, Rock, Jazz"
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe your singer..."
            />
          </div>

          {/* Voice Selection */}
          <div className="border-t border-border pt-6">
            <Heading as="h3" className="mb-4 text-slate-900">Voice Selection</Heading>

            <div className="space-y-4">
              {/* Voice Type Toggle */}
              <div className="flex space-x-4">
                <Button
                  type="button"
                  onClick={() => setVoiceType('premade')}
                  variant={voiceType === 'premade' ? 'primary' : 'outline'}
                  size="md"
                >
                  Premade Voices
                </Button>
                <Button
                  type="button"
                  onClick={() => setVoiceType('ai-generated')}
                  variant={voiceType === 'ai-generated' ? 'primary' : 'outline'}
                  size="md"
                >
                  AI Voice Generation
                </Button>
              </div>

              {/* Premade Voices */}
              {voiceType === 'premade' && (
                <div>
                  <Label>Select Voice</Label>
                  <select
                    value={selectedVoiceId}
                    onChange={(e) => setSelectedVoiceId(e.target.value)}
                    className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-fast"
                  >
                    <option value="">Choose a voice...</option>
                    {voices.map((voice) => (
                      <option key={voice.voice_id} value={voice.voice_id}>
                        {voice.name} {voice.labels?.accent && `(${voice.labels.accent})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* AI Voice Generation */}
              {voiceType === 'ai-generated' && (
                <div className="space-y-4">
                  <div>
                    <Label>Voice Description</Label>
                    <Textarea
                      value={voiceDescription}
                      onChange={(e) => setVoiceDescription(e.target.value)}
                      rows={3}
                      placeholder="Describe the voice you want to generate (e.g., warm soulful urban female voice)"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleGenerateVoice}
                    disabled={generatingVoice || !voiceDescription.trim()}
                    loading={generatingVoice}
                    variant="primary"
                    size="md"
                  >
                    {generatingVoice ? 'Generating Voice...' : 'Generate Custom Voice'}
                  </Button>

                  {generatedVoicePreview && (
                    <ScaleIn>
                      <Card variant="default" className="border-success-200 bg-success-50">
                        <CardContent className="p-4">
                          <Text className="text-success-700 mb-2">
                            ✓ Voice generated successfully! Preview:
                          </Text>
                          <audio
                            controls
                            src={`data:audio/mp3;base64,${generatedVoicePreview}`}
                            className="w-full"
                          />
                        </CardContent>
                      </Card>
                    </ScaleIn>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Profile Image Generation */}
          <div className="border-t border-border pt-6">
            <Heading as="h3" className="mb-4 text-slate-900">Profile Image (Optional)</Heading>

            <div className="space-y-4">
              <div>
                <Label>Image Description</Label>
                <Textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  rows={3}
                  placeholder="Describe the singer's appearance (e.g., professional headshot of a female pop singer with long dark hair, studio lighting)"
                />
                <HelperText>Generate an AI image for your singer's profile. Leave blank to skip.</HelperText>
              </div>

              <Button
                type="button"
                onClick={handleGenerateImage}
                disabled={generatingImage || !imagePrompt.trim()}
                loading={generatingImage}
                variant="secondary"
                size="md"
                className="bg-white/90 border-2 border-violet-600 text-violet-600 hover:bg-violet-50"
              >
                {generatingImage ? 'Generating Image...' : 'Generate Profile Image'}
              </Button>

              {generatedImageUrl && (
                <ScaleIn>
                  <Card variant="default" className="border-success-200 bg-success-50">
                    <CardContent className="p-4">
                      <Text className="text-success-700 mb-3">
                        ✓ Profile image generated successfully!
                      </Text>
                      <div className="rounded-xl overflow-hidden shadow-lg">
                        <img
                          src={generatedImageUrl}
                          alt="Generated singer profile"
                          className="w-full h-auto max-h-96 object-cover"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </ScaleIn>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={creating}
              loading={creating}
              variant="primary"
              size="lg"
            >
              {creating ? 'Creating Singer...' : 'Create Singer'}
            </Button>
          </div>
            </form>
          </CardContent>
        </Card>
      </SlideIn>

      {/* Singers List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-1 h-8 bg-gradient-to-b from-violet-600 to-fuchsia-600 rounded-full" />
            Your Singers
          </h2>
          <Text variant="muted">{singers.length} total</Text>
        </div>

        {singers.length === 0 ? (
          <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-12 border border-slate-200/50 shadow-lg text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No singers yet</h3>
            <p className="text-slate-600 mb-6">Create your first AI singer to start generating content</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {singers.map((singer) => (
              <a
                key={singer.id}
                href={`/dashboard/singers/profile?id=${singer.id}`}
                className="group relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-xl p-6 border border-slate-200/50 hover:border-violet-300 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
              >
                {/* Gradient background on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-fuchsia-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative">
                  {/* Singer Avatar */}
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-violet-500/40 group-hover:shadow-xl group-hover:shadow-violet-500/60 transition-all duration-500 group-hover:scale-110">
                    {singer.name[0]?.toUpperCase() || 'S'}
                  </div>

                  {/* Singer Info */}
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-violet-700 transition-colors duration-300">
                      {singer.name}
                    </h3>
                    {singer.genre && (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                        {singer.genre}
                      </span>
                    )}
                  </div>

                  {singer.description && (
                    <p className="text-sm text-slate-600 text-center line-clamp-2 mb-4">
                      {singer.description}
                    </p>
                  )}

                  {/* Stats - FIXED: Darker text for better contrast */}
                  <div className="flex items-center justify-center gap-4 pt-4 border-t border-slate-200/50">
                    <div className="text-center">
                      <p className="text-xs font-medium text-slate-700">Videos</p>
                      <p className="text-sm font-bold text-slate-900">0</p>
                    </div>
                    <div className="w-px h-8 bg-slate-200" />
                    <div className="text-center">
                      <p className="text-xs font-medium text-slate-700">Images</p>
                      <p className="text-sm font-bold text-slate-900">0</p>
                    </div>
                    <div className="w-px h-8 bg-slate-200" />
                    <div className="text-center">
                      <p className="text-xs font-medium text-slate-700">Audio</p>
                      <p className="text-sm font-bold text-slate-900">0</p>
                    </div>
                  </div>

                  {/* View Details Arrow */}
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <svg
                      className="w-4 h-4 text-violet-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

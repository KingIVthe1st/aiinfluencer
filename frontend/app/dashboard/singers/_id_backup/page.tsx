'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

// Generate static params for export (empty means no pages pre-generated, only client-side)
import {
  ArrowLeft,
  Edit,
  Trash2,
  Image as ImageIcon,
  Music,
  Video,
  Play,
  Pause,
  Download,
  Share2,
  AlertCircle,
  Loader2,
  CheckCircle
} from 'lucide-react';
import {
  MotionProvider,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
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

interface Singer {
  id: string;
  name: string;
  voiceId: string;
  referenceImageUrl?: string;
  voiceSampleUrl?: string;
  createdAt: number;
  updatedAt: number;
}

interface Asset {
  id: string;
  type: 'image' | 'audio' | 'video';
  url: string;
  singerId: string;
  provider: string;
  createdAt: number;
  metadata?: Record<string, any>;
}

interface SingerStats {
  totalAssets: number;
  imageCount: number;
  audioCount: number;
  videoCount: number;
}

// Mock data for demo - replace with API call
const MOCK_SINGER: Singer = {
  id: 'singer_1760559095501_emyt1i',
  name: 'Jill',
  voiceId: 'voice_123',
  referenceImageUrl: 'https://via.placeholder.com/400x400',
  voiceSampleUrl: 'https://example.com/voice-sample.mp3',
  createdAt: Date.now() - 86400000 * 30,
  updatedAt: Date.now() - 86400000,
};

const MOCK_ASSETS: Asset[] = [
  {
    id: 'asset_1',
    type: 'image',
    url: 'https://via.placeholder.com/400x400',
    singerId: 'singer_1760559095501_emyt1i',
    provider: 'gemini',
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'asset_2',
    type: 'audio',
    url: 'https://example.com/audio.mp3',
    singerId: 'singer_1760559095501_emyt1i',
    provider: 'elevenlabs',
    createdAt: Date.now() - 7200000,
  },
  {
    id: 'asset_3',
    type: 'video',
    url: 'https://example.com/video.mp4',
    singerId: 'singer_1760559095501_emyt1i',
    provider: 'veo3',
    createdAt: Date.now() - 10800000,
  },
];

export default function SingerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const singerId = params.id as string;

  const [singer, setSinger] = useState<Singer | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<SingerStats>({
    totalAssets: 0,
    imageCount: 0,
    audioCount: 0,
    videoCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  useEffect(() => {
    // TODO: Replace with actual API call
    // fetchSingerData(singerId);
    setTimeout(() => {
      setSinger(MOCK_SINGER);
      setAssets(MOCK_ASSETS);
      setEditedName(MOCK_SINGER.name);

      // Calculate stats
      const imageCount = MOCK_ASSETS.filter(a => a.type === 'image').length;
      const audioCount = MOCK_ASSETS.filter(a => a.type === 'audio').length;
      const videoCount = MOCK_ASSETS.filter(a => a.type === 'video').length;

      setStats({
        totalAssets: MOCK_ASSETS.length,
        imageCount,
        audioCount,
        videoCount,
      });

      setLoading(false);
    }, 500);
  }, [singerId]);

  const handleSave = async () => {
    if (!editedName.trim()) {
      setError('Singer name cannot be empty');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
      const token = localStorage.getItem('session_token') || 'test-token-123';

      const response = await fetch(`${apiUrl}/api/singers/${singerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editedName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update singer');
      }

      setSinger(prev => prev ? { ...prev, name: editedName } : null);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating singer:', err);
      setError(err instanceof Error ? err.message : 'Failed to update singer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
      const token = localStorage.getItem('session_token') || 'test-token-123';

      const response = await fetch(`${apiUrl}/api/singers/${singerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete singer');
      }

      // Redirect to singers page after successful deletion
      router.push('/dashboard/singers');
    } catch (err) {
      console.error('Error deleting singer:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete singer');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const toggleVoicePlayback = () => {
    // TODO: Implement actual audio playback
    setIsPlayingVoice(!isPlayingVoice);
  };

  const handleDownload = (asset: Asset) => {
    window.open(asset.url, '_blank');
  };

  const handleShare = (asset: Asset) => {
    if (navigator.share) {
      navigator.share({
        title: `${asset.type} by ${singer?.name || 'AI Singer'}`,
        text: `Check out this AI-generated ${asset.type}!`,
        url: asset.url,
      });
    } else {
      navigator.clipboard.writeText(asset.url);
      alert('Link copied to clipboard!');
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'audio':
        return <Music className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'image':
        return 'text-primary';
      case 'audio':
        return 'text-accent';
      case 'video':
        return 'text-success-600';
      default:
        return 'text-foreground';
    }
  };

  if (loading) {
    return (
      <MotionProvider>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MotionProvider>
    );
  }

  if (!singer) {
    return (
      <MotionProvider>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card variant="glass" className="max-w-md">
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-error-600 mx-auto mb-4" />
              <Text size="lg" weight="semibold" className="mb-2">Singer Not Found</Text>
              <Text variant="muted" className="mb-4">
                The singer you're looking for doesn't exist or has been deleted.
              </Text>
              <Button variant="primary" onClick={() => router.push('/dashboard/singers')}>
                <ArrowLeft className="w-4 h-4" />
                Back to Singers
              </Button>
            </CardContent>
          </Card>
        </div>
      </MotionProvider>
    );
  }

  return (
    <MotionProvider>
      <div className="min-h-screen bg-background relative overflow-hidden py-8 px-4">
        {/* Animated gradient background */}
        <GradientShift className="absolute inset-0 opacity-30" />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Back Button */}
          <FadeIn>
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard/singers')}
              className="mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Singers
            </Button>
          </FadeIn>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Singer Details */}
            <div className="lg:col-span-1">
              <Stagger staggerDelay={100} animation="scale">
                {/* Singer Info Card */}
                <Card variant="glass">
                  <CardContent className="p-6">
                    <FadeIn>
                      {/* Reference Image */}
                      {singer.referenceImageUrl && (
                        <div className="aspect-square bg-muted rounded-lg overflow-hidden mb-4">
                          <img
                            src={singer.referenceImageUrl}
                            alt={singer.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Name Section */}
                      {isEditing ? (
                        <div className="space-y-3 mb-4">
                          <Label>Singer Name</Label>
                          <Input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            placeholder="Enter singer name"
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={handleSave}
                              loading={isSaving}
                              fullWidth
                            >
                              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setIsEditing(false);
                                setEditedName(singer.name);
                              }}
                              disabled={isSaving}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <Heading as="h2" className="mb-1">
                                <GradientText>{singer.name}</GradientText>
                              </Heading>
                              <Text size="sm" variant="muted">
                                Created {formatDate(singer.createdAt)}
                              </Text>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsEditing(true)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      )}

                      {/* Voice ID */}
                      <div className="mb-4 p-3 bg-background/50 rounded-lg">
                        <Text size="xs" variant="muted" className="mb-1">Voice ID</Text>
                        <Text size="sm" className="font-mono">{singer.voiceId}</Text>
                      </div>

                      {/* Voice Sample Player */}
                      {singer.voiceSampleUrl && (
                        <div className="mb-4">
                          <Label className="mb-2">Voice Sample</Label>
                          <Button
                            variant="outline"
                            onClick={toggleVoicePlayback}
                            fullWidth
                          >
                            {isPlayingVoice ? (
                              <>
                                <Pause className="w-4 h-4" />
                                Pause Sample
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4" />
                                Play Sample
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {/* Delete Button */}
                      <div className="pt-4 border-t border-border">
                        {showDeleteConfirm ? (
                          <div className="space-y-3">
                            <Text size="sm" weight="semibold" className="text-error-900">
                              Delete this singer permanently?
                            </Text>
                            <Text size="sm" variant="muted">
                              This will also delete all associated content.
                            </Text>
                            <div className="flex gap-2">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleDelete}
                                loading={isDeleting}
                                fullWidth
                              >
                                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Confirm Delete
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="destructive"
                            onClick={() => setShowDeleteConfirm(true)}
                            fullWidth
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Singer
                          </Button>
                        )}
                      </div>
                    </FadeIn>
                  </CardContent>
                </Card>

                {/* Statistics Card */}
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle>Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Text variant="muted">Total Content</Text>
                        <Text weight="semibold" size="lg">{stats.totalAssets}</Text>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-primary" />
                          <Text variant="muted">Images</Text>
                        </div>
                        <Text weight="semibold">{stats.imageCount}</Text>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Music className="w-4 h-4 text-accent" />
                          <Text variant="muted">Audio</Text>
                        </div>
                        <Text weight="semibold">{stats.audioCount}</Text>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4 text-success-600" />
                          <Text variant="muted">Videos</Text>
                        </div>
                        <Text weight="semibold">{stats.videoCount}</Text>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Stagger>
            </div>

            {/* Right Column - Content Gallery */}
            <div className="lg:col-span-2">
              <FadeIn>
                <div className="mb-6">
                  <Heading as="h3" className="mb-2">
                    Content Created with {singer.name}
                  </Heading>
                  <Text variant="muted">
                    All generated images, audio, and videos featuring this singer
                  </Text>
                </div>
              </FadeIn>

              {/* Error Display */}
              {error && (
                <ScaleIn>
                  <Card variant="default" className="border-error-200 bg-error-50 mb-6">
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

              {/* Assets Grid */}
              {assets.length === 0 ? (
                <ScaleIn>
                  <Card variant="glass">
                    <CardContent className="p-12 text-center">
                      <Text variant="muted" className="mb-4">
                        No content created yet with this singer.
                      </Text>
                      <Button variant="primary" onClick={() => router.push('/dashboard')}>
                        Start Creating
                      </Button>
                    </CardContent>
                  </Card>
                </ScaleIn>
              ) : (
                <Stagger staggerDelay={50} animation="scale">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {assets.map((asset) => (
                      <Card key={asset.id} variant="interactive" className="overflow-hidden">
                        {/* Preview */}
                        <div className="aspect-square bg-muted relative">
                          {asset.type === 'image' && (
                            <img
                              src={asset.url}
                              alt="Generated content"
                              className="w-full h-full object-cover"
                            />
                          )}
                          {asset.type === 'audio' && (
                            <div className="w-full h-full flex items-center justify-center">
                              <Music className="w-16 h-16 text-muted-foreground" />
                            </div>
                          )}
                          {asset.type === 'video' && (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video className="w-16 h-16 text-muted-foreground" />
                            </div>
                          )}

                          {/* Type Badge */}
                          <div className="absolute top-3 left-3">
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full bg-background/90 backdrop-blur-sm ${getTypeColor(asset.type)}`}>
                              {getTypeIcon(asset.type)}
                              <Text size="xs" weight="semibold" className="capitalize">
                                {asset.type}
                              </Text>
                            </div>
                          </div>
                        </div>

                        {/* Info */}
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <Text size="sm" variant="muted" className="mb-1">
                                {asset.provider}
                              </Text>
                              <Text size="sm" variant="muted">
                                {formatDate(asset.createdAt)}
                              </Text>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleDownload(asset)}
                              variant="outline"
                              size="sm"
                              fullWidth
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </Button>
                            <Button
                              onClick={() => handleShare(asset)}
                              variant="ghost"
                              size="sm"
                            >
                              <Share2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </Stagger>
              )}
            </div>
          </div>
        </div>
      </div>
    </MotionProvider>
  );
}

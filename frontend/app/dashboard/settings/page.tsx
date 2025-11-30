'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, usersAPI, APIClientError } from '@/lib/api-client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Heading,
  Text,
  Spin,
  FadeIn,
  SlideIn,
  Stagger,
  ScaleIn,
} from '@/components/ui';

type UserData = {
  userId: string;
  email: string;
  authenticated: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    subscriptionTier: string;
    subscriptionStatus: string;
  };
  subscriptionTier: string;
  subscriptionStatus: string;
};

type UsageData = {
  tier: string;
  imagesRemaining: number;
  imagesUsed: number;
  songsRemaining: number;
  songsUsed: number;
  videosRemaining: number;
  videosUsed: number;
  resetAt: number;
};

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      const [userData, usageData] = await Promise.all([
        authAPI.me(),
        usersAPI.getUsage(),
      ]);

      setUser(userData as UserData);

      // Handle multiple possible response structures from backend
      const quotaData = (usageData as any).entitlements ||
                       (usageData as any).quota ||
                       (usageData as any).data ||
                       usageData;

      setUsage(quotaData as UsageData);
      setLoading(false);
    } catch (err) {
      console.error('[Settings] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await authAPI.logout();

      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('token');

      // Redirect to sign-in
      router.push('/sign-in');
    } catch (err) {
      console.error('[Settings] Logout error:', err);
      alert('Failed to logout');
      setLoggingOut(false);
    }
  }

  function formatResetDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function getTierColor(tier: string): string {
    switch (tier.toLowerCase()) {
      case 'free':
        return 'from-slate-500 to-slate-600';
      case 'pro':
        return 'from-violet-500 to-fuchsia-500';
      case 'premium':
        return 'from-amber-500 to-orange-500';
      default:
        return 'from-slate-500 to-slate-600';
    }
  }

  function getTierBadgeColor(tier: string): string {
    switch (tier.toLowerCase()) {
      case 'free':
        return 'text-slate-700 bg-slate-100 border-slate-200';
      case 'pro':
        return 'text-violet-700 bg-violet-100 border-violet-200';
      case 'premium':
        return 'text-amber-700 bg-amber-100 border-amber-200';
      default:
        return 'text-slate-700 bg-slate-100 border-slate-200';
    }
  }

  function getUsagePercentage(used: number, remaining: number): number {
    const total = used + remaining;
    if (total === 0) return 0;
    return Math.round((used / total) * 100);
  }

  function getProgressColor(percentage: number): string {
    if (percentage >= 90) return 'from-red-500 to-red-600';
    if (percentage >= 70) return 'from-orange-500 to-orange-600';
    if (percentage >= 50) return 'from-yellow-500 to-yellow-600';
    return 'from-green-500 to-green-600';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spin size="lg" className="text-primary" />
      </div>
    );
  }

  if (!user || !usage) {
    return (
      <div className="space-y-8">
        <Card variant="default" className="border-error-200 bg-error-50">
          <CardContent className="p-6 text-center">
            <Text className="text-error-700 mb-4">Failed to load settings</Text>
            <Button onClick={() => loadData()} variant="primary" size="md">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const imagesPercentage = getUsagePercentage(usage.imagesUsed, usage.imagesRemaining);
  const songsPercentage = getUsagePercentage(usage.songsUsed, usage.songsRemaining);
  const videosPercentage = getUsagePercentage(usage.videosUsed, usage.videosRemaining);

  return (
    <div className="space-y-8">
      <FadeIn>
        <div className="flex justify-between items-center">
          <div>
            <Heading as="h1">Account Settings</Heading>
            <Text variant="muted" className="mt-2">Manage your profile, subscription, and usage</Text>
          </div>
        </div>
      </FadeIn>

      {/* Error Message */}
      {error && (
        <ScaleIn>
          <Card variant="default" className="border-error-200 bg-error-50">
            <CardContent className="p-4">
              <Text className="text-error-700">{error}</Text>
            </CardContent>
          </Card>
        </ScaleIn>
      )}

      <Stagger>
        {/* Profile Section */}
        <SlideIn direction="bottom">
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                {/* Avatar */}
                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getTierColor(usage.tier)} flex items-center justify-center text-white text-3xl font-bold shadow-xl`}>
                  {user.user.name[0]?.toUpperCase() || 'U'}
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-slate-900 mb-1">
                    {user.user.name}
                  </h3>
                  <Text variant="muted" className="mb-2">{user.email}</Text>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border ${getTierBadgeColor(usage.tier)}`}>
                      {usage.tier} Plan
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold capitalize text-green-700 bg-green-100 border border-green-200">
                      {user.subscriptionStatus}
                    </span>
                  </div>
                </div>

                {/* Logout Button */}
                <Button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  loading={loggingOut}
                  variant="outline"
                  size="md"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  {loggingOut ? 'Logging out...' : 'Logout'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </SlideIn>

        {/* Subscription Section */}
        <SlideIn direction="bottom">
          <Card variant="glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Subscription</CardTitle>
                {usage.tier.toLowerCase() === 'free' && (
                  <Button variant="primary" size="sm">
                    Upgrade to Pro
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Current Plan */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border-2 border-violet-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    </div>
                    <div>
                      <Text className="text-sm font-semibold text-violet-700">Current Plan</Text>
                      <Text className="text-2xl font-bold text-slate-900 capitalize">{usage.tier}</Text>
                    </div>
                  </div>
                  <Text variant="muted" className="text-sm">
                    {usage.tier.toLowerCase() === 'free' && 'Limited features for testing'}
                    {usage.tier.toLowerCase() === 'pro' && 'Full access to all features'}
                    {usage.tier.toLowerCase() === 'premium' && 'Unlimited everything'}
                  </Text>
                </div>

                {/* Status */}
                <div className="p-6 rounded-2xl bg-white/70 border border-slate-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <Text className="text-sm font-semibold text-slate-600">Status</Text>
                      <Text className="text-2xl font-bold text-green-700 capitalize">{user.subscriptionStatus}</Text>
                    </div>
                  </div>
                  <Text variant="muted" className="text-sm">
                    Your subscription is active and working
                  </Text>
                </div>

                {/* Reset Date */}
                <div className="p-6 rounded-2xl bg-white/70 border border-slate-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <Text className="text-sm font-semibold text-slate-600">Quota Resets</Text>
                      <Text className="text-lg font-bold text-slate-900">{formatResetDate(usage.resetAt)}</Text>
                    </div>
                  </div>
                  <Text variant="muted" className="text-sm">
                    Your usage limits will refresh
                  </Text>
                </div>
              </div>
            </CardContent>
          </Card>
        </SlideIn>

        {/* Usage Statistics */}
        <SlideIn direction="bottom">
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Usage Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Images - ENHANCED: Gamified holographic ring */}
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {/* Holographic Ring Visualization */}
                    <div className="relative w-16 h-16 flex-shrink-0">
                      {/* Glow effect */}
                      <div className={`absolute inset-0 rounded-full ${imagesPercentage >= 90 ? 'bg-red-400/30' : imagesPercentage >= 70 ? 'bg-orange-400/30' : 'bg-violet-400/30'} blur-xl animate-pulse`} />

                      {/* SVG Ring */}
                      <svg className="w-16 h-16 transform -rotate-90 relative" viewBox="0 0 64 64">
                        {/* Background ring */}
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="6"
                          className="text-slate-200"
                        />
                        {/* Progress ring with gradient */}
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          fill="none"
                          stroke="url(#imagesGradient)"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 28}`}
                          strokeDashoffset={`${2 * Math.PI * 28 * (1 - imagesPercentage / 100)}`}
                          className="transition-all duration-1000 drop-shadow-lg"
                        />
                        <defs>
                          <linearGradient id="imagesGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={imagesPercentage >= 90 ? '#ef4444' : imagesPercentage >= 70 ? '#f97316' : '#8b5cf6'} />
                            <stop offset="100%" stopColor={imagesPercentage >= 90 ? '#dc2626' : imagesPercentage >= 70 ? '#ea580c' : '#d946ef'} />
                          </linearGradient>
                        </defs>
                      </svg>
                      {/* Center percentage */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-sm font-bold ${imagesPercentage >= 90 ? 'text-red-600' : imagesPercentage >= 70 ? 'text-orange-600' : 'text-violet-600'}`}>
                          {imagesPercentage}%
                        </span>
                      </div>
                    </div>

                    <div>
                      <Text className="font-semibold text-slate-900">Image Generation</Text>
                      <Text variant="muted" className="text-sm">
                        {usage.imagesUsed} used • {usage.imagesRemaining} remaining
                      </Text>
                    </div>
                  </div>
                  <div className="text-right">
                    <Text className="text-3xl font-bold text-slate-900">{usage.imagesRemaining}</Text>
                    <Text variant="muted" className="text-xs">left</Text>
                  </div>
                </div>
              </div>

              {/* Songs - ENHANCED: Gamified holographic ring */}
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {/* Holographic Ring Visualization */}
                    <div className="relative w-16 h-16 flex-shrink-0">
                      {/* Glow effect */}
                      <div className={`absolute inset-0 rounded-full ${songsPercentage >= 90 ? 'bg-red-400/30' : songsPercentage >= 70 ? 'bg-orange-400/30' : 'bg-fuchsia-400/30'} blur-xl animate-pulse`} />

                      {/* SVG Ring */}
                      <svg className="w-16 h-16 transform -rotate-90 relative" viewBox="0 0 64 64">
                        {/* Background ring */}
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="6"
                          className="text-slate-200"
                        />
                        {/* Progress ring with gradient */}
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          fill="none"
                          stroke="url(#songsGradient)"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 28}`}
                          strokeDashoffset={`${2 * Math.PI * 28 * (1 - songsPercentage / 100)}`}
                          className="transition-all duration-1000 drop-shadow-lg"
                        />
                        <defs>
                          <linearGradient id="songsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={songsPercentage >= 90 ? '#ef4444' : songsPercentage >= 70 ? '#f97316' : '#d946ef'} />
                            <stop offset="100%" stopColor={songsPercentage >= 90 ? '#dc2626' : songsPercentage >= 70 ? '#ea580c' : '#ec4899'} />
                          </linearGradient>
                        </defs>
                      </svg>
                      {/* Center percentage */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-sm font-bold ${songsPercentage >= 90 ? 'text-red-600' : songsPercentage >= 70 ? 'text-orange-600' : 'text-fuchsia-600'}`}>
                          {songsPercentage}%
                        </span>
                      </div>
                    </div>

                    <div>
                      <Text className="font-semibold text-slate-900">Song Generation</Text>
                      <Text variant="muted" className="text-sm">
                        {usage.songsUsed} used • {usage.songsRemaining} remaining
                      </Text>
                    </div>
                  </div>
                  <div className="text-right">
                    <Text className="text-3xl font-bold text-slate-900">{usage.songsRemaining}</Text>
                    <Text variant="muted" className="text-xs">left</Text>
                  </div>
                </div>
              </div>

              {/* Videos - ENHANCED: Gamified holographic ring */}
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {/* Holographic Ring Visualization */}
                    <div className="relative w-16 h-16 flex-shrink-0">
                      {/* Glow effect */}
                      <div className={`absolute inset-0 rounded-full ${videosPercentage >= 90 ? 'bg-red-400/30' : videosPercentage >= 70 ? 'bg-orange-400/30' : 'bg-purple-400/30'} blur-xl animate-pulse`} />

                      {/* SVG Ring */}
                      <svg className="w-16 h-16 transform -rotate-90 relative" viewBox="0 0 64 64">
                        {/* Background ring */}
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="6"
                          className="text-slate-200"
                        />
                        {/* Progress ring with gradient */}
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          fill="none"
                          stroke="url(#videosGradient)"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 28}`}
                          strokeDashoffset={`${2 * Math.PI * 28 * (1 - videosPercentage / 100)}`}
                          className="transition-all duration-1000 drop-shadow-lg"
                        />
                        <defs>
                          <linearGradient id="videosGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={videosPercentage >= 90 ? '#ef4444' : videosPercentage >= 70 ? '#f97316' : '#9333ea'} />
                            <stop offset="100%" stopColor={videosPercentage >= 90 ? '#dc2626' : videosPercentage >= 70 ? '#ea580c' : '#7e22ce'} />
                          </linearGradient>
                        </defs>
                      </svg>
                      {/* Center percentage */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-sm font-bold ${videosPercentage >= 90 ? 'text-red-600' : videosPercentage >= 70 ? 'text-orange-600' : 'text-purple-600'}`}>
                          {videosPercentage}%
                        </span>
                      </div>
                    </div>

                    <div>
                      <Text className="font-semibold text-slate-900">Video Generation</Text>
                      <Text variant="muted" className="text-sm">
                        {usage.videosUsed} used • {usage.videosRemaining} remaining
                      </Text>
                    </div>
                  </div>
                  <div className="text-right">
                    <Text className="text-3xl font-bold text-slate-900">{usage.videosRemaining}</Text>
                    <Text variant="muted" className="text-xs">left</Text>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </SlideIn>

        {/* Quick Actions */}
        <SlideIn direction="bottom">
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                  href="/dashboard/singers"
                  className="p-6 rounded-xl bg-white/70 border border-slate-200 hover:border-violet-300 hover:shadow-lg transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <Text className="font-bold text-slate-900 mb-1">Manage Singers</Text>
                  <Text variant="muted" className="text-sm">Create and edit AI singers</Text>
                </a>

                <a
                  href="/dashboard/gallery"
                  className="p-6 rounded-xl bg-white/70 border border-slate-200 hover:border-violet-300 hover:shadow-lg transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-600 to-pink-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <Text className="font-bold text-slate-900 mb-1">View Gallery</Text>
                  <Text variant="muted" className="text-sm">Browse generated content</Text>
                </a>

                <a
                  href="/dashboard/jobs"
                  className="p-6 rounded-xl bg-white/70 border border-slate-200 hover:border-violet-300 hover:shadow-lg transition-all duration-300 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <Text className="font-bold text-slate-900 mb-1">Track Jobs</Text>
                  <Text variant="muted" className="text-sm">Monitor generation progress</Text>
                </a>
              </div>
            </CardContent>
          </Card>
        </SlideIn>
      </Stagger>
    </div>
  );
}

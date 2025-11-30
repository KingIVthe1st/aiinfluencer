'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  PremiumCard,
  PremiumCardStat,
  PremiumButton,
  CardSkeleton,
  ErrorEmptyState,
  NoSingersEmptyState,
} from '@/components/premium';
import {
  MotionProvider,
  GradientText,
  FadeIn,
  Stagger,
  Heading,
} from '@/components/ui';
import { singersAPI, assetsAPI, jobsAPI } from '@/lib/api-client';

interface DashboardStats {
  totalSingers: number;
  totalVideos: number;
  totalImages: number;
  totalAudio: number;
}

interface RecentJob {
  id: string;
  type: 'image' | 'song' | 'video';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  singerName: string | null;
}

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalSingers: 0,
    totalVideos: 0,
    totalImages: 0,
    totalAudio: 0,
  });
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [hasSingers, setHasSingers] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    setError(null);

    try {
      // Parallel API calls for performance
      const [singersResponse, assetsStatsResponse, jobsResponse] = await Promise.allSettled([
        singersAPI.list(),
        assetsAPI.getStats(),
        jobsAPI.list({ limit: 5 }),
      ]);

      // Extract singers data
      let singersCount = 0;
      if (singersResponse.status === 'fulfilled') {
        singersCount = singersResponse.value.singers?.length || 0;
        setHasSingers(singersCount > 0);
      }

      // Extract asset stats
      let assetStats = { images: 0, videos: 0, audio: 0 };
      if (assetsStatsResponse.status === 'fulfilled') {
        assetStats = assetsStatsResponse.value.stats;
      }

      // Extract recent jobs
      let jobs: RecentJob[] = [];
      if (jobsResponse.status === 'fulfilled') {
        jobs = jobsResponse.value.jobs.map((job) => ({
          id: job.id,
          type: job.type,
          status: job.status,
          createdAt: job.createdAt,
          singerName: job.singerName,
        }));
      }

      setStats({
        totalSingers: singersCount,
        totalVideos: assetStats.videos,
        totalImages: assetStats.images,
        totalAudio: assetStats.audio,
      });
      setRecentJobs(jobs);
    } catch (err) {
      console.error('[Dashboard] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    {
      name: 'AI Influencers',
      value: stats.totalSingers,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
      link: '/dashboard/singers',
    },
    {
      name: 'Videos Generated',
      value: stats.totalVideos,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      link: '/generate/video',
    },
    {
      name: 'Images Created',
      value: stats.totalImages,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      link: '/generate/image',
    },
    {
      name: 'Audio Tracks',
      value: stats.totalAudio,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
      ),
      link: '/generate/song',
    },
  ];

  const quickActions = [
    {
      name: 'Create Influencer',
      description: 'Add a new AI influencer with custom persona',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      href: '/dashboard/singers',
    },
    {
      name: 'Generate Video',
      description: 'Create videos with Sora 2 or Veo 3',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      href: '/generate/video',
    },
    {
      name: 'Generate Image',
      description: 'Create stunning AI-generated images',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      href: '/generate/image',
    },
    {
      name: 'Generate Audio',
      description: 'Produce music, speech, or sound effects',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
      ),
      href: '/generate/song',
    },
  ];

  // Early return for "no singers" state
  if (!loading && !error && !hasSingers) {
    return (
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 p-8 shadow-2xl shadow-violet-500/40">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')] opacity-30" />
          <div className="relative z-10">
            <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-lg">Welcome to AI Influencer Studio</h1>
            <p className="text-xl text-white/95 mb-6 max-w-2xl drop-shadow">
              Create stunning AI-powered content with your custom influencers. Let's get started!
            </p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        </div>

        {/* No Singers Empty State */}
        <NoSingersEmptyState onCreateSinger={() => (window.location.href = '/dashboard/singers')} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-8">
        <ErrorEmptyState onRetry={fetchDashboardData} />
      </div>
    );
  }

  return (
    <MotionProvider>
      <div className="space-y-8">
        {/* Welcome Section */}
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 p-8 shadow-2xl shadow-violet-500/40">
        {/* Noise texture overlay for premium feel */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')] opacity-30" />

        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-lg">Welcome to AI Influencer Studio</h1>
          <p className="text-xl text-white/95 mb-6 max-w-2xl drop-shadow">
            Create stunning AI-powered content with your custom influencers. Generate videos, images, and audio in seconds.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/generate/video"
              className="group relative px-6 py-3 bg-white text-violet-700 rounded-xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-violet-100 to-transparent" />
              <span className="relative flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Start Creating
              </span>
            </Link>
            <Link
              href="/dashboard/gallery"
              className="px-6 py-3 bg-slate-900/60 backdrop-blur-xl text-white border-2 border-white/40 rounded-xl font-semibold hover:bg-slate-900/70 transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              View Gallery
            </Link>
          </div>
        </div>

        {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          </div>
        </FadeIn>

      {/* Stats Grid - PREMIUM CARDS WITH GLOW */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CardSkeleton count={4} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <Link
              key={stat.name}
              href={stat.link}
              className="block"
              style={{
                animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
              }}
            >
              <PremiumCard variant="glass" hover glow padding="md">
                <PremiumCardStat label={stat.name} value={stat.value} icon={stat.icon} />
              </PremiumCard>
            </Link>
          ))}
        </div>
      )}

        {/* Quick Actions - GRADIENT CARDS */}
        <div>
          <FadeIn delay={0.2}>
            <Heading as="h2" className="mb-6 flex items-center gap-3">
              <div className="w-1 h-8 bg-gradient-to-b from-violet-600 to-fuchsia-600 rounded-full" />
              <GradientText>Quick Actions</GradientText>
            </Heading>
          </FadeIn>
          <Stagger staggerDelay={100} animation="fade">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quickActions.map((action) => (
                <Link
                  key={action.name}
                  href={action.href}
                  className="block"
                >
                  <PremiumCard variant="gradient" hover padding="md">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-white">
                    {action.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">{action.name}</h3>
                    <p className="text-sm text-white/80">{action.description}</p>
                  </div>
                  <svg
                    className="w-5 h-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                  </PremiumCard>
                </Link>
              ))}
            </div>
          </Stagger>
        </div>

        {/* Recent Activity */}
        <div>
          <FadeIn delay={0.4}>
            <Heading as="h2" className="mb-6 flex items-center gap-3">
              <div className="w-1 h-8 bg-gradient-to-b from-violet-600 to-fuchsia-600 rounded-full" />
              <GradientText>Recent Activity</GradientText>
            </Heading>
          </FadeIn>

        {loading ? (
          <PremiumCard variant="glass" padding="md">
            <CardSkeleton count={3} />
          </PremiumCard>
        ) : recentJobs.length === 0 ? (
          <PremiumCard variant="bordered" padding="lg" className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 blur-xl opacity-40 animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No recent activity</h3>
            <p className="text-slate-300 mb-6">Your creative journey starts here. Let's make something amazing!</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <PremiumButton
                variant="gradient"
                size="lg"
                glow
                onClick={() => (window.location.href = '/generate/video')}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                }
              >
                Create Your First Project
              </PremiumButton>
              <PremiumButton variant="ghost" size="lg" onClick={() => (window.location.href = '/dashboard/singers')}>
                Create an Influencer
              </PremiumButton>
            </div>
          </PremiumCard>
        ) : (
          <PremiumCard variant="glass" padding="md">
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors duration-200"
                >
                  <div className="flex-shrink-0">
                    {job.status === 'completed' && (
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                    {job.status === 'processing' && (
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      </div>
                    )}
                    {job.status === 'failed' && (
                      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white capitalize">
                      {job.type} Generation {job.singerName && `• ${job.singerName}`}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(job.createdAt).toLocaleString()} • {job.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            </PremiumCard>
          )}
        </div>

        {/* Add fadeInUp animation */}
        <style jsx>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </MotionProvider>
  );
}

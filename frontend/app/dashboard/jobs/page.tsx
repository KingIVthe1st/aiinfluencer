'use client';

import { useState, useEffect } from 'react';
import { jobsAPI, APIClientError } from '@/lib/api-client';
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

type Job = {
  id: string;
  type: 'image' | 'song' | 'video';
  provider: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error: string | null;
  createdAt: number;
  updatedAt: number;
  singerId: string | null;
  singerName: string | null;
  resultAssetId: string | null;
  assetUrl: string | null;
};

type Stats = {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  byType: {
    image: number;
    song: number;
    video: number;
  };
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    byType: { image: 0, song: 0, video: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'failed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'song' | 'video'>('all');

  // Auto-refresh for active jobs
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter]);

  // Auto-refresh every 5 seconds if there are active jobs
  useEffect(() => {
    if (!autoRefresh) return;

    const hasActiveJobs = jobs.some(job => job.status === 'pending' || job.status === 'processing');
    if (!hasActiveJobs) return;

    const interval = setInterval(() => {
      loadData(true); // Silent refresh
    }, 5000);

    return () => clearInterval(interval);
  }, [jobs, autoRefresh]);

  async function loadData(silent = false) {
    try {
      if (!silent) {
        setLoading(true);
        setError('');
      }

      console.log('[Jobs Page] Loading data with filters:', { statusFilter, typeFilter });

      const params: any = { limit: 100 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.type = typeFilter;

      console.log('[Jobs Page] Calling API with params:', params);

      // Load jobs
      const jobsData = await jobsAPI.list(params);

      console.log('[Jobs Page] API response - jobs:', jobsData);
      console.log('[Jobs Page] Jobs array length:', jobsData?.jobs?.length);
      console.log('[Jobs Page] First 3 jobs:', jobsData?.jobs?.slice(0, 3));

      setJobs(jobsData.jobs);

      // Try to load stats, but calculate from jobs if endpoint doesn't exist
      try {
        const statsData = await jobsAPI.getStats();
        setStats(statsData.stats);
      } catch (statsErr) {
        console.log('[Jobs Page] Stats endpoint not available, calculating from jobs data');
        // Calculate stats from jobs data
        const calculatedStats = {
          total: jobsData.jobs.length,
          pending: jobsData.jobs.filter((j: Job) => j.status === 'pending').length,
          processing: jobsData.jobs.filter((j: Job) => j.status === 'processing').length,
          completed: jobsData.jobs.filter((j: Job) => j.status === 'completed').length,
          failed: jobsData.jobs.filter((j: Job) => j.status === 'failed').length,
          byType: {
            image: jobsData.jobs.filter((j: Job) => j.type === 'image').length,
            song: jobsData.jobs.filter((j: Job) => j.type === 'song').length,
            video: jobsData.jobs.filter((j: Job) => j.type === 'video').length,
          },
        };
        setStats(calculatedStats);
      }

      console.log('[Jobs Page] State updated - jobs count:', jobsData.jobs.length);
      if (!silent) setLoading(false);
    } catch (err) {
      console.error('[Jobs Page] Load error:', err);
      console.error('[Jobs Page] Error details:', JSON.stringify(err, null, 2));
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
      if (!silent) setLoading(false);
    }
  }

  async function handleRetry(jobId: string) {
    try {
      await jobsAPI.retry(jobId);
      await loadData();
    } catch (err) {
      console.error('[Jobs] Retry error:', err);
      alert('Failed to retry job');
    }
  }

  async function handleDelete(jobId: string) {
    if (!confirm('Are you sure you want to delete this job?')) return;

    try {
      await jobsAPI.delete(jobId);
      await loadData();
    } catch (err) {
      console.error('[Jobs] Delete error:', err);
      alert('Failed to delete job');
    }
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'text-slate-600 bg-slate-100 border-slate-200';
      case 'processing': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'completed': return 'text-green-600 bg-green-100 border-green-200';
      case 'failed': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-slate-600 bg-slate-100 border-slate-200';
    }
  }

  function getTypeIcon(type: string): JSX.Element {
    switch (type) {
      case 'image':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'song':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        );
      case 'video':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      default:
        return <></>;
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
          <div>
            <Heading as="h1">Job Center</Heading>
            <Text variant="muted" className="mt-2">Track your content generation jobs in real-time</Text>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 ${
                autoRefresh
                  ? 'text-green-700 bg-green-100 border border-green-200'
                  : 'text-slate-700 bg-slate-100 border border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {autoRefresh ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {autoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}
              </div>
            </button>
            <Button onClick={() => loadData()} variant="outline" size="md">
              Refresh
            </Button>
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

      {/* Statistics Cards */}
      <Stagger>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card variant="glass" className="group hover:scale-105 transition-transform duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Text variant="muted" className="text-sm">Total</Text>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <Text className="text-3xl font-bold text-slate-900">{stats.total}</Text>
            </CardContent>
          </Card>

          <Card variant="glass" className="group hover:scale-105 transition-transform duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Text variant="muted" className="text-sm">Pending</Text>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <Text className="text-3xl font-bold text-slate-900">{stats.pending}</Text>
            </CardContent>
          </Card>

          <Card variant="glass" className="group hover:scale-105 transition-transform duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Text variant="muted" className="text-sm">Processing</Text>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <Spin size="sm" className="text-blue-600" />
                </div>
              </div>
              <Text className="text-3xl font-bold text-blue-900">{stats.processing}</Text>
            </CardContent>
          </Card>

          <Card variant="glass" className="group hover:scale-105 transition-transform duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Text variant="muted" className="text-sm">Completed</Text>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <Text className="text-3xl font-bold text-green-900">{stats.completed}</Text>
            </CardContent>
          </Card>

          <Card variant="glass" className="group hover:scale-105 transition-transform duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Text variant="muted" className="text-sm">Failed</Text>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <Text className="text-3xl font-bold text-red-900">{stats.failed}</Text>
            </CardContent>
          </Card>
        </div>
      </Stagger>

      {/* Filters */}
      <SlideIn direction="bottom">
        <Card variant="glass">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Status Filter */}
              <div>
                <Text className="font-semibold mb-3 text-slate-700">Filter by Status</Text>
                <div className="flex flex-wrap gap-2">
                  {['all', 'pending', 'processing', 'completed', 'failed'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status as any)}
                      className={`px-4 py-2 rounded-xl font-semibold capitalize transition-all duration-300 ${
                        statusFilter === status
                          ? 'text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-lg'
                          : 'text-slate-700 bg-white hover:bg-slate-50 border border-slate-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <Text className="font-semibold mb-3 text-slate-700">Filter by Type</Text>
                <div className="flex flex-wrap gap-2">
                  {['all', 'image', 'song', 'video'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type as any)}
                      className={`px-4 py-2 rounded-xl font-semibold capitalize transition-all duration-300 ${
                        typeFilter === type
                          ? 'text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 shadow-lg'
                          : 'text-slate-700 bg-white hover:bg-slate-50 border border-slate-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </SlideIn>

      {/* Jobs List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-1 h-8 bg-gradient-to-b from-violet-600 to-fuchsia-600 rounded-full" />
            Jobs
          </h2>
          <Text variant="muted">{jobs.length} total</Text>
        </div>

        {jobs.length === 0 ? (
          <div className="rounded-2xl bg-white/70 backdrop-blur-xl p-12 border border-slate-200/50 shadow-lg text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No jobs found</h3>
            <p className="text-slate-600 mb-6">Start generating content to see jobs here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <SlideIn key={job.id} direction="bottom">
                <Card variant="glass" className="group hover:shadow-2xl transition-all duration-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-6">
                      {/* Left: Job Info */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-4">
                          {/* Type Icon */}
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white shadow-lg">
                            {getTypeIcon(job.type)}
                          </div>

                          {/* Job Details */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-lg font-bold text-slate-900 capitalize">
                                {job.type} Generation
                              </h3>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border ${getStatusColor(job.status)}`}>
                                {job.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <span>Provider: {job.provider}</span>
                              {job.singerName && (
                                <>
                                  <span>•</span>
                                  <span>Singer: {job.singerName}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>{formatDate(job.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        {/* ENHANCED: Holographic Progress Bar for Processing Jobs */}
                        {job.status === 'processing' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <Text variant="muted" className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                Processing...
                              </Text>
                              <Text className="font-bold text-blue-600 text-base">{job.progress}%</Text>
                            </div>
                            {/* Holographic progress bar */}
                            <div className="relative h-3 bg-slate-200/50 rounded-full overflow-hidden backdrop-blur-sm">
                              {/* Glow effect behind */}
                              <div
                                className="absolute inset-0 bg-gradient-to-r from-blue-400 to-violet-400 blur-md opacity-40"
                                style={{ width: `${job.progress}%` }}
                              />
                              {/* Main progress bar with shimmer */}
                              <div
                                className="relative h-full bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 transition-all duration-500 rounded-full overflow-hidden"
                                style={{ width: `${job.progress}%` }}
                              >
                                {/* Animated shimmer overlay */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" style={{ animationDuration: '2s' }} />
                              </div>
                              {/* Highlight glow at progress end */}
                              <div
                                className="absolute top-0 bottom-0 w-1 bg-white/80 blur-sm transition-all duration-500"
                                style={{ left: `${job.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Error Message for Failed Jobs */}
                        {job.status === 'failed' && job.error && (
                          <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                            <Text className="text-sm text-red-700 font-medium">
                              Error: {job.error}
                            </Text>
                          </div>
                        )}

                        {/* Success Message with Link for Completed Jobs */}
                        {job.status === 'completed' && job.assetUrl && (
                          <a
                            href={`/dashboard/gallery?asset=${job.resultAssetId}`}
                            className="inline-flex items-center gap-2 text-sm text-green-700 font-semibold hover:text-green-800 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            View in Gallery
                          </a>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-col gap-2">
                        {job.status === 'failed' && (
                          <Button
                            onClick={() => handleRetry(job.id)}
                            variant="primary"
                            size="sm"
                          >
                            Retry
                          </Button>
                        )}
                        <Button
                          onClick={() => handleDelete(job.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </SlideIn>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api-client';
import DashboardLayout from '@/components/DashboardLayout';

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const data = await authAPI.me() as any;
      if (data.authenticated) {
        setUser(data.user || data);
        setLoading(false);
      } else {
        router.push('/sign-in?redirect=/dashboard/singers');
      }
    } catch (error) {
      console.error('[Dashboard] Auth check failed:', error);
      router.push('/sign-in?redirect=/dashboard/singers');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          {/* Premium loading spinner */}
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-violet-200 animate-pulse" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-600 animate-spin" />
          </div>
          <p className="text-sm font-medium text-slate-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return <DashboardLayout user={user}>{children}</DashboardLayout>;
}

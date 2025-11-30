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
      <div className="min-h-screen bg-[#030014] flex items-center justify-center relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-fuchsia-600/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <div className="relative text-center">
          {/* Premium loading spinner */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500 animate-spin" />
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-fuchsia-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <p className="text-sm font-medium text-white/60">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return <DashboardLayout user={user}>{children}</DashboardLayout>;
}

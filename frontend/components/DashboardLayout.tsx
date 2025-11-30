'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api-client';

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: any;
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'My Influencers',
      href: '/dashboard/singers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      name: 'Generate',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      children: [
        {
          name: 'Images',
          href: '/generate/image',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
        },
        {
          name: 'Videos',
          href: '/generate/video',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          name: 'Voiceovers',
          href: '/generate/song',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          ),
        },
      ],
    },
    {
      name: 'Content Library',
      href: '/dashboard/gallery',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      name: 'Jobs',
      href: '/dashboard/jobs',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      badge: 'New',
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      localStorage.removeItem('token');
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#030014] text-white relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Animated grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Gradient orbs */}
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-violet-600/20 via-fuchsia-600/10 to-transparent rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '8s' }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-gradient-to-tl from-fuchsia-600/20 via-violet-600/10 to-transparent rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '10s', animationDelay: '2s' }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/5 rounded-full blur-[200px]" />
      </div>

      {/* Premium Dark Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 transition-all duration-500 ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="h-full bg-[#0a0a1a]/80 backdrop-blur-2xl border-r border-white/5 flex flex-col">
          {/* Logo Section */}
          <div className="p-6 border-b border-white/5">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                {/* Animated glow background */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl blur-lg opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Icon container */}
                <div className="relative w-11 h-11 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-violet-600 rounded-xl flex items-center justify-center shadow-xl shadow-violet-500/40 group-hover:shadow-violet-500/60 transition-all duration-500 group-hover:scale-105">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              </div>

              {isSidebarOpen && (
                <div className="flex flex-col">
                  <span className="text-xl font-bold tracking-tight">
                    <span className="bg-gradient-to-r from-white via-violet-200 to-white bg-clip-text text-transparent">AI</span>
                    <span className="text-white/60 font-light ml-1">Influencer</span>
                  </span>
                  <span className="text-[10px] text-white/30 uppercase tracking-widest">Studio</span>
                </div>
              )}
            </Link>

            {/* Collapse toggle */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="absolute top-6 -right-3 w-6 h-6 bg-[#0a0a1a] border border-white/10 rounded-full shadow-lg flex items-center justify-center hover:border-violet-500/50 transition-all duration-300 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
            >
              <svg
                className={`w-3 h-3 text-white/60 group-hover:text-violet-400 transition-all duration-300 ${
                  isSidebarOpen ? '' : 'rotate-180'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              if (item.children) {
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => setIsGenerateOpen(!isGenerateOpen)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
                        isGenerateOpen
                          ? 'bg-white/5 text-white'
                          : 'text-white/60 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`transition-colors duration-300 ${
                            isGenerateOpen ? 'text-violet-400' : 'text-white/40 group-hover:text-violet-400'
                          }`}
                        >
                          {item.icon}
                        </div>
                        {isSidebarOpen && <span>{item.name}</span>}
                      </div>
                      {isSidebarOpen && (
                        <svg
                          className={`w-4 h-4 text-white/40 transition-transform duration-300 ${
                            isGenerateOpen ? 'rotate-90' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>

                    {/* Dropdown items */}
                    {isGenerateOpen && isSidebarOpen && (
                      <div className="mt-1 ml-4 space-y-1 border-l border-white/10 pl-4">
                        {item.children.map((child) => {
                          const childActive = isActive(child.href);
                          return (
                            <Link
                              key={child.name}
                              href={child.href}
                              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
                                childActive
                                  ? 'bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 text-white border border-violet-500/30'
                                  : 'text-white/50 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <span className={childActive ? 'text-violet-400' : 'text-white/40'}>{child.icon}</span>
                              <span>{child.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
                    active
                      ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {active && (
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 opacity-100" />
                  )}

                  <div className="relative flex items-center gap-3">
                    <div
                      className={`transition-colors duration-300 ${
                        active ? 'text-white' : 'text-white/40 group-hover:text-violet-400'
                      }`}
                    >
                      {item.icon}
                    </div>
                    {isSidebarOpen && <span>{item.name}</span>}
                  </div>

                  {item.badge && isSidebarOpen && (
                    <span className={`relative px-2 py-0.5 text-xs font-bold rounded-full ${
                      active
                        ? 'text-violet-600 bg-white'
                        : 'text-violet-400 bg-violet-500/20'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Profile Section */}
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5 group hover:bg-white/10 hover:border-white/10 transition-all duration-300">
              {/* Avatar */}
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-violet-500/30">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#0a0a1a] rounded-full" />
              </div>

              {isSidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {user?.name || user?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-white/40 truncate">{user?.email}</p>
                </div>
              )}

              {isSidebarOpen && (
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                  title="Sign out"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`transition-all duration-500 ${
          isSidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-[#030014]/80 backdrop-blur-2xl border-b border-white/5">
          <div className="px-8 py-5 flex items-center justify-between">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/40">Dashboard</span>
              {pathname !== '/dashboard' && (
                <>
                  <svg className="w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-semibold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                    {pathname.split('/').pop()?.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                </>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <button className="p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all duration-300 relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-fuchsia-500 rounded-full animate-pulse" />
              </button>

              <Link
                href="/generate/video"
                className="group relative px-5 py-2.5 overflow-hidden rounded-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 transition-all duration-300" />
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 blur-xl opacity-50 group-hover:opacity-80 transition-opacity duration-300" />
                {/* Animated shine effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <span className="relative flex items-center gap-2 text-sm font-semibold text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New
                </span>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-8 relative z-10">{children}</main>
      </div>
    </div>
  );
}

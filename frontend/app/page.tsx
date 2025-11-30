'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Sophisticated Multi-Layer Gradient Mesh Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary gradient orb - top left */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-br from-violet-500/30 via-fuchsia-500/20 to-transparent rounded-full blur-3xl animate-pulse"
             style={{ animationDuration: '8s' }} />

        {/* Secondary gradient orb - top right */}
        <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-gradient-to-bl from-pink-500/25 via-violet-400/20 to-transparent rounded-full blur-3xl animate-pulse"
             style={{ animationDuration: '10s', animationDelay: '2s' }} />

        {/* Tertiary gradient orb - center */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-fuchsia-500/15 via-violet-500/15 to-transparent rounded-full blur-3xl animate-pulse"
             style={{ animationDuration: '12s', animationDelay: '4s' }} />

        {/* Bottom accent orbs */}
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-gradient-to-t from-violet-500/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-t from-fuchsia-500/20 to-transparent rounded-full blur-3xl" />

        {/* Noise texture overlay for depth */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')] opacity-30" />
      </div>

      {/* Premium Glassmorphic Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/60 backdrop-blur-2xl border-b border-slate-200/50 shadow-sm shadow-violet-500/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3 group">
              <div className="relative">
                {/* Animated glow background */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl blur-lg opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Icon container */}
                <div className="relative w-11 h-11 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-xl shadow-violet-500/40 group-hover:shadow-violet-500/60 transition-all duration-500 group-hover:scale-105">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>

              <span className="text-2xl font-bold bg-gradient-to-r from-violet-700 via-fuchsia-600 to-violet-700 bg-clip-text text-transparent tracking-tight">
                AI Influencer
              </span>
            </div>

            {/* Navigation Links - Desktop */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-slate-700 hover:text-violet-600 transition-colors duration-300">
                Features
              </a>
              <a href="#pricing" className="text-sm font-medium text-slate-700 hover:text-violet-600 transition-colors duration-300">
                Pricing
              </a>
              <a href="#" className="text-sm font-medium text-slate-700 hover:text-violet-600 transition-colors duration-300">
                Docs
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-3">
              <Link href="/sign-in">
                <button className="hidden sm:block px-5 py-2.5 text-sm font-semibold text-slate-700 hover:text-violet-600 transition-all duration-300">
                  Sign In
                </button>
              </Link>

              <Link href="/sign-up">
                <button className="group relative px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl shadow-lg shadow-violet-500/40 hover:shadow-xl hover:shadow-violet-500/60 transition-all duration-500 hover:scale-105 overflow-hidden">
                  {/* Animated shine effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <span className="relative">Get Started</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Bento Grid Layout */}
      <section className="relative pt-32 pb-20 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Main Hero Content */}
          <div className="text-center mb-16 max-w-5xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-xl rounded-full border border-violet-200/50 shadow-sm shadow-violet-500/10 mb-8 group hover:shadow-md hover:shadow-violet-500/20 transition-all duration-500">
              <div className="w-2 h-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full animate-pulse" />
              <span className="text-sm font-semibold bg-gradient-to-r from-violet-700 to-fuchsia-600 bg-clip-text text-transparent">
                Built with next-generation AI designed for influencers, creators, and brands
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold mb-8 leading-[1.1] tracking-tight">
              <span className="inline-block bg-gradient-to-r from-slate-900 via-violet-900 to-slate-900 bg-clip-text text-transparent animate-gradient">
                Create AI Influencers
              </span>
              <br />
              <span className="inline-block mt-2 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 bg-clip-text text-transparent">
                Like Never Before
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl sm:text-2xl text-slate-600 leading-relaxed max-w-3xl mx-auto mb-12">
              Generate images, voiceovers, and videos with consistent AI influencer personas.
              <span className="text-violet-600 font-semibold"> The future of content creation</span> is here.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link href="/sign-up">
                <button className="group relative px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 rounded-2xl shadow-2xl shadow-violet-500/50 hover:shadow-violet-500/70 transition-all duration-500 hover:scale-105 overflow-hidden min-w-[200px]">
                  {/* Animated gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                       style={{ backgroundSize: '200% 100%', animation: 'gradient 3s ease infinite' }} />

                  {/* Shine effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                  <span className="relative flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Start Creating Free
                  </span>
                </button>
              </Link>

              <a href="#features">
                <button className="group px-8 py-4 text-lg font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-2xl shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-300/50 transition-all duration-500 hover:scale-105 border-2 border-slate-200 min-w-[200px]">
                  <span className="flex items-center justify-center gap-2">
                    Explore Features
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>
              </a>
            </div>

            {/* Social Proof Stats */}
            <div className="grid grid-cols-3 gap-6 sm:gap-12 max-w-2xl mx-auto">
              <div className="group">
                <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                  10K+
                </div>
                <div className="text-sm sm:text-base text-slate-600 font-medium">Content Created</div>
              </div>

              <div className="group">
                <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-br from-fuchsia-600 to-pink-600 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                  99.9%
                </div>
                <div className="text-sm sm:text-base text-slate-600 font-medium">Uptime</div>
              </div>

              <div className="group">
                <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-br from-violet-600 to-fuchsia-600 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                  &lt;2min
                </div>
                <div className="text-sm sm:text-base text-slate-600 font-medium">Avg Generation</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Premium Bento Grid */}
      <section id="features" className="relative py-24 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100/80 backdrop-blur-xl rounded-full mb-6">
              <svg className="w-4 h-4 text-violet-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-semibold text-violet-700">Everything You Need</span>
            </div>

            <h2 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-slate-900 to-violet-900 bg-clip-text text-transparent mb-6">
              Professional-Grade AI Tools
            </h2>

            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Build, create, and scale your content with cutting-edge AI technology
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 - AI Influencer Personas (Large Card) */}
            <div className="group lg:col-span-2 lg:row-span-2 relative bg-white/80 backdrop-blur-xl rounded-3xl border-2 border-slate-200/50 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-violet-500/20 transition-all duration-500 hover:scale-[1.02] hover:border-violet-300/50 overflow-hidden"
                 style={{
                   backgroundImage: 'url(/aisinger.png)',
                   backgroundSize: 'cover',
                   backgroundPosition: 'center',
                 }}>
              {/* Background overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/90 to-white/85 backdrop-blur-sm" />
              {/* Gradient glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative p-8 h-full flex flex-col">
                {/* Icon */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                  <div className="relative w-16 h-16 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/40">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-3xl font-bold text-slate-900 mb-4">
                  AI Influencer Personas
                </h3>

                <p className="text-lg text-slate-600 leading-relaxed mb-6 flex-grow">
                  Create unique AI influencers with custom voices and personalities that persist across all your content.
                  Build a consistent brand with personas that your audience will recognize and love.
                </p>

                {/* Feature badges */}
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 text-xs font-semibold text-violet-700 bg-violet-100 rounded-full">
                    Custom Voice
                  </span>
                  <span className="px-3 py-1 text-xs font-semibold text-fuchsia-700 bg-fuchsia-100 rounded-full">
                    Personality
                  </span>
                  <span className="px-3 py-1 text-xs font-semibold text-violet-700 bg-violet-100 rounded-full">
                    Consistency
                  </span>
                </div>
              </div>
            </div>

            {/* Feature 2 - Image Generation */}
            <div className="group lg:col-span-2 relative bg-white/80 backdrop-blur-xl rounded-3xl border-2 border-slate-200/50 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-fuchsia-500/20 transition-all duration-500 hover:scale-[1.02] hover:border-fuchsia-300/50 overflow-hidden"
                 style={{
                   backgroundImage: 'url(/imagegen.png)',
                   backgroundSize: 'cover',
                   backgroundPosition: 'center',
                 }}>
              {/* Background overlay for text readability with subtle pink tint */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/92 to-fuchsia-50/90 backdrop-blur-sm" />
              {/* Gradient glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative p-8">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500 to-pink-500 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                  <div className="relative w-14 h-14 bg-gradient-to-br from-fuchsia-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-fuchsia-500/40">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  Image Generation
                </h3>

                <p className="text-base text-slate-600 leading-relaxed">
                  Generate stunning visuals with Gemini AI, perfectly matched to your influencer personas and content style.
                </p>
              </div>
            </div>

            {/* Feature 3 - Voice & Audio */}
            <div className="group relative bg-white/80 backdrop-blur-xl rounded-3xl border-2 border-slate-200/50 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-violet-500/20 transition-all duration-500 hover:scale-[1.02] hover:border-violet-300/50 overflow-hidden">
              {/* Background overlay removed - clean white card */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative p-8">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                  <div className="relative w-14 h-14 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/40">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  Voice & Audio
                </h3>

                <p className="text-base text-slate-600 leading-relaxed">
                  Professional-quality voiceovers and audio content powered by ElevenLabs technology.
                </p>
              </div>
            </div>

            {/* Feature 4 - Video Production */}
            <div className="group relative bg-white/80 backdrop-blur-xl rounded-3xl border-2 border-slate-200/50 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-pink-500/20 transition-all duration-500 hover:scale-[1.02] hover:border-pink-300/50 overflow-hidden">
              {/* Background overlay removed - clean white card */}
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative p-8">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-fuchsia-500 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                  <div className="relative w-14 h-14 bg-gradient-to-br from-pink-600 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/40">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  Video Production
                </h3>

                <p className="text-base text-slate-600 leading-relaxed">
                  Cinematic videos using Sora 2 and Veo 3, the most advanced AI video models.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section - Floating Cards */}
      <section className="relative py-24 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Benefit 1 - Lightning Fast */}
            <div className="group relative">
              {/* Floating animation */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500 animate-pulse"
                   style={{ animationDuration: '4s' }} />

              <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl border-2 border-slate-200/50 shadow-2xl p-10 group-hover:scale-105 group-hover:shadow-violet-500/30 transition-all duration-500">
                <div className="flex flex-col items-center text-center">
                  {/* Icon */}
                  <div className="w-20 h-20 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-violet-500/50 mb-6 group-hover:rotate-6 group-hover:scale-110 transition-all duration-500">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900 mb-3">
                    Lightning Fast
                  </h3>

                  <p className="text-slate-600 leading-relaxed">
                    Generate professional content in minutes, not hours. Our optimized AI pipeline ensures rapid results.
                  </p>
                </div>
              </div>
            </div>

            {/* Benefit 2 - Enterprise Security */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600/20 to-pink-600/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500 animate-pulse"
                   style={{ animationDuration: '5s', animationDelay: '1s' }} />

              <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl border-2 border-slate-200/50 shadow-2xl p-10 group-hover:scale-105 group-hover:shadow-fuchsia-500/30 transition-all duration-500">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-fuchsia-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-fuchsia-500/50 mb-6 group-hover:rotate-6 group-hover:scale-110 transition-all duration-500">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900 mb-3">
                    Enterprise Security
                  </h3>

                  <p className="text-slate-600 leading-relaxed">
                    Your data is encrypted end-to-end and secure. We follow industry best practices.
                  </p>
                </div>
              </div>
            </div>

            {/* Benefit 3 - Real-Time Tracking */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-pink-600/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500 animate-pulse"
                   style={{ animationDuration: '6s', animationDelay: '2s' }} />

              <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl border-2 border-slate-200/50 shadow-2xl p-10 group-hover:scale-105 group-hover:shadow-pink-500/30 transition-all duration-500">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-violet-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-violet-500/50 mb-6 group-hover:rotate-6 group-hover:scale-110 transition-all duration-500">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900 mb-3">
                    Real-Time Tracking
                  </h3>

                  <p className="text-slate-600 leading-relaxed">
                    Monitor generation progress live with detailed status updates and preview functionality.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-24 px-6 lg:px-8 bg-slate-100/50">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-fuchsia-100/80 backdrop-blur-xl rounded-full mb-6">
              <svg className="w-4 h-4 text-fuchsia-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1zm-5 8.274l-.818 2.552c-.25.78.409 1.558 1.263 1.558.51 0 .982-.286 1.21-.737l.738-1.462.738 1.462c.228.451.7.737 1.21.737.854 0 1.514-.778 1.263-1.558l-.818-2.552a1 1 0 00-1.21-.737l-.738 1.462-.738-1.462a1 1 0 00-1.21-.737l-.818 2.552c-.25.78.409 1.558 1.263 1.558.51 0 .982-.286 1.21-.737l.738-1.462.738 1.462c.228.451.7.737 1.21.737z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-semibold text-fuchsia-700">Simple Pricing</span>
            </div>

            <h2 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-slate-900 to-fuchsia-900 bg-clip-text text-transparent mb-6">
              Choose Your Plan
            </h2>

            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Start free, scale as you grow. No hidden fees, cancel anytime.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <div className="group relative bg-white/90 backdrop-blur-xl rounded-3xl border-2 border-slate-200 shadow-xl p-8 hover:shadow-2xl hover:scale-105 transition-all duration-500">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Free</h3>
                <p className="text-slate-600 mb-6">Perfect for trying out</p>
                <div className="flex items-baseline">
                  <span className="text-5xl font-bold text-slate-900">$0</span>
                  <span className="text-slate-600 ml-2">/month</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-violet-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-700">5 images/month</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-violet-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-700">2 voiceovers/month</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-violet-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-700">1 video/month</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-violet-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-700">Basic support</span>
                </li>
              </ul>

              <Link href="/sign-up">
                <button className="w-full px-6 py-3 text-base font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-300">
                  Start Free
                </button>
              </Link>
            </div>

            {/* Pro Plan - Highlighted */}
            <div className="group relative bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-3xl shadow-2xl shadow-violet-500/50 p-8 transform scale-105 hover:scale-110 transition-all duration-500">
              {/* Popular badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-white rounded-full shadow-lg">
                <span className="text-sm font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                  Most Popular
                </span>
              </div>

              <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
                <p className="text-violet-100 mb-6">For creators & professionals</p>
                <div className="flex items-baseline">
                  <span className="text-5xl font-bold text-white">$29</span>
                  <span className="text-violet-100 ml-2">/month</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white">50 images/month</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white">20 voiceovers/month</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white">10 videos/month</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white">Priority support</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white">Advanced features</span>
                </li>
              </ul>

              <Link href="/sign-up">
                <button className="w-full px-6 py-3 text-base font-bold text-violet-600 bg-white hover:bg-violet-50 rounded-xl shadow-xl transition-all duration-300">
                  Go Pro
                </button>
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="group relative bg-white/90 backdrop-blur-xl rounded-3xl border-2 border-slate-200 shadow-xl p-8 hover:shadow-2xl hover:scale-105 transition-all duration-500">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Enterprise</h3>
                <p className="text-slate-600 mb-6">For teams & businesses</p>
                <div className="flex items-baseline">
                  <span className="text-5xl font-bold text-slate-900">$99</span>
                  <span className="text-slate-600 ml-2">/month</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-violet-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-700">Unlimited images</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-violet-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-700">Unlimited voiceovers</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-violet-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-700">Unlimited videos</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-violet-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-700">Dedicated support</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-violet-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-700">Custom integrations</span>
                </li>
              </ul>

              <Link href="/sign-up">
                <button className="w-full px-6 py-3 text-base font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-300">
                  Contact Sales
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-24 px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="relative group">
            {/* Animated gradient glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 rounded-[2.5rem] blur-3xl opacity-40 group-hover:opacity-60 transition-opacity duration-500" />

            {/* CTA Card */}
            <div className="relative bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 rounded-[2.5rem] shadow-2xl shadow-violet-500/50 p-12 sm:p-16 text-center overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

              <div className="relative">
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                  Ready to Create?
                </h2>

                <p className="text-xl sm:text-2xl text-violet-100 mb-10 max-w-2xl mx-auto">
                  Join thousands of creators using <span className="font-bold text-white">AI Influencer</span> to transform their content workflow
                </p>

                <div className="flex flex-col items-center gap-3">
                  <Link href="/sign-up">
                    <button className="group relative px-10 py-5 text-lg font-bold text-violet-600 bg-white hover:bg-violet-50 rounded-2xl shadow-2xl transition-all duration-500 hover:scale-105 overflow-hidden">
                      {/* Animated shine */}
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-violet-100 to-transparent" />

                      <span className="relative flex items-center justify-center gap-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Get Started Free
                      </span>
                    </button>
                  </Link>
                  <p className="text-sm text-violet-100 font-medium">
                    No credit card • Cancel anytime • Keep your creations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-6 lg:px-8 border-t border-slate-200 bg-white/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                AI Influencer
              </span>
            </div>

            {/* Copyright */}
            <p className="text-sm text-slate-600">
              © 2025 AI Influencer. All rights reserved.
            </p>

            {/* Links */}
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm font-medium text-slate-600 hover:text-violet-600 transition-colors duration-300">
                Privacy
              </a>
              <a href="#" className="text-sm font-medium text-slate-600 hover:text-violet-600 transition-colors duration-300">
                Terms
              </a>
              <a href="#" className="text-sm font-medium text-slate-600 hover:text-violet-600 transition-colors duration-300">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Custom animations and gradient keyframes */}
      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}

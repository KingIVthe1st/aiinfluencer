'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function Home() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    const handleScroll = () => setScrollY(window.scrollY);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#030014] text-white overflow-hidden">
      {/* Cursor Glow Effect */}
      <div
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(139, 92, 246, 0.06), transparent 40%)`,
        }}
      />

      {/* Animated Grid Background */}
      <div className="fixed inset-0 z-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/20 via-transparent to-fuchsia-950/20" />

        {/* Animated grid */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '100px 100px',
            transform: `translateY(${scrollY * 0.1}px)`,
          }}
        />

        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-fuchsia-600/15 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[200px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-[#030014]/80 backdrop-blur-2xl border-b border-white/5" />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl blur-lg opacity-50 group-hover:opacity-100 transition-all duration-500" />
                <div className="relative w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <span className="text-xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-white via-violet-200 to-white bg-clip-text text-transparent">AI</span>
                <span className="text-white/60 font-light ml-1">Influencer</span>
              </span>
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              {['Features', 'Pricing', 'Studio', 'Docs'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-sm text-white/60 hover:text-white transition-colors duration-300 relative group"
                >
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-gradient-to-r from-violet-500 to-fuchsia-500 group-hover:w-full transition-all duration-300" />
                </a>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-4">
              <Link href="/sign-in" className="text-sm text-white/60 hover:text-white transition-colors duration-300">
                Sign In
              </Link>
              <Link href="/sign-up">
                <button className="group relative px-5 py-2.5 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full transition-all duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full blur-xl opacity-50 group-hover:opacity-80 transition-opacity duration-300" />
                  <span className="relative text-sm font-medium text-white">Get Started</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-32">
          <div className="text-center">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8 group hover:bg-white/10 transition-all duration-500">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs text-green-400 font-medium">LIVE</span>
              </div>
              <div className="w-px h-4 bg-white/20" />
              <span className="text-sm text-white/70">Next-Gen AI Creator Studio</span>
              <svg className="w-4 h-4 text-white/40 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight mb-8">
              <span className="block text-white">Create Virtual</span>
              <span className="block mt-2 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                Influencers
              </span>
              <span className="block text-white/40 text-3xl sm:text-4xl lg:text-5xl font-light mt-4">
                That Captivate Millions
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-12 leading-relaxed">
              The world&apos;s most advanced AI studio for creating photorealistic virtual influencers.
              Generate stunning images, authentic voices, and cinematic videos—all with one consistent persona.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <Link href="/sign-up">
                <button className="group relative px-8 py-4 overflow-hidden rounded-2xl">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 transition-all duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 blur-2xl opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  </div>
                  <span className="relative flex items-center gap-2 text-base font-semibold text-white">
                    <span>Start Creating Free</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </button>
              </Link>

              <button className="group px-8 py-4 rounded-2xl border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all duration-300">
                <span className="flex items-center gap-2 text-base font-medium text-white/80 group-hover:text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Watch Demo
                </span>
              </button>
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16">
              {[
                { value: '50K+', label: 'Influencers Created' },
                { value: '10M+', label: 'Content Generated' },
                { value: '99.9%', label: 'Uptime SLA' },
                { value: '<30s', label: 'Avg Generation' },
              ].map((stat, i) => (
                <div key={i} className="text-center group">
                  <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent group-hover:from-violet-400 group-hover:to-fuchsia-400 transition-all duration-500">
                    {stat.value}
                  </div>
                  <div className="text-sm text-white/40 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-xs text-white/30 uppercase tracking-widest">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-white/30 to-transparent" />
        </div>
      </section>

      {/* Showcase Section - AI Influencer Demo */}
      <section className="relative py-32 overflow-hidden">
        {/* Background accents */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent" />

        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left side - Image showcase */}
            <div className="relative group order-2 lg:order-1">
              {/* Glow effect behind image */}
              <div className="absolute -inset-4 bg-gradient-to-r from-violet-600/30 via-fuchsia-600/30 to-pink-600/30 rounded-[3rem] blur-2xl opacity-60 group-hover:opacity-100 transition-all duration-700" />

              {/* Main image container */}
              <div className="relative">
                {/* Decorative frame */}
                <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 rounded-[2.5rem] opacity-80" />

                {/* Image wrapper */}
                <div className="relative rounded-[2.4rem] overflow-hidden bg-[#0a0a1a]">
                  <Image
                    src="/influencer1.jpg"
                    alt="AI-generated influencer creating content"
                    width={600}
                    height={750}
                    className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700"
                    priority
                  />

                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#030014]/90 via-transparent to-transparent" />

                  {/* Floating stats badges */}
                  <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                    <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-sm font-medium text-white">AI Generated</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20">
                      <svg className="w-4 h-4 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                      <span className="text-sm font-bold text-white">2.4M</span>
                    </div>
                  </div>
                </div>

                {/* Floating engagement card */}
                <div className="absolute -right-4 top-1/4 transform translate-x-4 group-hover:translate-x-0 transition-transform duration-500">
                  <div className="p-4 rounded-2xl bg-[#0a0a1a]/90 backdrop-blur-xl border border-white/10 shadow-2xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs text-white/40">Engagement</div>
                        <div className="text-lg font-bold text-white">+847%</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {[...Array(7)].map((_, i) => (
                        <div
                          key={i}
                          className="w-2 rounded-full bg-gradient-to-t from-violet-600 to-fuchsia-400"
                          style={{ height: `${20 + Math.random() * 30}px` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating platform icons */}
                <div className="absolute -left-4 bottom-1/3 transform -translate-x-4 group-hover:translate-x-0 transition-transform duration-500 delay-100">
                  <div className="p-3 rounded-2xl bg-[#0a0a1a]/90 backdrop-blur-xl border border-white/10 shadow-2xl">
                    <div className="flex flex-col gap-2">
                      {['TikTok', 'IG', 'YT'].map((platform, i) => (
                        <div key={platform} className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                            i === 0 ? 'bg-gradient-to-br from-pink-500 to-violet-600' :
                            i === 1 ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                            'bg-gradient-to-br from-red-500 to-red-600'
                          }`}>
                            {platform}
                          </div>
                          <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                i === 0 ? 'bg-gradient-to-r from-pink-500 to-violet-600 w-[90%]' :
                                i === 1 ? 'bg-gradient-to-r from-purple-500 to-pink-500 w-[75%]' :
                                'bg-gradient-to-r from-red-500 to-red-600 w-[60%]'
                              }`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Content */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 mb-6">
                <div className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-fuchsia-400 uppercase tracking-wider">See It In Action</span>
              </div>

              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                <span className="text-white">This Influencer</span>
                <br />
                <span className="bg-gradient-to-r from-fuchsia-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                  Doesn&apos;t Exist
                </span>
              </h2>

              <p className="text-lg text-white/50 leading-relaxed mb-8">
                She&apos;s 100% AI-generated. Her face, her voice, her content—all created in minutes using our studio.
                No model fees. No scheduling conflicts. No limitations. Just pure creative freedom.
              </p>

              <div className="space-y-4 mb-10">
                {[
                  { icon: '🎭', text: 'Photorealistic faces that pass as real' },
                  { icon: '🎙️', text: 'Natural voices in 29+ languages' },
                  { icon: '🎬', text: 'Cinematic videos in 4K resolution' },
                  { icon: '♾️', text: 'Infinite content with perfect consistency' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 group/item">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl group-hover/item:scale-110 group-hover/item:bg-white/10 transition-all duration-300">
                      {item.icon}
                    </div>
                    <span className="text-white/70 group-hover/item:text-white transition-colors duration-300">{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Link href="/sign-up">
                  <button className="group relative px-8 py-4 overflow-hidden rounded-2xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 via-pink-600 to-orange-500 transition-all duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 via-pink-600 to-orange-500 blur-xl opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
                    <span className="relative flex items-center gap-2 text-base font-semibold text-white">
                      Create Your Own
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </button>
                </Link>

                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex -space-x-3">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="w-10 h-10 rounded-full border-2 border-[#030014] bg-gradient-to-br from-violet-500 to-fuchsia-500"
                        style={{ zIndex: 4 - i }}
                      />
                    ))}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">10,000+</div>
                    <div className="text-xs text-white/40">creators building</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="relative py-20 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-center text-sm text-white/30 uppercase tracking-widest mb-12">
            Trusted by industry leaders
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-40">
            {['Meta', 'TikTok', 'YouTube', 'Instagram', 'Spotify', 'Adobe'].map((brand, i) => (
              <div key={i} className="text-2xl font-bold text-white/60 hover:text-white/80 transition-colors duration-300 cursor-default">
                {brand}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 mb-6">
              <div className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
              <span className="text-xs font-medium text-violet-400 uppercase tracking-wider">Studio Features</span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-white">Everything You Need to</span>
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Build Your Empire</span>
            </h2>
            <p className="text-lg text-white/50 max-w-2xl mx-auto">
              Professional-grade AI tools that rival million-dollar production studios. All in one platform.
            </p>
          </div>

          {/* Feature Cards - Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 - Large Card */}
            <div className="lg:col-span-2 group relative rounded-3xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent" />
              <div className="absolute inset-px rounded-3xl bg-[#0a0a1a]" />

              <div className="relative p-8 lg:p-12 h-full min-h-[400px] flex flex-col">
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>

                <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4">AI Persona Engine</h3>
                <p className="text-white/50 text-lg leading-relaxed mb-8 flex-grow">
                  Create hyper-realistic virtual influencers with unique faces, voices, and personalities.
                  Our AI maintains perfect consistency across thousands of generated assets.
                </p>

                {/* Feature Tags */}
                <div className="flex flex-wrap gap-2">
                  {['Face Generation', 'Voice Cloning', 'Personality AI', 'Style Lock'].map((tag) => (
                    <span key={tag} className="px-3 py-1 text-xs font-medium text-white/60 bg-white/5 rounded-full border border-white/10">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative rounded-3xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600/20 to-pink-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent" />
              <div className="absolute inset-px rounded-3xl bg-[#0a0a1a]" />

              <div className="relative p-8 h-full min-h-[300px] flex flex-col">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-pink-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>

                <h3 className="text-xl font-bold text-white mb-3">Image Studio</h3>
                <p className="text-white/50 leading-relaxed flex-grow">
                  Generate photorealistic images with Gemini AI. Perfect for social posts, brand campaigns, and editorial content.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative rounded-3xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-violet-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent" />
              <div className="absolute inset-px rounded-3xl bg-[#0a0a1a]" />

              <div className="relative p-8 h-full min-h-[300px] flex flex-col">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>

                <h3 className="text-xl font-bold text-white mb-3">Voice Synthesis</h3>
                <p className="text-white/50 leading-relaxed flex-grow">
                  Ultra-realistic voice cloning powered by ElevenLabs. Create authentic voiceovers in any language or style.
                </p>
              </div>
            </div>

            {/* Feature 4 - Large Card */}
            <div className="lg:col-span-2 group relative rounded-3xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-600/20 to-orange-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent" />
              <div className="absolute inset-px rounded-3xl bg-[#0a0a1a]" />

              <div className="relative p-8 lg:p-12 h-full min-h-[300px] flex flex-col">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-600 to-orange-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>

                <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4">Video Production Suite</h3>
                <p className="text-white/50 text-lg leading-relaxed mb-6 flex-grow">
                  Create cinematic videos using Sora 2 and Veo 3—the most advanced AI video models on the planet.
                  From TikToks to brand films, produce Hollywood-quality content in minutes.
                </p>

                <div className="flex flex-wrap gap-2">
                  {['4K Output', 'Sora 2', 'Veo 3', 'Auto-Edit'].map((tag) => (
                    <span key={tag} className="px-3 py-1 text-xs font-medium text-white/60 bg-white/5 rounded-full border border-white/10">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-32 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 mb-6">
              <div className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full" />
              <span className="text-xs font-medium text-fuchsia-400 uppercase tracking-wider">How It Works</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Three Steps to Your First
              <br />
              <span className="bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text text-transparent">Virtual Influencer</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Define Your Persona',
                description: 'Describe your influencer\'s appearance, personality, and voice. Our AI builds a complete digital identity.',
                gradient: 'from-violet-600 to-fuchsia-600'
              },
              {
                step: '02',
                title: 'Generate Content',
                description: 'Create unlimited photos, videos, and voiceovers. Every asset stays perfectly consistent with your persona.',
                gradient: 'from-fuchsia-600 to-pink-600'
              },
              {
                step: '03',
                title: 'Scale & Monetize',
                description: 'Deploy across platforms, build audience, and monetize. Your AI influencer works 24/7.',
                gradient: 'from-pink-600 to-orange-600'
              }
            ].map((item, i) => (
              <div key={i} className="relative group">
                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-16 left-full w-full h-px bg-gradient-to-r from-white/20 to-transparent z-10" />
                )}

                <div className="relative p-8 rounded-3xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-500">
                  <div className={`text-7xl font-bold bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent opacity-20 absolute top-4 right-8`}>
                    {item.step}
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${item.gradient} flex items-center justify-center mb-6`}>
                    <span className="text-lg font-bold text-white">{item.step}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-white/50 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 mb-6">
              <div className="w-1.5 h-1.5 bg-pink-400 rounded-full" />
              <span className="text-xs font-medium text-pink-400 uppercase tracking-wider">Pricing</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Simple, Transparent
              <br />
              <span className="bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-transparent">Pricing</span>
            </h2>
            <p className="text-lg text-white/50 max-w-xl mx-auto">
              Start free. Scale when you&apos;re ready. No hidden fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <div className="relative p-8 rounded-3xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-500 group">
              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">Starter</h3>
                <p className="text-white/40 text-sm">Perfect for trying out</p>
              </div>
              <div className="mb-8">
                <span className="text-5xl font-bold text-white">$0</span>
                <span className="text-white/40 ml-2">/month</span>
              </div>
              <ul className="space-y-4 mb-8">
                {['5 images/month', '2 voiceovers/month', '1 video/month', '1 AI persona', 'Community support'].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-white/60">
                    <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/sign-up">
                <button className="w-full py-3 rounded-xl border border-white/20 text-white font-medium hover:bg-white/10 transition-all duration-300">
                  Get Started Free
                </button>
              </Link>
            </div>

            {/* Pro Plan - Highlighted */}
            <div className="relative p-8 rounded-3xl overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-fuchsia-600" />
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-fuchsia-600 blur-2xl opacity-50" />

              {/* Popular badge */}
              <div className="absolute -top-px left-1/2 -translate-x-1/2">
                <div className="px-4 py-1 bg-white rounded-b-xl">
                  <span className="text-xs font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">MOST POPULAR</span>
                </div>
              </div>

              <div className="relative">
                <div className="mb-8 pt-4">
                  <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
                  <p className="text-white/70 text-sm">For serious creators</p>
                </div>
                <div className="mb-8">
                  <span className="text-5xl font-bold text-white">$29</span>
                  <span className="text-white/70 ml-2">/month</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {['50 images/month', '20 voiceovers/month', '10 videos/month', '5 AI personas', 'Priority support', 'API access'].map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-white/90">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/sign-up">
                  <button className="w-full py-3 rounded-xl bg-white text-violet-600 font-bold hover:bg-white/90 transition-all duration-300">
                    Start Pro Trial
                  </button>
                </Link>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="relative p-8 rounded-3xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-500 group">
              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">Enterprise</h3>
                <p className="text-white/40 text-sm">For teams & agencies</p>
              </div>
              <div className="mb-8">
                <span className="text-5xl font-bold text-white">$99</span>
                <span className="text-white/40 ml-2">/month</span>
              </div>
              <ul className="space-y-4 mb-8">
                {['Unlimited images', 'Unlimited voiceovers', 'Unlimited videos', 'Unlimited personas', 'Dedicated support', 'Custom integrations', 'SLA guarantee'].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-white/60">
                    <svg className="w-5 h-5 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/sign-up">
                <button className="w-full py-3 rounded-xl border border-white/20 text-white font-medium hover:bg-white/10 transition-all duration-300">
                  Contact Sales
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-32">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="relative rounded-[3rem] overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />

            {/* Glow effects */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />

            <div className="relative px-8 py-20 sm:px-16 sm:py-28 text-center">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
                Ready to Create Your
                <br />
                Virtual Influencer?
              </h2>
              <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
                Join thousands of creators building the future of content. Start free, no credit card required.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/sign-up">
                  <button className="group px-8 py-4 rounded-2xl bg-white text-violet-600 font-bold hover:bg-white/90 transition-all duration-300 shadow-2xl shadow-black/20">
                    <span className="flex items-center gap-2">
                      Get Started Free
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </button>
                </Link>
                <a href="#features" className="text-white/80 hover:text-white font-medium transition-colors duration-300">
                  Learn more →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-white/80">AI Influencer</span>
            </div>

            {/* Copyright */}
            <p className="text-sm text-white/30">
              © 2025 AI Influencer. All rights reserved.
            </p>

            {/* Links */}
            <div className="flex items-center gap-6">
              {['Privacy', 'Terms', 'Contact'].map((link) => (
                <a key={link} href="#" className="text-sm text-white/40 hover:text-white/80 transition-colors duration-300">
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

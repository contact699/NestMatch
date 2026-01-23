'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  ShieldCheck,
  Users,
  CheckCircle,
  ArrowRight,
  MapPin,
  Sparkles,
  Heart,
  Home,
  MessageCircle,
  Star,
  Zap,
  Globe,
  Lock,
} from 'lucide-react'

export default function HomePage() {
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    document.querySelectorAll('[data-animate]').forEach((el) => {
      observerRef.current?.observe(el)
    })

    return () => observerRef.current?.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
                <Home className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">NestMatch</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" className="hidden sm:inline-flex">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="btn-glow bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0 shadow-lg shadow-blue-500/25">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center hero-gradient pt-16">
        {/* Animated background orbs */}
        <div className="gradient-orb gradient-orb-1" />
        <div className="gradient-orb gradient-orb-2" />
        <div className="gradient-orb gradient-orb-3" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            {/* Animated badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-blue-100 shadow-lg mb-8 animate-fade-in-down">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Canada&apos;s Trust-First Roommate Platform
              </span>
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
            </div>

            {/* Main headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 tracking-tight animate-fade-in-up">
              Find roommates you can
              <br />
              <span className="text-gradient-animated">actually trust</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl sm:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200 opacity-0 text-balance">
              The only platform where every user is verified, every listing is
              real, and compatibility is based on how you actually live.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-400 opacity-0">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="btn-glow bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0 text-lg px-8 py-6 shadow-xl shadow-blue-500/25 group"
                >
                  Start matching free
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/search">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-6 bg-white/80 backdrop-blur-sm border-2 hover:bg-white hover:border-gray-300"
                >
                  Browse listings
                </Button>
              </Link>
            </div>

            {/* Social proof */}
            <div className="mt-16 flex flex-col items-center gap-4 animate-fade-in-up delay-600 opacity-0">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-lg"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500">
                Join <span className="font-semibold text-gray-700">2,500+</span>{' '}
                Canadians finding their perfect match
              </p>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-subtle">
          <div className="w-6 h-10 rounded-full border-2 border-gray-300 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-gray-400 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Trust Features Section */}
      <section className="py-24 lg:py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16" data-animate>
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-4">
              Why NestMatch?
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Built on trust, not hope
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Every feature designed to eliminate scams, fake listings, and
              roommate surprises.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: ShieldCheck,
                title: 'ID Verified Users',
                description:
                  'Every user goes through government ID verification. No fake profiles, no catfishing, no scams.',
                color: 'blue',
                gradient: 'from-blue-500 to-cyan-500',
              },
              {
                icon: CheckCircle,
                title: 'Real Listings Only',
                description:
                  'We verify listing ownership. No bait-and-switch, no phantom apartments, no wasted viewings.',
                color: 'green',
                gradient: 'from-green-500 to-emerald-500',
              },
              {
                icon: Users,
                title: 'Lifestyle Matching',
                description:
                  'Our compatibility quiz matches you based on sleep schedules, cleanliness, noise tolerance, and more.',
                color: 'purple',
                gradient: 'from-purple-500 to-pink-500',
              },
            ].map((feature, index) => (
              <div
                key={feature.title}
                className="feature-card group"
                data-animate
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div
                  className={`feature-icon bg-gradient-to-br ${feature.gradient} shadow-lg`}
                >
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 lg:py-32 bg-gray-50 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-50/50 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16" data-animate>
            <span className="inline-block px-4 py-1.5 rounded-full bg-purple-50 text-purple-700 text-sm font-medium mb-4">
              Simple Process
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              How NestMatch works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Find your perfect roommate in three simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                step: '01',
                title: 'Create & Verify',
                description:
                  'Sign up, complete your lifestyle quiz, and verify your identity. It takes less than 10 minutes.',
                icon: Zap,
              },
              {
                step: '02',
                title: 'Browse & Match',
                description:
                  'Search listings or roommate profiles. See compatibility scores based on your lifestyle preferences.',
                icon: Heart,
              },
              {
                step: '03',
                title: 'Connect & Move In',
                description:
                  'Message your matches securely on the platform. Schedule viewings and find your new home.',
                icon: MessageCircle,
              },
            ].map((item, index) => (
              <div
                key={item.step}
                className="relative"
                data-animate
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                {/* Connector line */}
                {index < 2 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-gray-300 to-transparent" />
                )}

                <div className="relative bg-white rounded-2xl p-8 shadow-lg shadow-gray-200/50 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-5xl font-bold text-gray-200">
                      {item.step}
                    </span>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <item.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-white rounded-full filter blur-3xl animate-float" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white rounded-full filter blur-3xl animate-float-slow" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '2.5K+', label: 'Active Users' },
              { value: '95%', label: 'Verified Profiles' },
              { value: '1.2K', label: 'Successful Matches' },
              { value: '4.9', label: 'User Rating', suffix: '/5' },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className="text-center"
                data-animate
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-2">
                  {stat.value}
                  {stat.suffix && (
                    <span className="text-2xl text-white/70">{stat.suffix}</span>
                  )}
                </div>
                <div className="text-white/80 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newcomer Section */}
      <section className="py-24 lg:py-32 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div data-animate="fade-right">
              <span className="inline-block px-4 py-1.5 rounded-full bg-green-50 text-green-700 text-sm font-medium mb-4">
                Newcomer Friendly
              </span>
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                New to Canada?
                <br />
                <span className="text-gradient">We&apos;ve got you.</span>
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Finding housing as a newcomer is hard. No credit history, no
                references, no local network. NestMatch is built specifically to
                solve these challenges.
              </p>

              <ul className="space-y-4 mb-8">
                {[
                  'Filter for "No Canadian credit history required"',
                  'Find "Newcomer Friendly" hosts',
                  'Connect with settlement agencies',
                  'Multi-language support coming soon',
                ].map((item, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-3 text-gray-700"
                  >
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <Link href="/signup">
                <Button
                  size="lg"
                  className="btn-glow bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 border-0 shadow-lg shadow-green-500/25"
                >
                  Get started free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            <div className="relative" data-animate="fade-left">
              {/* Cities card */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                    <Globe className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">
                      Available in
                    </h3>
                    <p className="text-gray-400">Major Canadian cities</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { city: 'Toronto', count: '450+' },
                    { city: 'Vancouver', count: '320+' },
                    { city: 'Ottawa', count: '180+' },
                    { city: 'Montreal', count: '240+' },
                  ].map((item, index) => (
                    <div
                      key={item.city}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group cursor-pointer"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                        <span className="text-white font-medium">
                          {item.city}
                        </span>
                      </div>
                      <span className="text-gray-400 text-sm">
                        {item.count} listings
                      </span>
                    </div>
                  ))}
                </div>

                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl opacity-20 blur-2xl" />
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl opacity-20 blur-2xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100 rounded-full opacity-50 blur-3xl" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <div data-animate>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200/50 mb-8">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-medium text-gray-700">
                Trusted by thousands across Canada
              </span>
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Ready to find your
              <br />
              <span className="text-gradient-animated">perfect roommate?</span>
            </h2>

            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Join thousands of Canadians who found their ideal living situation
              through NestMatch. Verification is free, matching is free.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="btn-glow bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0 text-lg px-10 py-6 shadow-xl shadow-blue-500/25 group"
                >
                  Create free account
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-6 mt-12 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <span>Bank-level security</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span>ID verification</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                <span>Made in Canada</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">NestMatch</span>
              </div>
              <p className="text-gray-500 mb-6 max-w-xs">
                Canada&apos;s trust-first roommate platform. Find verified
                roommates who match your lifestyle.
              </p>
              <div className="flex gap-4">
                {['twitter', 'instagram', 'linkedin'].map((social) => (
                  <a
                    key={social}
                    href="#"
                    className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                  >
                    <span className="sr-only">{social}</span>
                    <div className="w-5 h-5 rounded bg-gray-600" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            {[
              {
                title: 'Product',
                links: ['Search Listings', 'How It Works', 'Pricing', 'FAQ'],
              },
              {
                title: 'Company',
                links: ['About', 'Blog', 'Careers', 'Contact'],
              },
              {
                title: 'Legal',
                links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy'],
              },
            ].map((section) => (
              <div key={section.title}>
                <h4 className="text-white font-semibold mb-4">{section.title}</h4>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="hover:text-white transition-colors link-underline"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm">
              &copy; {new Date().getFullYear()} NestMatch. All rights reserved.
            </p>
            <p className="text-sm flex items-center gap-2">
              Made with <Heart className="h-4 w-4 text-red-500 fill-red-500" />{' '}
              in Ottawa, Canada
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

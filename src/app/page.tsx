'use client'

import { useEffect, useRef } from 'react'
import {
  LandingNav,
  HeroSection,
  TrustFeaturesSection,
  HowItWorksSection,
  StatsSection,
  NewcomerSection,
  CTASection,
  Footer,
} from '@/components/landing'

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
      <LandingNav />
      <HeroSection />
      <TrustFeaturesSection />
      <HowItWorksSection />
      <StatsSection />
      <NewcomerSection />
      <CTASection />
      <Footer />
    </div>
  )
}

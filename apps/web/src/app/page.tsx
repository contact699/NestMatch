import {
  LandingNav,
  HeroSection,
  TrustFeaturesSection,
  HowItWorksSection,
  CTASection,
  Footer,
} from '@/components/landing'
import { FeaturedListingsSection } from '@/components/landing/featured-listings-section'
import { LatestMembersSection } from '@/components/landing/latest-members-section'
import { OrganizationJsonLd } from '@/components/json-ld'
import { HomeScrollAnimations } from './page-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <OrganizationJsonLd />
      <HomeScrollAnimations />
      <LandingNav />
      <main className="pt-24">
        <HeroSection />
        <TrustFeaturesSection />
        <HowItWorksSection />
        <FeaturedListingsSection />
        <LatestMembersSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}

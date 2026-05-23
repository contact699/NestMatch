import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { FAQPageJsonLd, BreadcrumbListJsonLd } from '@/components/json-ld'
import { FaqClient } from './faq-client'

export const metadata: Metadata = {
  title: 'Frequently Asked Questions for Renters in Canada',
  description:
    'Answers to common questions about finding a roommate, signing a rental agreement, tenant rights, and more — Canada-specific.',
  alternates: { canonical: 'https://www.nestmatch.app/resources/faq' },
}

export default async function FAQPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; province?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const now = new Date().toISOString()

  const [{ data: faqs }, { data: categories }] = await Promise.all([
    supabase
      .from('faqs')
      .select('*')
      .eq('is_published', true)
      .or(`publish_at.is.null,publish_at.lte.${now}`)
      .or(`unpublish_at.is.null,unpublish_at.gt.${now}`)
      .order('display_order', { ascending: true })
      .order('helpful_count', { ascending: false }),
    supabase.from('resource_categories').select('*').order('name'),
  ])

  const faqItems = (faqs ?? []).map((f) => ({
    question: f.question,
    answer: f.answer,
  }))

  return (
    <>
      <FAQPageJsonLd items={faqItems} />
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: 'https://www.nestmatch.app' },
          { name: 'FAQ', url: 'https://www.nestmatch.app/resources/faq' },
        ]}
      />
      <FaqClient
        initialFaqs={faqs ?? []}
        initialCategories={categories ?? []}
        initialQuery={params.q ?? ''}
        initialCategory={params.category ?? null}
        initialProvince={params.province ?? null}
      />
    </>
  )
}

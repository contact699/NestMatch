'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { FAQ } from '@/types/database'
import { ProvinceBadge } from './province-filter'
import { HelpfulVote } from './helpful-vote'

interface FAQAccordionProps {
  faq: FAQ
  defaultOpen?: boolean
}

export function FAQAccordion({ faq, defaultOpen = false }: FAQAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const panelId = `faq-panel-${faq.id}`

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full px-5 py-4 flex items-start justify-between gap-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 pr-4">{faq.question}</h3>
          {faq.provinces.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {faq.provinces.map((province) => (
                <ProvinceBadge key={province} province={province} />
              ))}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 mt-1">
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div id={panelId} role="region" className="px-5 pb-5 border-t border-gray-100">
          <div className="pt-4 prose prose-sm max-w-none text-gray-600">
            {faq.answer.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <HelpfulVote type="faq" itemId={faq.id} helpfulCount={faq.helpful_count} />
          </div>
        </div>
      )}
    </div>
  )
}

interface FAQListProps {
  faqs: FAQ[]
}

export function FAQList({ faqs }: FAQListProps) {
  if (faqs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No FAQs found matching your criteria.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {faqs.map((faq) => (
        <FAQAccordion key={faq.id} faq={faq} />
      ))}
    </div>
  )
}

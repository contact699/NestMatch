'use client'

import { AlertTriangle } from 'lucide-react'

interface LegalDisclaimerProps {
  variant?: 'banner' | 'inline' | 'footer'
}

export function LegalDisclaimer({ variant = 'inline' }: LegalDisclaimerProps) {
  if (variant === 'banner') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Legal Disclaimer</p>
            <p className="text-sm text-amber-700 mt-1">
              The information provided here is for general guidance only and does not constitute legal advice.
              Laws vary by province and situation. For specific legal questions, please consult a qualified
              legal professional or your provincial tenant rights organization.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'footer') {
    return (
      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          This content is for informational purposes only and does not constitute legal advice.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600 flex items-start gap-2">
      <AlertTriangle className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
      <span>Not legal advice. Consult a professional for your specific situation.</span>
    </div>
  )
}

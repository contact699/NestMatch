'use client'

import { AlertTriangle } from 'lucide-react'

interface LegalDisclaimerProps {
  variant?: 'banner' | 'inline' | 'footer'
}

export function LegalDisclaimer({ variant = 'inline' }: LegalDisclaimerProps) {
  if (variant === 'banner') {
    return (
      <div className="bg-error-container/30 ghost-border rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-on-surface">Legal Disclaimer</p>
            <p className="text-sm text-on-surface-variant mt-1">
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
      <div className="mt-8 pt-6 ghost-border-t">
        <p className="text-xs text-on-surface-variant flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          This content is for informational purposes only and does not constitute legal advice.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-surface-container ghost-border rounded-xl p-3 text-sm text-on-surface-variant flex items-start gap-2">
      <AlertTriangle className="h-4 w-4 text-on-surface-variant flex-shrink-0 mt-0.5" />
      <span>Not legal advice. Consult a professional for your specific situation.</span>
    </div>
  )
}

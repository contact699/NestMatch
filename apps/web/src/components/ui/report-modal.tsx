'use client'

import { useState } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalContent } from './modal'
import { Button } from './button'
import { AlertCircle, CheckCircle } from 'lucide-react'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  reportedUserId?: string
  reportedListingId?: string
  reportedName?: string
}

const REPORT_TYPES = [
  { value: 'scam', label: 'Scam or Fraud', desc: 'Fake listings, money scams, phishing' },
  { value: 'harassment', label: 'Harassment', desc: 'Threatening, bullying, or abusive behavior' },
  { value: 'fake', label: 'Fake Profile', desc: 'False identity, misleading information' },
  { value: 'discrimination', label: 'Discrimination', desc: 'Discriminatory behavior or content' },
  { value: 'other', label: 'Other', desc: 'Other violations of community guidelines' },
] as const

export function ReportModal({
  isOpen,
  onClose,
  reportedUserId,
  reportedListingId,
  reportedName,
}: ReportModalProps) {
  const [type, setType] = useState<string>('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleClose = () => {
    onClose()
    // Reset state after close animation
    setTimeout(() => {
      setSuccess(false)
      setType('')
      setDescription('')
      setError(null)
    }, 200)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!type) {
      setError('Please select a reason for your report')
      return
    }

    if (description.length < 10) {
      setError('Please provide more details (at least 10 characters)')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reported_user_id: reportedUserId,
          reported_listing_id: reportedListingId,
          type,
          description,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit report')
      }

      setSuccess(true)
      setTimeout(handleClose, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalHeader onClose={handleClose}>
        <ModalTitle>Report {reportedListingId ? 'Listing' : 'User'}</ModalTitle>
      </ModalHeader>

      <ModalContent>
        {success ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Report Submitted
            </h3>
            <p className="text-gray-500">
              Thank you for helping keep NestMatch safe. Our team will review your report.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {reportedName && (
              <p className="text-sm text-gray-600">
                Reporting: <span className="font-medium">{reportedName}</span>
              </p>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Report type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for report *
              </label>
              <div className="space-y-2">
                {REPORT_TYPES.map((reportType) => (
                  <label
                    key={reportType.value}
                    className={`
                      flex items-start p-3 border rounded-lg cursor-pointer transition-all
                      ${
                        type === reportType.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="report-type"
                      value={reportType.value}
                      checked={type === reportType.value}
                      onChange={(e) => setType(e.target.value)}
                      className="mt-0.5 mr-3"
                    />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {reportType.label}
                      </p>
                      <p className="text-xs text-gray-500">{reportType.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional details *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Please describe what happened..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
              />
              <p className="mt-1 text-xs text-gray-400">
                {description.length}/2000 characters
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                className="flex-1"
                isLoading={isSubmitting}
              >
                Submit Report
              </Button>
            </div>

            <p className="text-xs text-gray-400 text-center">
              False reports may result in account restrictions.
            </p>
          </form>
        )}
      </ModalContent>
    </Modal>
  )
}

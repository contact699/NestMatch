'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { Download, FileText, Loader2, Check, Share2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AgreementPDF } from '@/components/resources/agreement/agreement-pdf'

interface StepDownloadProps {
  data: {
    title: string
    address: string
    province: string
    moveInDate: string
    roommates: string[]
    clauses: { title: string; content: string }[]
  }
  onBack: () => void
}

export function StepDownload({ data, onBack }: StepDownloadProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const isMobile = () => {
    if (typeof window === 'undefined') return false
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  }

  const generatePDF = async () => {
    setIsGenerating(true)
    try {
      const doc = (
        <AgreementPDF
          title={data.title}
          address={data.address}
          province={data.province}
          moveInDate={data.moveInDate}
          roommates={data.roommates}
          clauses={data.clauses}
          generatedAt={new Date().toLocaleDateString('en-CA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        />
      )

      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)

      if (isMobile()) {
        // On mobile, open PDF in a new tab so the user can view/save it
        // Programmatic <a> click downloads don't work reliably on iOS Safari and some Android browsers
        window.open(url, '_blank')
      } else {
        // On desktop, trigger a direct download
        const link = document.createElement('a')
        link.href = url
        link.download = `roommate-agreement-${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      setDownloadError('Failed to generate PDF. Please try again or use a desktop browser.')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: data.title,
          text: 'Check out this roommate agreement from NestMatch',
          url: window.location.href,
        })
      } catch (err) {
        // User cancelled or share failed
        console.error('Share failed:', err)
      }
    } else {
      // Fallback to copy link
      copyLink()
    }
  }

  const handleStartNew = () => {
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      {/* Success Icon and Heading */}
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Your Agreement is Ready!
        </h3>
        <p className="text-gray-500">
          Download your customized roommate agreement as a PDF
        </p>
      </div>

      {/* Agreement Summary */}
      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <h4 className="font-medium text-gray-900">Agreement Summary</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Title:</span>
            <p className="font-medium text-gray-900">{data.title}</p>
          </div>
          <div>
            <span className="text-gray-500">Property:</span>
            <p className="font-medium text-gray-900">{data.address}</p>
          </div>
          <div>
            <span className="text-gray-500">Province:</span>
            <p className="font-medium text-gray-900">{data.province}</p>
          </div>
          <div>
            <span className="text-gray-500">Move-in Date:</span>
            <p className="font-medium text-gray-900">{data.moveInDate}</p>
          </div>
          <div>
            <span className="text-gray-500">Roommates:</span>
            <p className="font-medium text-gray-900">{data.roommates.length}</p>
          </div>
          <div>
            <span className="text-gray-500">Clauses:</span>
            <p className="font-medium text-gray-900">{data.clauses.length}</p>
          </div>
        </div>
      </div>

      {/* Download Button */}
      <Button
        onClick={generatePDF}
        disabled={isGenerating}
        className="w-full"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Generating PDF...
          </>
        ) : (
          <>
            <Download className="h-5 w-5 mr-2" />
            Download PDF
          </>
        )}
      </Button>

      {/* Error message */}
      {downloadError && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {downloadError}
        </div>
      )}

      {/* Copy Link and Share Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={copyLink} className="flex-1">
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </>
          )}
        </Button>
        <Button variant="outline" onClick={handleShare} className="flex-1">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </div>

      {/* Warning */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          <strong>Important:</strong> This agreement is a template and does not constitute legal advice.
          Review the document with all roommates before signing and consider consulting a legal professional
          for advice specific to your situation.
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back to Review
        </Button>
        <Button variant="ghost" onClick={handleStartNew} className="flex-1">
          Start New Agreement
        </Button>
      </div>
    </div>
  )
}

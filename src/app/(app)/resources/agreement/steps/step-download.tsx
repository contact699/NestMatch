'use client'

import { useState } from 'react'
import { Download, Copy, Check, FileText, Printer, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LegalDisclaimer, PROVINCES } from '@/components/resources'
import { AgreementFormData } from '../types'

interface StepDownloadProps {
  formData: AgreementFormData
  generatedContent: string
}

export function StepDownload({ formData, generatedContent }: StepDownloadProps) {
  const [copied, setCopied] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handlePrint = () => {
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
    }, 100)
  }

  const downloadAsTxt = () => {
    const blob = new Blob([generatedContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `roommate-agreement-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const provinceName = PROVINCES.find((p) => p.code === formData.province)?.name || formData.province

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Your Agreement is Ready</h3>
        <p className="text-sm text-gray-500">
          Download, copy, or print your customized roommate agreement
        </p>
      </div>

      {/* Legal Disclaimer */}
      <LegalDisclaimer variant="banner" />

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={downloadAsTxt}>
          <Download className="h-4 w-4 mr-2" />
          Download as Text
        </Button>
        <Button variant="outline" onClick={copyToClipboard}>
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy to Clipboard
            </>
          )}
        </Button>
        <Button variant="outline" onClick={handlePrint} disabled={isPrinting}>
          {isPrinting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Printer className="h-4 w-4 mr-2" />
          )}
          Print
        </Button>
      </div>

      {/* Preview */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Agreement Preview</span>
          </div>
          <span className="text-xs text-gray-500">{provinceName}</span>
        </div>
        <div className="p-6 bg-white max-h-[500px] overflow-y-auto">
          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
            {generatedContent}
          </pre>
        </div>
      </div>

      {/* Signature Section Info */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <h4 className="font-medium text-amber-800 mb-2">Next Steps</h4>
        <ol className="list-decimal list-inside text-sm text-amber-700 space-y-1">
          <li>Review the agreement with all roommates</li>
          <li>Make any necessary changes together</li>
          <li>Print copies for everyone to sign</li>
          <li>Keep a signed copy for your records</li>
        </ol>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .border-gray-200.rounded-lg.overflow-hidden,
          .border-gray-200.rounded-lg.overflow-hidden * {
            visibility: visible;
          }
          .border-gray-200.rounded-lg.overflow-hidden {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none;
          }
          .bg-gray-50 {
            display: none !important;
          }
          .max-h-\\[500px\\] {
            max-height: none !important;
          }
        }
      `}</style>
    </div>
  )
}

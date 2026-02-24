'use client'

import { useState, useRef, useEffect } from 'react'
import { Share2, Copy, MessageSquare, Check } from 'lucide-react'
import { clientLogger } from '@/lib/client-logger'

interface ShareButtonProps {
  title: string
  url?: string
  variant?: 'icon' | 'button'
}

export function ShareButton({ title, url, variant = 'icon' }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '')

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
        setIsOpen(false)
      }, 1500)
    } catch (err) {
      clientLogger.error('Failed to copy', err)
    }
  }

  const shareInMessages = () => {
    const shareText = `Check out this resource: ${title}\n${shareUrl}`
    // Could integrate with messages feature here
    // For now, copy to clipboard with a message format
    navigator.clipboard.writeText(shareText)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
      setIsOpen(false)
    }, 1500)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          ${variant === 'icon'
            ? 'p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200'
            : 'flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200'}
          transition-colors
        `}
        title="Share"
      >
        <Share2 className={variant === 'icon' ? 'h-5 w-5' : 'h-4 w-4'} />
        {variant === 'button' && 'Share'}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <button
            onClick={copyToClipboard}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy link</span>
              </>
            )}
          </button>
          <button
            onClick={shareInMessages}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Share in messages</span>
          </button>
        </div>
      )}
    </div>
  )
}

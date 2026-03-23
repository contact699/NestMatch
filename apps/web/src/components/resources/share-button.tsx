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
            ? 'p-2 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            : 'flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}
          transition-colors
        `}
        title="Share"
      >
        <Share2 className={variant === 'icon' ? 'h-5 w-5' : 'h-4 w-4'} />
        {variant === 'button' && 'Share'}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-surface-container-lowest rounded-xl shadow-lg ghost-border py-1 z-50">
          <button
            onClick={copyToClipboard}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-secondary" />
                <span className="text-secondary">Copied!</span>
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
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Share in messages</span>
          </button>
        </div>
      )}
    </div>
  )
}

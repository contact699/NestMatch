/**
 * Accessibility utilities for improved keyboard navigation,
 * screen reader support, and focus management
 */

import { useCallback, useEffect, useRef } from 'react'

// ============================================
// FOCUS MANAGEMENT
// ============================================

/**
 * Trap focus within a container (for modals, dialogs)
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableSelectors = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')

    const focusableElements = container.querySelectorAll<HTMLElement>(focusableSelectors)
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Focus first element on mount
    firstElement?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [isActive])

  return containerRef
}

/**
 * Return focus to trigger element when dialog closes
 */
export function useReturnFocus(isOpen: boolean) {
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      triggerRef.current = document.activeElement as HTMLElement
    } else if (triggerRef.current) {
      // Return focus when closed
      triggerRef.current.focus()
      triggerRef.current = null
    }
  }, [isOpen])
}

/**
 * Focus first error in a form
 */
export function focusFirstError(formRef: React.RefObject<HTMLFormElement>) {
  const errorInput = formRef.current?.querySelector<HTMLElement>(
    '[aria-invalid="true"], .error input, .error select, .error textarea'
  )
  errorInput?.focus()
}

// ============================================
// KEYBOARD NAVIGATION
// ============================================

/**
 * Arrow key navigation for lists/grids
 */
export function useArrowNavigation(
  itemCount: number,
  orientation: 'horizontal' | 'vertical' | 'grid' = 'vertical',
  gridColumns?: number
) {
  const currentIndex = useRef(0)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, items: HTMLElement[]) => {
      let newIndex = currentIndex.current

      switch (e.key) {
        case 'ArrowDown':
          if (orientation === 'vertical') {
            newIndex = Math.min(currentIndex.current + 1, itemCount - 1)
          } else if (orientation === 'grid' && gridColumns) {
            newIndex = Math.min(currentIndex.current + gridColumns, itemCount - 1)
          }
          break
        case 'ArrowUp':
          if (orientation === 'vertical') {
            newIndex = Math.max(currentIndex.current - 1, 0)
          } else if (orientation === 'grid' && gridColumns) {
            newIndex = Math.max(currentIndex.current - gridColumns, 0)
          }
          break
        case 'ArrowRight':
          if (orientation === 'horizontal' || orientation === 'grid') {
            newIndex = Math.min(currentIndex.current + 1, itemCount - 1)
          }
          break
        case 'ArrowLeft':
          if (orientation === 'horizontal' || orientation === 'grid') {
            newIndex = Math.max(currentIndex.current - 1, 0)
          }
          break
        case 'Home':
          newIndex = 0
          break
        case 'End':
          newIndex = itemCount - 1
          break
        default:
          return
      }

      if (newIndex !== currentIndex.current) {
        e.preventDefault()
        currentIndex.current = newIndex
        items[newIndex]?.focus()
      }
    },
    [itemCount, orientation, gridColumns]
  )

  return { handleKeyDown, setCurrentIndex: (i: number) => (currentIndex.current = i) }
}

/**
 * Roving tabindex pattern for widget navigation
 */
export function useRovingTabIndex<T extends HTMLElement>(
  items: T[],
  initialIndex: number = 0
) {
  const currentIndex = useRef(initialIndex)

  useEffect(() => {
    items.forEach((item, index) => {
      item.setAttribute('tabindex', index === currentIndex.current ? '0' : '-1')
    })
  }, [items])

  const moveFocus = useCallback(
    (direction: 'next' | 'prev' | 'first' | 'last') => {
      const oldIndex = currentIndex.current
      let newIndex: number

      switch (direction) {
        case 'next':
          newIndex = (oldIndex + 1) % items.length
          break
        case 'prev':
          newIndex = (oldIndex - 1 + items.length) % items.length
          break
        case 'first':
          newIndex = 0
          break
        case 'last':
          newIndex = items.length - 1
          break
      }

      items[oldIndex]?.setAttribute('tabindex', '-1')
      items[newIndex]?.setAttribute('tabindex', '0')
      items[newIndex]?.focus()
      currentIndex.current = newIndex
    },
    [items]
  )

  return { moveFocus, currentIndex: currentIndex.current }
}

// ============================================
// SCREEN READER UTILITIES
// ============================================

/**
 * Announce message to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcer = document.getElementById('sr-announcer') || createAnnouncer()
  announcer.setAttribute('aria-live', priority)
  announcer.textContent = message

  // Clear after announcement to allow re-announcement of same message
  setTimeout(() => {
    announcer.textContent = ''
  }, 1000)
}

function createAnnouncer(): HTMLElement {
  const announcer = document.createElement('div')
  announcer.id = 'sr-announcer'
  announcer.className = 'sr-only'
  announcer.setAttribute('aria-live', 'polite')
  announcer.setAttribute('aria-atomic', 'true')
  document.body.appendChild(announcer)
  return announcer
}

/**
 * Hook to announce loading states
 */
export function useLoadingAnnouncement(isLoading: boolean, loadingMessage?: string) {
  useEffect(() => {
    if (isLoading) {
      announce(loadingMessage || 'Loading, please wait...')
    }
  }, [isLoading, loadingMessage])
}

// ============================================
// ARIA UTILITIES
// ============================================

/**
 * Generate unique IDs for ARIA relationships
 */
let idCounter = 0
export function useUniqueId(prefix: string = 'id'): string {
  const id = useRef<string>()
  if (!id.current) {
    id.current = `${prefix}-${++idCounter}`
  }
  return id.current
}

/**
 * Props for describing elements with ARIA
 */
export interface AriaDescribedByProps {
  describedById?: string
  errorId?: string
  helperId?: string
}

export function getAriaDescribedBy(props: AriaDescribedByProps): string | undefined {
  const ids = [props.describedById, props.errorId, props.helperId].filter(Boolean)
  return ids.length > 0 ? ids.join(' ') : undefined
}

// ============================================
// COLOR CONTRAST
// ============================================

/**
 * Check if color combination meets WCAG contrast requirements
 */
export function checkContrast(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background)
  const requirements = {
    AA: isLargeText ? 3 : 4.5,
    AAA: isLargeText ? 4.5 : 7,
  }
  return ratio >= requirements[level]
}

function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
    val = val / 255
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

function getContrastRatio(foreground: string, background: string): number {
  const lum1 = getLuminance(foreground)
  const lum2 = getLuminance(background)
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)
  return (lighter + 0.05) / (darker + 0.05)
}

// ============================================
// REDUCED MOTION
// ============================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Hook to respect reduced motion preferences
 */
export function useReducedMotion(): boolean {
  const mediaQuery =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null

  const getInitialState = () => mediaQuery?.matches ?? false

  const [prefersReducedMotion, setPrefersReducedMotion] =
    // eslint-disable-next-line react-hooks/rules-of-hooks
    require('react').useState(getInitialState)

  useEffect(() => {
    if (!mediaQuery) return

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [mediaQuery])

  return prefersReducedMotion
}

// ============================================
// SKIP LINKS
// ============================================

export interface SkipLinkTarget {
  id: string
  label: string
}

export const defaultSkipLinks: SkipLinkTarget[] = [
  { id: 'main-content', label: 'Skip to main content' },
  { id: 'main-nav', label: 'Skip to navigation' },
]

// ============================================
// FORM VALIDATION
// ============================================

/**
 * Get ARIA attributes for form field with validation
 */
export function getFormFieldAriaProps(
  id: string,
  error?: string,
  helperText?: string,
  required?: boolean
): Record<string, string | boolean | undefined> {
  const errorId = error ? `${id}-error` : undefined
  const helperId = helperText && !error ? `${id}-helper` : undefined

  return {
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': [errorId, helperId].filter(Boolean).join(' ') || undefined,
    'aria-required': required,
  }
}

'use client'

import { cn } from '@/lib/utils'

interface SkipLink {
  id: string
  label: string
}

interface SkipLinksProps {
  links?: SkipLink[]
  className?: string
}

const defaultLinks: SkipLink[] = [
  { id: 'main-content', label: 'Skip to main content' },
  { id: 'main-nav', label: 'Skip to navigation' },
]

/**
 * Skip links for keyboard navigation accessibility.
 * These links are visually hidden until focused.
 *
 * @example
 * // In your layout:
 * <SkipLinks />
 * <nav id="main-nav">...</nav>
 * <main id="main-content">...</main>
 */
export function SkipLinks({ links = defaultLinks, className }: SkipLinksProps) {
  return (
    <div className={cn('skip-links', className)}>
      {links.map((link) => (
        <a
          key={link.id}
          href={`#${link.id}`}
          className={cn(
            // Visually hidden by default
            'sr-only focus:not-sr-only',
            // When focused, show as a styled link
            'focus:fixed focus:top-2 focus:left-2 focus:z-[100]',
            'focus:inline-flex focus:items-center focus:justify-center',
            'focus:px-4 focus:py-2',
            'focus:bg-blue-600 focus:text-white',
            'focus:rounded-lg focus:shadow-lg',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            'focus:font-medium focus:text-sm'
          )}
        >
          {link.label}
        </a>
      ))}
    </div>
  )
}

/**
 * Visually hidden text for screen readers only.
 * Use for providing additional context to screen reader users.
 *
 * @example
 * <button>
 *   <Icon />
 *   <VisuallyHidden>Close menu</VisuallyHidden>
 * </button>
 */
export function VisuallyHidden({
  children,
  as: Component = 'span',
}: {
  children: React.ReactNode
  as?: 'span' | 'div' | 'p'
}) {
  return <Component className="sr-only">{children}</Component>
}

/**
 * Live region for announcing dynamic content changes to screen readers.
 *
 * @example
 * <LiveRegion>
 *   {searchResults.length} results found
 * </LiveRegion>
 */
export function LiveRegion({
  children,
  politeness = 'polite',
  atomic = true,
}: {
  children: React.ReactNode
  politeness?: 'polite' | 'assertive'
  atomic?: boolean
}) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      className="sr-only"
    >
      {children}
    </div>
  )
}

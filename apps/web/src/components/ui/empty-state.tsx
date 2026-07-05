import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  /** Lucide icon component shown above the title */
  icon: LucideIcon
  /** Short heading describing the empty state */
  title: string
  /** Optional supporting copy (string or rich content) */
  description?: ReactNode
  /** Optional call-to-action (e.g. a Button or Link) */
  action?: ReactNode
  /** Override the default padding / layout wrapper classes */
  className?: string
}

/**
 * Consistent empty-state display for lists that loaded successfully but have no items.
 *
 * @example
 * <EmptyState
 *   icon={Receipt}
 *   title="No expenses yet"
 *   description="Create your first shared expense to start splitting bills."
 *   action={<Button>Add Expense</Button>}
 * />
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('text-center py-12', className)}>
      <Icon className="h-12 w-12 text-outline mx-auto mb-4" />
      <h3 className="text-lg font-medium text-on-surface mb-2">{title}</h3>
      {description && (
        <div className="text-on-surface-variant max-w-md mx-auto">{description}</div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

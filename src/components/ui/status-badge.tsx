'use client'

import {
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCw,
  Users,
  Search,
  Home,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default'

interface StatusBadgeProps {
  /** Badge variant determines color */
  variant: BadgeVariant
  /** Text to display */
  children: React.ReactNode
  /** Optional icon to show */
  icon?: React.ReactNode
  /** Additional class name */
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  default: 'bg-gray-100 text-gray-800',
}

/**
 * Generic status badge component.
 *
 * @example
 * <StatusBadge variant="success" icon={<CheckCircle className="h-3 w-3" />}>
 *   Paid
 * </StatusBadge>
 */
export function StatusBadge({
  variant,
  children,
  icon,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {icon}
      {children}
    </span>
  )
}

// Pre-built status badges for common use cases

type PaymentStatus = 'completed' | 'pending' | 'processing' | 'failed' | 'cancelled' | 'refunded'

/**
 * Payment status badge with appropriate icon and color.
 */
export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config: Record<PaymentStatus, { variant: BadgeVariant; icon: React.ReactNode; label: string }> = {
    completed: {
      variant: 'success',
      icon: <CheckCircle className="h-3 w-3" />,
      label: 'Completed',
    },
    pending: {
      variant: 'warning',
      icon: <Clock className="h-3 w-3" />,
      label: 'Pending',
    },
    processing: {
      variant: 'warning',
      icon: <Clock className="h-3 w-3" />,
      label: 'Processing',
    },
    failed: {
      variant: 'error',
      icon: <XCircle className="h-3 w-3" />,
      label: 'Failed',
    },
    cancelled: {
      variant: 'error',
      icon: <XCircle className="h-3 w-3" />,
      label: 'Cancelled',
    },
    refunded: {
      variant: 'info',
      icon: <RefreshCw className="h-3 w-3" />,
      label: 'Refunded',
    },
  }

  const { variant, icon, label } = config[status] || config.pending
  return (
    <StatusBadge variant={variant} icon={icon}>
      {label}
    </StatusBadge>
  )
}

type ExpenseStatus = 'completed' | 'pending' | 'overdue' | 'paid'

/**
 * Expense status badge with appropriate icon and color.
 */
export function ExpenseStatusBadge({ status }: { status: ExpenseStatus }) {
  const config: Record<ExpenseStatus, { variant: BadgeVariant; icon: React.ReactNode; label: string }> = {
    completed: {
      variant: 'success',
      icon: <CheckCircle className="h-3 w-3" />,
      label: 'Paid',
    },
    paid: {
      variant: 'success',
      icon: <CheckCircle className="h-3 w-3" />,
      label: 'Paid',
    },
    pending: {
      variant: 'warning',
      icon: <Clock className="h-3 w-3" />,
      label: 'Pending',
    },
    overdue: {
      variant: 'error',
      icon: <AlertCircle className="h-3 w-3" />,
      label: 'Overdue',
    },
  }

  const { variant, icon, label } = config[status] || config.pending
  return (
    <StatusBadge variant={variant} icon={icon}>
      {label}
    </StatusBadge>
  )
}

type GroupStatus = 'forming' | 'searching' | 'matched'

/**
 * Group status badge with appropriate color.
 */
export function GroupStatusBadge({ status }: { status: GroupStatus }) {
  const config: Record<GroupStatus, { variant: BadgeVariant; label: string }> = {
    forming: {
      variant: 'info',
      label: 'Forming',
    },
    searching: {
      variant: 'warning',
      label: 'Searching',
    },
    matched: {
      variant: 'success',
      label: 'Matched',
    },
  }

  const { variant, label } = config[status] || config.forming
  return <StatusBadge variant={variant}>{label}</StatusBadge>
}

type CohabitationStatus = 'active' | 'completed' | 'cancelled'

/**
 * Cohabitation status badge.
 */
export function CohabitationStatusBadge({ status }: { status: CohabitationStatus }) {
  const config: Record<CohabitationStatus, { variant: BadgeVariant; label: string }> = {
    active: {
      variant: 'success',
      label: 'Active',
    },
    completed: {
      variant: 'default',
      label: 'Completed',
    },
    cancelled: {
      variant: 'error',
      label: 'Cancelled',
    },
  }

  const { variant, label } = config[status] || config.active
  return <StatusBadge variant={variant}>{label}</StatusBadge>
}

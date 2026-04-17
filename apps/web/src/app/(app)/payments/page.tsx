'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FetchError } from '@/components/ui/fetch-error'
import { useFetch } from '@/lib/hooks/use-fetch'
import { formatPrice, formatDate } from '@/lib/utils'
import {
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Loader2,
  DollarSign,
  CheckCircle,
  RefreshCw,
  Home,
  Receipt,
  Wifi,
  ChevronDown,
  Zap,
  Shield,
} from 'lucide-react'

interface Payment {
  id: string
  payer_id: string
  recipient_id: string
  amount: number
  type: string
  status: string
  description: string | null
  created_at: string
  paid_at: string | null
  payer: {
    name: string
    profile_photo: string | null
  } | null
  recipient: {
    name: string
    profile_photo: string | null
  } | null
  listing: {
    id: string
    title: string
    city: string
  } | null
}

interface PaymentSummary {
  total_sent: number
  total_received: number
  pending_sent: number
  pending_received: number
}

interface PaymentData {
  payments: Payment[]
  summary: PaymentSummary
  current_user_id?: string
  pagination?: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
}

export default function PaymentsPage() {
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all')
  const [dateRange, setDateRange] = useState('')
  const [transactionType, setTransactionType] = useState('all')
  const [limit, setLimit] = useState(20)

  const { data, isLoading, error, refetch } = useFetch<PaymentData>(
    `/api/payments/history?type=${filter}&limit=${limit}`,
    { deps: [filter, limit] }
  )

  const payments = data?.payments ?? []
  const summary = data?.summary ?? null
  const currentUserId = data?.current_user_id ?? null
  const hasMore = data?.pagination?.has_more ?? false

  const totalMonthly = useMemo(() => {
    if (!summary) return 0
    return summary.total_sent + summary.total_received
  }, [summary])

  const isFullyReconciled = useMemo(() => {
    if (!summary) return false
    return summary.pending_sent === 0 && summary.pending_received === 0
  }, [summary])

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'rent':
        return <Home className="h-5 w-5" />
      case 'utilities':
        return <Zap className="h-5 w-5" />
      case 'deposit':
        return <Shield className="h-5 w-5" />
      case 'internet':
        return <Wifi className="h-5 w-5" />
      default:
        return <Receipt className="h-5 w-5" />
    }
  }

  const getCategoryLabel = (type: string) => {
    switch (type) {
      case 'rent': return 'Housing'
      case 'utilities': return 'Utilities'
      case 'deposit': return 'Deposit'
      case 'internet': return 'Utilities'
      default: return type.charAt(0).toUpperCase() + type.slice(1)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            COMPLETED
          </span>
        )
      case 'pending':
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-tertiary">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed" />
            PROCESSING
          </span>
        )
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-error">
            <span className="w-1.5 h-1.5 rounded-full bg-error" />
            REFUNDED
          </span>
        )
      case 'failed':
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-error">
            <span className="w-1.5 h-1.5 rounded-full bg-error" />
            FAILED
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-on-surface-variant">
            <span className="w-1.5 h-1.5 rounded-full bg-outline" />
            {status.toUpperCase()}
          </span>
        )
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Contextual Nav */}
      <nav className="flex items-center gap-8 mb-8 text-sm font-medium">
        <Link href="/groups" className="text-on-surface-variant hover:text-on-surface transition-colors pb-1">
          Groups
        </Link>
        <Link href="/expenses" className="text-on-surface-variant hover:text-on-surface transition-colors pb-1">
          Expenses
        </Link>
        <Link href="/groups" className="text-on-surface-variant hover:text-on-surface transition-colors pb-1">
          Agreement
        </Link>
        <Link href="/payments" className="text-on-surface border-b-2 border-primary pb-1">
          Payments
        </Link>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-on-surface tracking-tight mb-2">
            Payment History
          </h1>
          <p className="text-on-surface-variant text-base max-w-xl">
            A transparent log of all household transactions, security deposits, and shared
            utilities. Stay in sync with your housemates effortlessly.
          </p>
        </div>
        {isFullyReconciled && (
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-secondary-container text-secondary">
            <CheckCircle className="h-4 w-4" />
            Fully Reconciled
          </span>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
            Date Range
          </label>
          <div className="relative">
            <input
              type="month"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2.5 ghost-border rounded-lg bg-surface-container-lowest text-on-surface text-sm focus:ring-2 focus:ring-secondary focus:border-transparent"
              placeholder="Select date range"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
            Transaction Type
          </label>
          <select
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value)}
            className="px-4 py-2.5 ghost-border rounded-lg bg-surface-container-lowest text-on-surface text-sm focus:ring-2 focus:ring-secondary focus:border-transparent appearance-none pr-8"
          >
            <option value="all">All Transactions</option>
            <option value="sent">Sent</option>
            <option value="received">Received</option>
          </select>
        </div>

        <div className="self-end">
          <Button
            onClick={() => {
              setFilter(transactionType === 'all' ? 'all' : transactionType as 'sent' | 'received')
            }}
          >
            Filter
          </Button>
        </div>

        {/* Total Monthly summary card */}
        {summary && (
          <div className="ml-auto bg-primary text-on-primary rounded-xl px-6 py-4">
            <p className="text-xs font-bold uppercase tracking-wider text-on-primary/70 mb-1">
              Total Monthly
            </p>
            <p className="font-display text-2xl font-extrabold">
              {formatPrice(totalMonthly)}
            </p>
          </div>
        )}
      </div>

      {/* Transaction Table */}
      <Card variant="bordered">
        <CardContent className="p-0">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            <div className="col-span-4">Transaction & Date</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-3">To / From</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2 text-right">Amount</div>
          </div>

          {error ? (
            <div className="px-6 py-8">
              <FetchError message={error} onRetry={refetch} />
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-secondary" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-16 px-6">
              <CreditCard className="h-12 w-12 text-outline-variant mx-auto mb-4" />
              <p className="text-on-surface-variant font-medium">No transactions yet</p>
            </div>
          ) : (
            <div>
              {payments.map((payment) => {
                const isSent = payment.payer_id === currentUserId
                const otherParty = isSent ? payment.recipient : payment.payer

                return (
                  <div
                    key={payment.id}
                    className="grid grid-cols-12 gap-4 items-center px-6 py-4 ghost-border-t hover:bg-surface-container-low transition-colors"
                  >
                    {/* Transaction & Date */}
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-surface-container-low rounded-xl flex items-center justify-center text-on-surface-variant">
                        {getCategoryIcon(payment.type)}
                      </div>
                      <div>
                        <p className="font-semibold text-on-surface text-sm">
                          {payment.description || (isSent ? 'Payment Sent' : 'Payment Received')}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {new Date(payment.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: '2-digit',
                            year: 'numeric',
                          })}
                          {' \u2022 '}
                          {new Date(payment.created_at).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Category */}
                    <div className="col-span-2">
                      <span className="text-sm text-on-surface-variant">
                        {getCategoryLabel(payment.type)}
                      </span>
                    </div>

                    {/* To / From */}
                    <div className="col-span-3 flex items-center gap-2">
                      {otherParty?.profile_photo ? (
                        <img
                          src={otherParty.profile_photo}
                          alt={otherParty.name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 bg-primary-fixed rounded-full flex items-center justify-center">
                          <span className="text-[10px] font-bold text-primary">
                            {(otherParty?.name || '?').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-sm text-on-surface">
                        {otherParty?.name || 'Unknown'}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="col-span-1">
                      {getStatusBadge(payment.status)}
                    </div>

                    {/* Amount */}
                    <div className="col-span-2 text-right">
                      <span className="font-bold text-on-surface">
                        {formatPrice(payment.amount)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Load More */}
      {hasMore && (
        <div className="text-center mt-6">
          <Button
            variant="outline"
            onClick={() => setLimit(prev => prev + 20)}
          >
            Load More Transactions
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FetchError } from '@/components/ui/fetch-error'
import { useFetch } from '@/lib/hooks/use-fetch'
import { formatPrice, formatDate } from '@/lib/utils'
import {
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Settings,
  Loader2,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
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
}

export default function PaymentsPage() {
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all')

  const { data, isLoading, error, refetch } = useFetch<PaymentData>(
    `/api/payments/history?type=${filter}`,
    { deps: [filter] }
  )

  const payments = data?.payments ?? []
  const summary = data?.summary ?? null
  const currentUserId = data?.current_user_id ?? null

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'pending':
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'failed':
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'refunded':
        return <RefreshCw className="h-4 w-4 text-blue-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'refunded':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600">Manage your payment history and settings</p>
        </div>
        <Link href="/settings/payments">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Payment Settings
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card variant="bordered">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ArrowDownLeft className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Received</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatPrice(summary.total_received)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="bordered">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ArrowUpRight className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Sent</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatPrice(summary.total_sent)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="bordered">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending In</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {formatPrice(summary.pending_received)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="bordered">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending Out</p>
                  <p className="text-xl font-bold text-gray-600">
                    {formatPrice(summary.pending_sent)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'sent', 'received'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Payment List */}
      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <FetchError message={error} onRetry={refetch} />
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No transactions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {payments.map((payment) => {
                const isSent = payment.payer_id === currentUserId
                const otherParty = isSent ? payment.recipient : payment.payer

                return (
                  <div
                    key={payment.id}
                    className="py-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2 rounded-full ${
                          isSent ? 'bg-blue-100' : 'bg-green-100'
                        }`}
                      >
                        {isSent ? (
                          <ArrowUpRight className="h-5 w-5 text-blue-600" />
                        ) : (
                          <ArrowDownLeft className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {isSent ? 'Sent to ' : 'Received from '}
                          {otherParty?.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {payment.description || payment.type}
                          {payment.listing && (
                            <span> - {payment.listing.title}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(payment.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-lg font-semibold ${
                          isSent ? 'text-gray-900' : 'text-green-600'
                        }`}
                      >
                        {isSent ? '-' : '+'}
                        {formatPrice(payment.amount)}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${getStatusColor(
                          payment.status
                        )}`}
                      >
                        {getStatusIcon(payment.status)}
                        {payment.status}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

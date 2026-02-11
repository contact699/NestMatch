'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { clientLogger } from '@/lib/client-logger'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/modal'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CreditCard,
  Building2,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  DollarSign,
} from 'lucide-react'

interface PaymentMethod {
  id: string
  type: string
  card: {
    brand: string
    last4: string
    exp_month: number
    exp_year: number
  } | null
  is_default: boolean
}

interface ConnectStatus {
  status: string
  account?: {
    id: string
    charges_enabled: boolean
    payouts_enabled: boolean
    details_submitted: boolean
  }
  balance?: {
    available: { currency: string; amount: number }[]
    pending: { currency: string; amount: number }[]
  }
  dashboard_link?: string
  stats?: {
    total_received: number
    total_pending: number
    total_transactions: number
  }
}

export default function PaymentSettingsPage() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [onboarding, setOnboarding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{open: boolean; title: string; message: string; onConfirm: () => void}>({open: false, title: '', message: '', onConfirm: () => {}})

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch payment methods and Connect status in parallel
      const [methodsRes, connectRes] = await Promise.all([
        fetch('/api/payments/methods'),
        fetch('/api/connect/status'),
      ])

      if (methodsRes.ok) {
        const methodsData = await methodsRes.json()
        setPaymentMethods(methodsData.payment_methods)
      }

      if (connectRes.ok) {
        const connectData = await connectRes.json()
        setConnectStatus(connectData)
      }
    } catch (error) {
      clientLogger.error('Error fetching payment data', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartOnboarding = async () => {
    try {
      setOnboarding(true)
      const res = await fetch('/api/connect/onboard', { method: 'POST' })
      const data = await res.json()

      if (data.onboarding_url) {
        window.location.href = data.onboarding_url
      } else if (data.status === 'complete') {
        fetchData()
      }
    } catch (error) {
      clientLogger.error('Error starting onboarding', error)
    } finally {
      setOnboarding(false)
    }
  }

  const handleDeleteMethod = (methodId: string) => {
    setConfirmModal({
      open: true,
      title: 'Remove Payment Method',
      message: 'Are you sure you want to remove this payment method?',
      onConfirm: async () => {
        try {
          setDeletingId(methodId)
          const res = await fetch('/api/payments/methods', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_method_id: methodId }),
          })

          if (res.ok) {
            setPaymentMethods((prev) => prev.filter((m) => m.id !== methodId))
            toast.success('Payment method removed')
          } else {
            toast.error('Failed to remove payment method')
          }
        } catch (error) {
          clientLogger.error('Error deleting payment method', error)
          toast.error('Failed to remove payment method')
        } finally {
          setDeletingId(null)
        }
        setConfirmModal(prev => ({ ...prev, open: false }))
      },
    })
  }

  const getCardBrandIcon = (brand: string) => {
    // In production, you'd use actual card brand icons
    return <CreditCard className="h-6 w-6" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/settings"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Settings
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Payment Settings</h1>
        <p className="text-gray-600">Manage your payment methods and payout account</p>
      </div>

      {/* Connect Account Section - For receiving payments */}
      <Card variant="bordered" className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Receive Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {connectStatus?.status === 'not_created' ? (
            <div className="text-center py-6">
              <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Start receiving payments
              </h3>
              <p className="text-gray-500 mb-4 max-w-md mx-auto">
                Set up your payout account to receive rent payments directly from tenants.
                Payments are securely processed through Stripe.
              </p>
              <Button onClick={handleStartOnboarding} disabled={onboarding}>
                {onboarding ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Set Up Payouts
              </Button>
            </div>
          ) : connectStatus?.status === 'pending' ? (
            <div className="flex items-start gap-4 p-4 bg-yellow-50 rounded-lg">
              <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-yellow-800">Complete your account setup</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Your payout account setup is incomplete. Please finish the onboarding process.
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={handleStartOnboarding}
                  disabled={onboarding}
                >
                  {onboarding ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Continue Setup
                </Button>
              </div>
            </div>
          ) : connectStatus?.status === 'active' ? (
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-green-800">Account active</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Your payout account is set up and ready to receive payments.
                  </p>
                </div>
              </div>

              {/* Balance */}
              {connectStatus.balance && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Available Balance</p>
                    <p className="text-xl font-bold text-gray-900">
                      {connectStatus.balance.available
                        .map((b) => formatPrice(b.amount))
                        .join(', ') || '$0.00'}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Pending</p>
                    <p className="text-xl font-bold text-gray-900">
                      {connectStatus.balance.pending
                        .map((b) => formatPrice(b.amount))
                        .join(', ') || '$0.00'}
                    </p>
                  </div>
                </div>
              )}

              {/* Stats */}
              {connectStatus.stats && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-gray-900">
                        {formatPrice(connectStatus.stats.total_received)}
                      </p>
                      <p className="text-xs text-gray-500">Total Received</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">
                        {formatPrice(connectStatus.stats.total_pending)}
                      </p>
                      <p className="text-xs text-gray-500">Pending</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">
                        {connectStatus.stats.total_transactions}
                      </p>
                      <p className="text-xs text-gray-500">Transactions</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Dashboard Link */}
              {connectStatus.dashboard_link && (
                <a
                  href={connectStatus.dashboard_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open Stripe Dashboard
                </a>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-4 p-4 bg-red-50 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-red-800">Account restricted</h4>
                <p className="text-sm text-red-700 mt-1">
                  There's an issue with your payout account. Please update your information.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={handleStartOnboarding}
                >
                  Update Account
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods Section - For sending payments */}
      <Card variant="bordered">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </CardTitle>
          <Button variant="outline" size="sm" disabled>
            <Plus className="h-4 w-4 mr-1" />
            Add Card
          </Button>
        </CardHeader>
        <CardContent>
          {paymentMethods.length === 0 ? (
            <div className="text-center py-6">
              <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No payment methods added yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Add a card when making your first payment
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    {method.card && getCardBrandIcon(method.card.brand)}
                    <div>
                      <p className="font-medium text-gray-900">
                        {method.card?.brand?.charAt(0).toUpperCase()}
                        {method.card?.brand?.slice(1)} ending in {method.card?.last4}
                      </p>
                      <p className="text-sm text-gray-500">
                        Expires {method.card?.exp_month}/{method.card?.exp_year}
                      </p>
                    </div>
                    {method.is_default && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteMethod(method.id)}
                    disabled={deletingId === method.id}
                  >
                    {deletingId === method.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-red-500" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-1">Secure Payments</h4>
        <p className="text-sm text-blue-700">
          All payments are processed securely through Stripe. NestMatch never stores your
          full card details. A 5% platform fee applies to all transactions.
        </p>
      </div>

      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Remove"
        variant="danger"
      />
    </div>
  )
}

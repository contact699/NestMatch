'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { clientLogger } from '@/lib/client-logger'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/modal'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'
import {
  CreditCard,
  Building2,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  DollarSign,
  Shield,
  Pencil,
  ArrowDownToLine,
  ArrowUpFromLine,
  Users,
  Lock,
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

  const handleSetDefault = async (methodId: string) => {
    try {
      const res = await fetch('/api/payments/methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method_id: methodId, set_default: true }),
      })

      if (res.ok) {
        setPaymentMethods(prev =>
          prev.map(m => ({ ...m, is_default: m.id === methodId }))
        )
        toast.success('Default payment method updated')
      } else {
        toast.error('Failed to update default method')
      }
    } catch (error) {
      clientLogger.error('Error setting default method', error)
      toast.error('Failed to update default method')
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

  // Dynamic stats
  const currentBalance = useMemo(() => {
    if (!connectStatus?.balance) return 0
    return connectStatus.balance.available.reduce((sum, b) => sum + b.amount, 0)
  }, [connectStatus])

  const totalSent = useMemo(() => {
    return connectStatus?.stats?.total_pending ?? 0
  }, [connectStatus])

  const totalReceived = useMemo(() => {
    return connectStatus?.stats?.total_received ?? 0
  }, [connectStatus])

  const getCardBrandDisplay = (brand: string) => {
    const b = brand?.toLowerCase() ?? ''
    if (b === 'visa') return { label: 'VISA', color: 'bg-primary text-on-primary' }
    if (b === 'mastercard') return { label: 'MC', color: 'bg-tertiary-fixed text-tertiary' }
    if (b === 'amex') return { label: 'AMEX', color: 'bg-secondary-container text-secondary' }
    return { label: brand?.toUpperCase() ?? 'CARD', color: 'bg-surface-container text-on-surface' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <p className="text-xs font-bold uppercase tracking-wider text-secondary mb-2">
            Security & Billing
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-on-surface tracking-tight mb-2">
            Payment Methods
          </h1>
          <p className="text-on-surface-variant text-base max-w-xl">
            Manage your secure payment options and view your financial overview at a glance.
          </p>
        </div>
        <Button className="flex-shrink-0" disabled>
          <CreditCard className="h-4 w-4 mr-2" />
          Add New Card
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Current Balance */}
        <Card variant="bordered" className="p-6 col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-secondary-container rounded-lg flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-secondary" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Current Balance
            </span>
          </div>
          <p className="font-display text-3xl font-extrabold text-on-surface">
            {formatPrice(currentBalance)}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            Available for next payment
          </p>
        </Card>

        {/* Total Sent (YTD) */}
        <Card variant="bordered" className="p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            Total Sent (YTD)
          </p>
          <p className="font-display text-2xl font-extrabold text-on-surface">
            {formatPrice(totalSent)}
          </p>
        </Card>

        {/* Total Received (YTD) */}
        <Card variant="bordered" className="p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            Total Received (YTD)
          </p>
          <p className="font-display text-2xl font-extrabold text-on-surface">
            {formatPrice(totalReceived)}
          </p>
        </Card>

        {/* Active Split Groups */}
        <Card variant="bordered" className="p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            Active Split Groups
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 bg-primary-fixed rounded-full flex items-center justify-center ghost-border">
                <Users className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>
            <span className="text-sm text-on-surface-variant">
              {connectStatus?.stats?.total_transactions ? 'Active' : 'None'}
            </span>
          </div>
        </Card>
      </div>

      {/* Withdraw / Top Up */}
      <div className="flex gap-3 mb-10">
        <Button variant="outline" size="sm">
          <ArrowUpFromLine className="h-4 w-4 mr-1.5" />
          Withdraw
        </Button>
        <Button size="sm">
          <ArrowDownToLine className="h-4 w-4 mr-1.5" />
          Top Up
        </Button>
      </div>

      {/* Verified Payment Methods */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="h-5 w-5 text-secondary" />
          <h2 className="font-display text-xl font-bold text-on-surface">
            Verified Payment Methods
          </h2>
        </div>

        {paymentMethods.length === 0 ? (
          <Card variant="bordered" className="p-12 text-center">
            <CreditCard className="h-12 w-12 text-outline-variant mx-auto mb-4" />
            <p className="text-on-surface-variant font-medium">No payment methods added yet</p>
            <p className="text-sm text-on-surface-variant mt-1">
              Add a card when making your first payment
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paymentMethods.map((method) => {
              const brandDisplay = method.card ? getCardBrandDisplay(method.card.brand) : null

              return (
                <Card
                  key={method.id}
                  variant="bordered"
                  className={`p-6 relative ${method.is_default ? 'ring-2 ring-secondary' : ''}`}
                >
                  {/* Default badge */}
                  {method.is_default && (
                    <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-bold bg-secondary-container text-secondary uppercase tracking-wider">
                      Default
                    </span>
                  )}

                  {/* Card brand icon */}
                  <div className="flex items-center gap-4 mb-4">
                    {brandDisplay && (
                      <div className={`w-12 h-8 rounded ${brandDisplay.color} flex items-center justify-center text-xs font-bold`}>
                        {brandDisplay.label}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      {method.card?.brand?.toUpperCase() === 'VISA' ? (
                        <span className="text-xs font-bold text-on-surface-variant uppercase">Credit Card</span>
                      ) : (
                        <span className="text-xs font-bold text-on-surface-variant uppercase">Credit Card</span>
                      )}
                    </div>
                  </div>

                  {/* Card number */}
                  <p className="text-lg font-mono text-on-surface tracking-wider mb-4">
                    {'•••• '}{method.card?.last4 || '****'}
                  </p>

                  {/* Card holder */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        Card Holder
                      </p>
                      <p className="text-sm font-semibold text-on-surface uppercase">
                        {method.card?.brand
                          ? `${method.card.brand.charAt(0).toUpperCase()}${method.card.brand.slice(1)} Card`
                          : 'Card Holder'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!method.is_default && (
                        <button
                          onClick={() => handleSetDefault(method.id)}
                          className="text-xs font-medium text-secondary hover:underline"
                        >
                          Set as Default
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteMethod(method.id)}
                        disabled={deletingId === method.id}
                        className="p-1.5 rounded hover:bg-surface-container-low transition-colors"
                        title="Edit"
                      >
                        {deletingId === method.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-on-surface-variant" />
                        ) : (
                          <Pencil className="h-4 w-4 text-on-surface-variant" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteMethod(method.id)}
                        disabled={deletingId === method.id}
                        className="p-1.5 rounded hover:bg-error-container transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-on-surface-variant" />
                      </button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Connect Account Section */}
      {connectStatus?.status !== 'active' && (
        <Card variant="bordered" className="mb-10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Building2 className="h-5 w-5" />
              Receive Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {connectStatus?.status === 'not_created' ? (
              <div className="text-center py-6">
                <DollarSign className="h-12 w-12 text-outline-variant mx-auto mb-4" />
                <h3 className="font-display text-lg font-bold text-on-surface mb-2">
                  Start receiving payments
                </h3>
                <p className="text-on-surface-variant mb-4 max-w-md mx-auto">
                  Set up your payout account to receive rent payments directly from tenants.
                </p>
                <Button onClick={handleStartOnboarding} disabled={onboarding}>
                  {onboarding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Set Up Payouts
                </Button>
              </div>
            ) : connectStatus?.status === 'pending' ? (
              <div className="flex items-start gap-4 p-4 bg-tertiary-fixed/30 rounded-xl">
                <AlertCircle className="h-6 w-6 text-on-surface-variant flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-on-surface">Complete your account setup</h4>
                  <p className="text-sm text-on-surface-variant mt-1">
                    Your payout account setup is incomplete. Please finish the onboarding process.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={handleStartOnboarding}
                    disabled={onboarding}
                  >
                    {onboarding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Continue Setup
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-4 p-4 bg-error-container rounded-xl">
                <AlertCircle className="h-6 w-6 text-error flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-error">Account restricted</h4>
                  <p className="text-sm text-on-surface-variant mt-1">
                    There&apos;s an issue with your payout account. Please update your information.
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
      )}

      {/* Active Connect Account Info */}
      {connectStatus?.status === 'active' && (
        <Card variant="bordered" className="mb-10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Building2 className="h-5 w-5 text-secondary" />
              Payout Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4 p-4 bg-secondary-container/30 rounded-xl mb-4">
              <CheckCircle className="h-6 w-6 text-secondary flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-on-surface">Account active</h4>
                <p className="text-sm text-on-surface-variant mt-1">
                  Your payout account is set up and ready to receive payments.
                </p>
              </div>
            </div>

            {connectStatus.dashboard_link && (
              <a
                href={connectStatus.dashboard_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-secondary hover:underline font-medium"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Open Stripe Dashboard
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-on-surface">Recent Activity</h2>
          <Link href="/payments" className="text-sm font-medium text-on-surface-variant hover:text-secondary transition-colors">
            View Full History
          </Link>
        </div>
        <Card variant="bordered" className="p-6 text-center">
          <p className="text-on-surface-variant text-sm">
            Activity will appear here once you start making payments.
          </p>
        </Card>
      </div>

      {/* Security Info */}
      <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-xl">
        <Lock className="h-5 w-5 text-secondary flex-shrink-0" />
        <div>
          <h4 className="font-semibold text-on-surface text-sm">Bank-Grade AES-256 Encryption</h4>
          <p className="text-xs text-on-surface-variant">
            All payments are processed securely through Stripe. NestMatch never stores your
            full card details.
          </p>
        </div>
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

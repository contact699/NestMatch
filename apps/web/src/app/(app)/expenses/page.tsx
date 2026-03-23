'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FetchError } from '@/components/ui/fetch-error'
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '@/components/ui/modal'
import { useFetch } from '@/lib/hooks/use-fetch'
import { formatPrice, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Plus,
  Receipt,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Home,
  Wifi,
  ShoppingCart,
  Filter,
  Search,
  ArrowRight,
} from 'lucide-react'

interface ExpenseShare {
  id: string
  user_id: string
  amount: number
  percentage: number | null
  status: string
  paid_at: string | null
  user: {
    name: string
    profile_photo: string | null
  }
}

interface Expense {
  id: string
  title: string
  description: string | null
  total_amount: number
  split_type: string
  category: string | null
  status: string
  due_date: string | null
  created_at: string
  created_by: string
  creator: {
    name: string
    profile_photo: string | null
  }
  listing: {
    id: string
    title: string
    city: string
  } | null
  shares: ExpenseShare[]
}

interface ExpenseSummary {
  total_owed: number
  total_owing: number
}

interface ExpenseData {
  expenses: Expense[]
  summary: ExpenseSummary
}

export default function ExpensesPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [category, setCategory] = useState<string>('other')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')

  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)
    }
    getUser()
  }, [])

  const statusParam = filter !== 'all' ? `?status=${filter}` : ''
  const { data, isLoading, error, refetch } = useFetch<ExpenseData>(
    `/api/expenses${statusParam}`,
    { deps: [filter] }
  )

  const expenses = data?.expenses ?? []
  const summary = data?.summary ?? null

  // Compute balance
  const balance = (summary?.total_owing ?? 0) - (summary?.total_owed ?? 0)
  const totalGroupSpent = expenses.reduce((sum, e) => sum + e.total_amount, 0)

  // Compute settlement flow - who owes whom
  const settlementMap = new Map<string, { name: string; photo: string | null; amount: number }>()
  expenses.forEach(expense => {
    expense.shares.forEach(share => {
      if (share.status !== 'paid' && share.user_id !== expense.created_by) {
        const existing = settlementMap.get(share.user_id)
        if (existing) {
          existing.amount -= share.amount
        } else {
          settlementMap.set(share.user_id, {
            name: share.user?.name || 'Unknown',
            photo: share.user?.profile_photo || null,
            amount: -share.amount,
          })
        }
      }
    })
  })
  const settlements = Array.from(settlementMap.entries()).map(([id, data]) => ({
    id,
    ...data,
  }))

  const resetForm = () => {
    setTitle('')
    setTotalAmount('')
    setCategory('other')
    setDescription('')
    setDueDate('')
  }

  const handleCreateExpense = async () => {
    if (!title.trim() || !totalAmount || !currentUserId) return

    const amount = parseFloat(totalAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          total_amount: amount,
          category,
          description: description.trim() || undefined,
          due_date: dueDate || undefined,
          split_type: 'equal',
          shares: [{ user_id: currentUserId }],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to create expense')
        return
      }

      toast.success('Expense created successfully')
      setShowCreateModal(false)
      resetForm()
      refetch()
    } catch {
      toast.error('Failed to create expense')
    } finally {
      setCreating(false)
    }
  }

  const getCategoryIcon = (cat: string | null) => {
    switch (cat) {
      case 'rent':
        return <Home className="h-5 w-5" />
      case 'utilities':
        return <Receipt className="h-5 w-5" />
      case 'internet':
        return <Wifi className="h-5 w-5" />
      case 'groceries':
        return <ShoppingCart className="h-5 w-5" />
      default:
        return <DollarSign className="h-5 w-5" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-surface-container text-on-surface-variant">
            Settled
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-secondary-container text-secondary">
            Pending
          </span>
        )
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-error-container text-error">
            Overdue
          </span>
        )
      default:
        return null
    }
  }

  const formatExpenseTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return `Today, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
    }
    if (diffDays === 1) {
      return `Yesterday, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
    }
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Contextual Nav */}
      <nav className="flex items-center gap-8 mb-8 text-sm font-medium">
        <Link href="/groups" className="text-on-surface-variant hover:text-on-surface transition-colors pb-1">
          Groups
        </Link>
        <Link href="/expenses" className="text-on-surface border-b-2 border-primary pb-1">
          Expenses
        </Link>
        <Link href="/groups" className="text-on-surface-variant hover:text-on-surface transition-colors pb-1">
          Agreement
        </Link>
        <Link href="/payments" className="text-on-surface-variant hover:text-on-surface transition-colors pb-1">
          Payments
        </Link>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-on-surface tracking-tight mb-2">
            House Expenses
          </h1>
          <p className="text-on-surface-variant text-base max-w-xl">
            Track shared costs and settle balances without the awkward conversations.
            Everything is clear, fair, and recorded.
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="flex-shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Your Balance */}
          <Card variant="bordered" className="p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
              Your Balance
            </p>
            <div className="flex items-baseline gap-2 mb-1">
              <span className={`font-display text-4xl font-extrabold ${balance >= 0 ? 'text-secondary' : 'text-error'}`}>
                {formatPrice(Math.abs(balance))}
              </span>
              <span className={`text-sm font-medium ${balance >= 0 ? 'text-secondary' : 'text-error'}`}>
                {balance >= 0 ? 'to receive' : 'you owe'}
              </span>
            </div>
            <div className="ghost-border-t mt-4 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-on-surface-variant">Total group spent</span>
                <span className="text-sm font-semibold text-on-surface">
                  {formatPrice(totalGroupSpent)}
                </span>
              </div>
            </div>
          </Card>

          {/* Settlement Flow */}
          {settlements.length > 0 && (
            <Card variant="bordered" className="p-6">
              <h3 className="font-display text-lg font-bold text-on-surface mb-4">
                Settlement Flow
              </h3>
              <div className="space-y-4">
                {settlements.map((s) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-fixed rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">
                        {s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-on-surface">{s.name}</span>
                      <div className="mt-1 h-2 rounded-full bg-surface-container overflow-hidden">
                        <div
                          className={`h-full rounded-full ${s.amount < 0 ? 'bg-error' : 'bg-secondary'}`}
                          style={{ width: `${Math.min(Math.abs(s.amount) / (totalGroupSpent || 1) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${s.amount < 0 ? 'text-error' : 'text-secondary'}`}>
                      {s.amount < 0 ? '-' : '+'}{formatPrice(Math.abs(s.amount))}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/payments"
                className="block mt-4 text-sm font-medium text-secondary hover:underline"
              >
                View Detailed History
              </Link>
            </Card>
          )}
        </div>

        {/* Right content - Recent Activity */}
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-bold text-on-surface">Recent Activity</h2>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg hover:bg-surface-container-low transition-colors">
                <Filter className="h-4 w-4 text-on-surface-variant" />
              </button>
              <button className="p-2 rounded-lg hover:bg-surface-container-low transition-colors">
                <Search className="h-4 w-4 text-on-surface-variant" />
              </button>
            </div>
          </div>

          {error ? (
            <FetchError message={error} onRetry={refetch} />
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-secondary" />
            </div>
          ) : expenses.length === 0 ? (
            <Card variant="bordered" className="p-12 text-center">
              <Receipt className="h-12 w-12 text-outline-variant mx-auto mb-4" />
              <h3 className="font-display text-lg font-bold text-on-surface mb-2">
                No expenses yet
              </h3>
              <p className="text-on-surface-variant mb-6">
                Create your first shared expense to start splitting bills with roommates.
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Expense
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {expenses.map((expense) => {
                const isExpanded = expandedId === expense.id
                const paidCount = expense.shares.filter((s) => s.status === 'paid').length
                const totalShares = expense.shares.length
                const splitLabel = expense.split_type === 'equal'
                  ? `Split equally (${totalShares} people)`
                  : `${paidCount}/${totalShares} paid`

                return (
                  <Card key={expense.id} variant="bordered">
                    <CardContent className="py-5">
                      {/* Main Row */}
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : expense.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-surface-container-low rounded-xl flex items-center justify-center text-on-surface-variant">
                            {getCategoryIcon(expense.category)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-on-surface">{expense.title}</h3>
                            <p className="text-sm text-on-surface-variant">
                              Paid by <span className="font-medium">{expense.creator?.name || 'Unknown'}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-bold text-on-surface">
                              {formatPrice(expense.total_amount)}
                            </p>
                            {getStatusBadge(expense.status)}
                          </div>
                        </div>
                      </div>

                      {/* Split info + time row */}
                      <div className="flex items-center justify-between mt-3 pl-14">
                        <div className="flex items-center gap-2">
                          {expense.shares.slice(0, 3).map((share) => (
                            <div
                              key={share.id}
                              className="w-6 h-6 rounded-full bg-primary-fixed flex items-center justify-center -ml-1 first:ml-0"
                              title={share.user?.name}
                            >
                              <span className="text-[10px] font-bold text-primary">
                                {(share.user?.name || '?').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          ))}
                          <span className="text-xs text-on-surface-variant ml-1">{splitLabel}</span>
                        </div>
                        <span className="text-xs text-on-surface-variant">
                          {formatExpenseTime(expense.created_at)}
                        </span>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 ghost-border-t">
                          {expense.description && (
                            <p className="text-sm text-on-surface-variant mb-4">{expense.description}</p>
                          )}

                          <div className="flex items-center gap-4 text-sm text-on-surface-variant mb-4">
                            <span>Created: {formatDate(expense.created_at)}</span>
                            {expense.due_date && (
                              <span>Due: {formatDate(expense.due_date)}</span>
                            )}
                            <span className="capitalize">Split: {expense.split_type}</span>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-on-surface">Shares</h4>
                            {expense.shares.map((share) => (
                              <div
                                key={share.id}
                                className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-primary-fixed rounded-full flex items-center justify-center">
                                    <span className="text-xs font-bold text-primary">
                                      {(share.user?.name || '?').charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="text-on-surface text-sm">
                                    {share.user?.name || 'Unknown'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-medium text-sm text-on-surface">
                                    {formatPrice(share.amount)}
                                  </span>
                                  {getStatusBadge(share.status)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}

              {/* Show all activity link */}
              <div className="text-center pt-2">
                <Link
                  href="/payments"
                  className="inline-flex items-center gap-1 text-sm font-medium text-on-surface hover:text-secondary transition-colors"
                >
                  Show all activity
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Expense Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetForm() }}
        size="lg"
        ariaLabel="Create new expense"
      >
        <ModalHeader onClose={() => { setShowCreateModal(false); resetForm() }}>
          <ModalTitle>New Expense</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-4">
            <div>
              <label htmlFor="expense-title" className="block text-sm font-medium text-on-surface mb-1">
                Title *
              </label>
              <input
                id="expense-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., February Rent, Groceries, Internet Bill"
                className="w-full px-3 py-2.5 ghost-border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant"
                maxLength={255}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="expense-amount" className="block text-sm font-medium text-on-surface mb-1">
                  Amount (CAD) *
                </label>
                <input
                  id="expense-amount"
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  className="w-full px-3 py-2.5 ghost-border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant"
                />
              </div>

              <div>
                <label htmlFor="expense-category" className="block text-sm font-medium text-on-surface mb-1">
                  Category
                </label>
                <select
                  id="expense-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 ghost-border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent bg-surface-container-lowest text-on-surface appearance-none"
                >
                  <option value="rent">Rent</option>
                  <option value="utilities">Utilities</option>
                  <option value="groceries">Groceries</option>
                  <option value="internet">Internet</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="expense-due" className="block text-sm font-medium text-on-surface mb-1">
                Due Date
              </label>
              <input
                id="expense-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 ghost-border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent bg-surface-container-lowest text-on-surface"
              />
            </div>

            <div>
              <label htmlFor="expense-desc" className="block text-sm font-medium text-on-surface mb-1">
                Description
              </label>
              <textarea
                id="expense-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details about the expense"
                rows={3}
                className="w-full px-3 py-2.5 ghost-border rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant resize-none"
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => { setShowCreateModal(false); resetForm() }}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateExpense}
            isLoading={creating}
            disabled={!title.trim() || !totalAmount || creating}
          >
            Create Expense
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

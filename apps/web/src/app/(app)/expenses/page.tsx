'use client'

import { useState, useEffect } from 'react'
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
        return <Home className="h-4 w-4" />
      case 'utilities':
        return <Receipt className="h-4 w-4" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3" />
            Paid
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        )
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">
            <AlertCircle className="h-3 w-3" />
            Overdue
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bill Splitting</h1>
          <p className="text-gray-600">Manage shared expenses with roommates</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Expense
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card variant="bordered">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">You Owe</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatPrice(summary.total_owed)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="bordered">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Owed to You</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatPrice(summary.total_owing)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'completed'] as const).map((f) => (
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

      {/* Expenses List */}
      {error ? (
        <FetchError message={error} onRetry={refetch} />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : expenses.length === 0 ? (
        <Card variant="bordered">
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No expenses yet
            </h3>
            <p className="text-gray-500 mb-4">
              Create your first shared expense to start splitting bills with roommates.
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Expense
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {expenses.map((expense) => {
            const isExpanded = expandedId === expense.id
            const paidCount = expense.shares.filter((s) => s.status === 'paid').length
            const totalShares = expense.shares.length

            return (
              <Card key={expense.id} variant="bordered">
                <CardContent className="py-4">
                  {/* Main Row */}
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : expense.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        {getCategoryIcon(expense.category)}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{expense.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>By {expense.creator?.name || 'Unknown'}</span>
                          {expense.listing && (
                            <>
                              <span>•</span>
                              <span>{expense.listing.title}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {formatPrice(expense.total_amount)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {paidCount}/{totalShares} paid
                        </p>
                      </div>
                      {getStatusBadge(expense.status)}
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      {expense.description && (
                        <p className="text-sm text-gray-600 mb-4">{expense.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <span>Created: {formatDate(expense.created_at)}</span>
                        {expense.due_date && (
                          <span>Due: {formatDate(expense.due_date)}</span>
                        )}
                        <span className="capitalize">Split: {expense.split_type}</span>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">Shares</h4>
                        {expense.shares.map((share) => (
                          <div
                            key={share.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <Users className="h-4 w-4 text-blue-600" />
                              </div>
                              <span className="text-gray-900">
                                {share.user?.name || 'Unknown'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-medium">
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
        </div>
      )}

      {/* Info */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-1">How Bill Splitting Works</h4>
        <p className="text-sm text-blue-700">
          Create shared expenses for rent, utilities, groceries, or other costs. Roommates
          can pay their share directly through the app, and you'll receive the money in your
          payout account.
        </p>
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
              <label htmlFor="expense-title" className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                id="expense-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., February Rent, Groceries, Internet Bill"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={255}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="expense-amount" className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="expense-category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="expense-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <label htmlFor="expense-due" className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                id="expense-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="expense-desc" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="expense-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details about the expense"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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

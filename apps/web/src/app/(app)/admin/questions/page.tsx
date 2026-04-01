'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  MessageCircle,
  Loader2,
  X,
  HelpCircle,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { SubmittedQuestion, ResourceCategory, Profile } from '@/types/database'

type QuestionWithProfile = SubmittedQuestion & {
  profile?: Pick<Profile, 'name' | 'email'>
}

const statusConfig = {
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'bg-tertiary-fixed text-tertiary-container',
  },
  reviewed: {
    label: 'Reviewed',
    icon: Eye,
    color: 'bg-primary/10 text-primary',
  },
  answered: {
    label: 'Answered',
    icon: CheckCircle,
    color: 'bg-secondary-container text-secondary',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    color: 'bg-error-container text-error',
  },
}

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<QuestionWithProfile[]>([])
  const [categories, setCategories] = useState<ResourceCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionWithProfile | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()

    const [questionsRes, categoriesRes] = await Promise.all([
      supabase
        .from('submitted_questions')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('resource_categories').select('*').order('display_order'),
    ])

    // Fetch profiles for user_ids
    const userIds = (questionsRes.data || [])
      .map((q: any) => q.user_id)
      .filter(Boolean) as string[]

    let profiles: Record<string, Pick<Profile, 'name' | 'email'>> = {}
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds)

      profiles = (profilesData || []).reduce((acc: any, p: any) => {
        acc[p.user_id] = { name: p.name, email: p.email }
        return acc
      }, {} as Record<string, Pick<Profile, 'name' | 'email'>>)
    }

    const questionsWithProfiles = (questionsRes.data || []).map((q: any) => ({
      ...q,
      profile: q.user_id ? profiles[q.user_id] : undefined,
    }))

    setQuestions(questionsWithProfiles)
    setCategories(categoriesRes.data || [])
    setIsLoading(false)
  }

  const updateStatus = async (
    id: string,
    status: 'pending' | 'reviewed' | 'answered' | 'rejected'
  ) => {
    setIsUpdating(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('submitted_questions')
      .update({
        status,
        admin_notes: adminNotes || null,
      })
      .eq('id', id)

    if (!error) {
      setQuestions(
        questions.map((q) =>
          q.id === id ? { ...q, status, admin_notes: adminNotes } : q
        )
      )
      setSelectedQuestion(null)
      setAdminNotes('')
    }

    setIsUpdating(false)
  }

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Uncategorized'
    return categories.find((c) => c.id === categoryId)?.name || 'Unknown'
  }

  const filteredQuestions = filterStatus
    ? questions.filter((q) => q.status === filterStatus)
    : questions

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-on-surface">Submitted Questions</h1>
          <p className="text-on-surface-variant mt-1">Review and respond to user-submitted questions</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-on-surface-variant" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 ghost-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest text-on-surface"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="answered">Answered</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = questions.filter((q) => q.status === status).length
          const Icon = config.icon

          return (
            <button
              key={status}
              onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
              className={`bg-surface-container-lowest rounded-xl p-4 text-left transition-colors ${
                filterStatus === status
                  ? 'ghost-border ring-2 ring-primary/20'
                  : 'ghost-border hover:bg-surface-container-low'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon
                  className={`h-5 w-5 ${
                    status === 'pending'
                      ? 'text-tertiary-container'
                      : status === 'reviewed'
                      ? 'text-primary'
                      : status === 'answered'
                      ? 'text-secondary'
                      : 'text-error'
                  }`}
                />
                <span className="text-2xl font-display font-bold text-on-surface">{count}</span>
              </div>
              <p className="text-sm text-on-surface-variant">{config.label}</p>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Questions List */}
        <div className="lg:col-span-2">
          <div className="bg-surface-container-lowest rounded-xl ghost-border overflow-hidden">
            {filteredQuestions.length === 0 ? (
              <div className="p-12 text-center">
                <MessageCircle className="h-12 w-12 mx-auto text-on-surface-variant/40 mb-4" />
                <p className="text-on-surface-variant">No questions found</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/15">
                {filteredQuestions.map((question) => {
                  const config = statusConfig[question.status]
                  const Icon = config.icon

                  return (
                    <button
                      key={question.id}
                      onClick={() => {
                        setSelectedQuestion(question)
                        setAdminNotes(question.admin_notes || '')
                      }}
                      className={`w-full p-4 text-left hover:bg-surface-container-low transition-colors ${
                        selectedQuestion?.id === question.id ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <MessageCircle className="h-5 w-5 text-on-surface-variant mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-on-surface line-clamp-2">
                            {question.question}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.color}`}
                            >
                              <Icon className="h-3 w-3" />
                              {config.label}
                            </span>
                            {question.province && (
                              <span className="text-xs text-on-surface-variant">
                                {question.province}
                              </span>
                            )}
                            <span className="text-xs text-on-surface-variant/60">
                              {new Date(question.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div>
          {selectedQuestion ? (
            <div className="bg-surface-container-lowest rounded-xl ghost-border p-6 sticky top-8">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-display font-semibold text-on-surface">Question Details</h2>
                <button
                  onClick={() => setSelectedQuestion(null)}
                  className="text-on-surface-variant hover:text-on-surface"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-on-surface-variant uppercase">
                    Question
                  </label>
                  <p className="text-sm text-on-surface mt-1">{selectedQuestion.question}</p>
                </div>

                {selectedQuestion.context && (
                  <div>
                    <label className="text-xs font-medium text-on-surface-variant uppercase">
                      Context
                    </label>
                    <p className="text-sm text-on-surface-variant mt-1">{selectedQuestion.context}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-on-surface-variant uppercase">
                      Province
                    </label>
                    <p className="text-sm text-on-surface mt-1">
                      {selectedQuestion.province || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-on-surface-variant uppercase">
                      Category
                    </label>
                    <p className="text-sm text-on-surface mt-1">
                      {getCategoryName(selectedQuestion.category_id)}
                    </p>
                  </div>
                </div>

                {selectedQuestion.profile && (
                  <div>
                    <label className="text-xs font-medium text-on-surface-variant uppercase">
                      Submitted By
                    </label>
                    <p className="text-sm text-on-surface mt-1">
                      {selectedQuestion.profile.name || selectedQuestion.profile.email}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-on-surface-variant uppercase">
                    Submitted
                  </label>
                  <p className="text-sm text-on-surface mt-1">
                    {new Date(selectedQuestion.created_at).toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-on-surface-variant uppercase block mb-1">
                    Admin Notes
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm ghost-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-surface-container-lowest text-on-surface"
                    placeholder="Add notes about this question..."
                  />
                </div>

                <div className="pt-4 ghost-border border-b-0 border-l-0 border-r-0 space-y-2">
                  <p className="text-xs font-medium text-on-surface-variant uppercase mb-2">
                    Update Status
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatus(selectedQuestion.id, 'reviewed')}
                      disabled={isUpdating}
                      className="justify-start"
                    >
                      <Eye className="h-4 w-4 mr-2 text-primary" />
                      Reviewed
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatus(selectedQuestion.id, 'answered')}
                      disabled={isUpdating}
                      className="justify-start"
                    >
                      <CheckCircle className="h-4 w-4 mr-2 text-secondary" />
                      Answered
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatus(selectedQuestion.id, 'rejected')}
                      disabled={isUpdating}
                      className="justify-start"
                    >
                      <XCircle className="h-4 w-4 mr-2 text-error" />
                      Rejected
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatus(selectedQuestion.id, 'pending')}
                      disabled={isUpdating}
                      className="justify-start"
                    >
                      <Clock className="h-4 w-4 mr-2 text-tertiary-container" />
                      Pending
                    </Button>
                  </div>

                  <div className="pt-2">
                    <Link href={`/admin/faqs/new?question=${encodeURIComponent(selectedQuestion.question)}`}>
                      <Button className="w-full">
                        <HelpCircle className="h-4 w-4 mr-2" />
                        Create FAQ from This
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-low rounded-xl ghost-border p-6 text-center">
              <MessageCircle className="h-10 w-10 mx-auto text-on-surface-variant/40 mb-3" />
              <p className="text-on-surface-variant">Select a question to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

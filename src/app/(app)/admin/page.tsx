'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  HelpCircle,
  FolderOpen,
  MessageCircle,
  Eye,
  ThumbsUp,
  TrendingUp,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface Stats {
  resources: {
    total: number
    published: number
    featured: number
    totalViews: number
    totalHelpful: number
  }
  faqs: {
    total: number
    published: number
    totalHelpful: number
    totalNotHelpful: number
  }
  categories: {
    total: number
    active: number
  }
  questions: {
    total: number
    pending: number
    reviewed: number
    answered: number
  }
}

interface RecentItem {
  id: string
  title: string
  type: string
  date: string
  status?: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [pendingQuestions, setPendingQuestions] = useState<RecentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient()

      try {
        // Fetch resources stats
        const { data: resources } = await (supabase as any)
          .from('resources')
          .select('id, is_published, featured, view_count, helpful_count')

        const resourceStats = {
          total: resources?.length || 0,
          published: resources?.filter((r: any) => r.is_published).length || 0,
          featured: resources?.filter((r: any) => r.featured).length || 0,
          totalViews: resources?.reduce((sum: number, r: any) => sum + (r.view_count || 0), 0) || 0,
          totalHelpful: resources?.reduce((sum: number, r: any) => sum + (r.helpful_count || 0), 0) || 0,
        }

        // Fetch FAQs stats
        const { data: faqs } = await (supabase as any)
          .from('faqs')
          .select('id, is_published, helpful_count, not_helpful_count')

        const faqStats = {
          total: faqs?.length || 0,
          published: faqs?.filter((f: any) => f.is_published).length || 0,
          totalHelpful: faqs?.reduce((sum: number, f: any) => sum + (f.helpful_count || 0), 0) || 0,
          totalNotHelpful: faqs?.reduce((sum: number, f: any) => sum + (f.not_helpful_count || 0), 0) || 0,
        }

        // Fetch categories stats
        const { data: categories } = await (supabase as any)
          .from('resource_categories')
          .select('id, is_active')

        const categoryStats = {
          total: categories?.length || 0,
          active: categories?.filter((c: any) => c.is_active).length || 0,
        }

        // Fetch questions stats
        const { data: questions } = await (supabase as any)
          .from('submitted_questions')
          .select('id, status')

        const questionStats = {
          total: questions?.length || 0,
          pending: questions?.filter((q: any) => q.status === 'pending').length || 0,
          reviewed: questions?.filter((q: any) => q.status === 'reviewed').length || 0,
          answered: questions?.filter((q: any) => q.status === 'answered').length || 0,
        }

        setStats({
          resources: resourceStats,
          faqs: faqStats,
          categories: categoryStats,
          questions: questionStats,
        })

        // Fetch recent resources
        const { data: recentResources } = await (supabase as any)
          .from('resources')
          .select('id, title, resource_type, created_at')
          .order('created_at', { ascending: false })
          .limit(3)

        // Fetch recent FAQs
        const { data: recentFaqs } = await (supabase as any)
          .from('faqs')
          .select('id, question, created_at')
          .order('created_at', { ascending: false })
          .limit(3)

        const recent: RecentItem[] = [
          ...(recentResources || []).map((r: any) => ({
            id: r.id,
            title: r.title,
            type: r.resource_type,
            date: r.created_at,
          })),
          ...(recentFaqs || []).map((f: any) => ({
            id: f.id,
            title: f.question,
            type: 'FAQ',
            date: f.created_at,
          })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)

        setRecentItems(recent)

        // Fetch pending questions
        const { data: pending } = await (supabase as any)
          .from('submitted_questions')
          .select('id, question, created_at, status')
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(5)

        setPendingQuestions(
          (pending || []).map((q: any) => ({
            id: q.id,
            title: q.question,
            type: 'question',
            date: q.created_at,
            status: q.status,
          }))
        )
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your knowledge base content</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Resources */}
        <Link href="/admin/resources" className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">
              {stats?.resources.published}/{stats?.resources.total} published
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {stats?.resources.total || 0}
          </div>
          <div className="text-sm text-gray-600">Resources</div>
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {stats?.resources.totalViews.toLocaleString()} views
            </span>
            <span className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" />
              {stats?.resources.totalHelpful} helpful
            </span>
          </div>
        </Link>

        {/* FAQs */}
        <Link href="/admin/faqs" className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">
              {stats?.faqs.published}/{stats?.faqs.total} published
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {stats?.faqs.total || 0}
          </div>
          <div className="text-sm text-gray-600">FAQs</div>
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" />
              {stats?.faqs.totalHelpful} helpful
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {((stats?.faqs.totalHelpful || 0) / Math.max((stats?.faqs.totalHelpful || 0) + (stats?.faqs.totalNotHelpful || 0), 1) * 100).toFixed(0)}% positive
            </span>
          </div>
        </Link>

        {/* Categories */}
        <Link href="/admin/categories" className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">
              {stats?.categories.active}/{stats?.categories.total} active
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {stats?.categories.total || 0}
          </div>
          <div className="text-sm text-gray-600">Categories</div>
        </Link>

        {/* Submitted Questions */}
        <Link href="/admin/questions" className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-amber-600" />
            </div>
            {stats?.questions.pending ? (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                {stats.questions.pending} pending
              </span>
            ) : (
              <span className="text-xs font-medium text-gray-500">All reviewed</span>
            )}
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {stats?.questions.total || 0}
          </div>
          <div className="text-sm text-gray-600">Submitted Questions</div>
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            <span>{stats?.questions.answered} answered</span>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Questions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Pending Questions
            </h2>
            <Link href="/admin/questions" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {pendingQuestions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="h-10 w-10 mx-auto text-gray-300 mb-2" />
              <p>No pending questions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingQuestions.map((question) => (
                <Link
                  key={question.id}
                  href={`/admin/questions/${question.id}`}
                  className="block p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
                >
                  <p className="text-sm text-gray-900 line-clamp-2">{question.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(question.date).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Content */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Recently Added
            </h2>
          </div>

          {recentItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="h-10 w-10 mx-auto text-gray-300 mb-2" />
              <p>No content yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(item.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 capitalize ml-3">
                    {item.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/resources/new">
            <Button variant="secondary" className="bg-white text-blue-700 hover:bg-blue-50">
              <BookOpen className="h-4 w-4 mr-2" />
              Add Resource
            </Button>
          </Link>
          <Link href="/admin/faqs/new">
            <Button variant="secondary" className="bg-white text-blue-700 hover:bg-blue-50">
              <HelpCircle className="h-4 w-4 mr-2" />
              Add FAQ
            </Button>
          </Link>
          <Link href="/admin/categories/new">
            <Button variant="secondary" className="bg-white text-blue-700 hover:bg-blue-50">
              <FolderOpen className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

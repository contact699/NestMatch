'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { clientLogger } from '@/lib/client-logger'
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
  Zap,
  Activity,
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

interface TrendingResource {
  id: string
  title: string
  view_count: number
  resource_type: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [pendingQuestions, setPendingQuestions] = useState<RecentItem[]>([])
  const [trendingResources, setTrendingResources] = useState<TrendingResource[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient()

      try {
        // Fetch resources stats
        const { data: resources } = await supabase
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
        const { data: faqs } = await supabase
          .from('faqs')
          .select('id, is_published, helpful_count, not_helpful_count')

        const faqStats = {
          total: faqs?.length || 0,
          published: faqs?.filter((f: any) => f.is_published).length || 0,
          totalHelpful: faqs?.reduce((sum: number, f: any) => sum + (f.helpful_count || 0), 0) || 0,
          totalNotHelpful: faqs?.reduce((sum: number, f: any) => sum + (f.not_helpful_count || 0), 0) || 0,
        }

        // Fetch categories stats
        const { data: categories } = await supabase
          .from('resource_categories')
          .select('id, is_active')

        const categoryStats = {
          total: categories?.length || 0,
          active: categories?.filter((c: any) => c.is_active).length || 0,
        }

        // Fetch questions stats
        const { data: questions } = await supabase
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

        // Fetch trending resources (top by view_count)
        const { data: trending } = await supabase
          .from('resources')
          .select('id, title, view_count, resource_type')
          .eq('is_published', true)
          .order('view_count', { ascending: false })
          .limit(3)

        setTrendingResources(
          (trending || []).map((r: any) => ({
            id: r.id,
            title: r.title,
            view_count: r.view_count || 0,
            resource_type: r.resource_type,
          }))
        )

        // Fetch recent resources
        const { data: recentResources } = await supabase
          .from('resources')
          .select('id, title, resource_type, created_at')
          .order('created_at', { ascending: false })
          .limit(3)

        // Fetch recent FAQs
        const { data: recentFaqs } = await supabase
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
        const { data: pending } = await supabase
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
        clientLogger.error('Error fetching stats', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-on-surface">Admin Dashboard</h1>
        <p className="text-on-surface-variant mt-1">
          Welcome back, Curator. Monitor platform health, manage community contributions, and track engagement metrics from your sanctuary control center.
        </p>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Resources - Large Card */}
        <Link href="/admin/resources" className="bg-surface-container-lowest rounded-2xl ghost-border p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm text-on-surface-variant">Total Resources</span>
          </div>
          <div className="text-4xl font-display font-bold text-on-surface mb-2">
            {stats?.resources.total.toLocaleString() || 0}
          </div>
          <div className="flex items-center gap-2 text-sm text-secondary">
            <TrendingUp className="h-4 w-4" />
            <span>{stats?.resources.published} published</span>
          </div>
        </Link>

        {/* Active FAQs */}
        <Link href="/admin/faqs" className="bg-surface-container-lowest rounded-2xl ghost-border p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                <HelpCircle className="h-5 w-5 text-secondary" />
              </div>
              <span className="text-sm text-on-surface-variant">Active FAQs</span>
            </div>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-secondary-container text-secondary">
              ACTIVE
            </span>
          </div>
          <div className="text-4xl font-display font-bold text-on-surface mb-2">
            {stats?.faqs.published || 0}
          </div>
          <div className="text-sm text-on-surface-variant">
            {stats?.faqs.total || 0} total FAQs
          </div>
        </Link>

        {/* Uptime / Platform Status */}
        <div className="bg-surface-container-lowest rounded-2xl ghost-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm text-on-surface-variant">Platform Status</span>
          </div>
          <div className="text-4xl font-display font-bold text-on-surface mb-2">
            Operational
          </div>
          <div className="text-sm text-secondary">
            All systems running
          </div>
        </div>
      </div>

      {/* Pending Questions + Trending Articles Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Pending Questions */}
        <div className="bg-surface-container-lowest rounded-2xl ghost-border p-6">
          <div className="flex items-center justify-between mb-1">
            <div className="text-5xl font-display font-bold text-on-surface">
              {stats?.questions.pending || 0}
            </div>
          </div>
          <div className="text-sm font-medium text-on-surface-variant uppercase tracking-wider mb-4">
            Pending Questions
          </div>
          <Link href="/admin/questions">
            <Button variant="outline" size="sm">
              Review Now
            </Button>
          </Link>
        </div>

        {/* Trending Articles */}
        <div className="bg-surface-container-lowest rounded-2xl ghost-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-secondary" />
            <h2 className="text-lg font-display font-semibold text-on-surface">Trending Articles</h2>
          </div>

          {trendingResources.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No trending articles yet</p>
          ) : (
            <div className="space-y-3">
              {trendingResources.map((resource) => (
                <div key={resource.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-sm text-on-surface">{resource.title}</span>
                  </div>
                  <span className="text-sm text-on-surface-variant">
                    {resource.view_count.toLocaleString()} views
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-surface-container-lowest rounded-2xl ghost-border p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-display font-semibold text-on-surface">Recent Activity</h2>
          <Link
            href="/admin/resources"
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
          >
            View All Logs
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {recentItems.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant">
            <BookOpen className="h-10 w-10 mx-auto text-on-surface-variant/40 mb-2" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-3 ghost-border border-t-0 border-l-0 border-r-0 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
                    <Activity className="h-4 w-4 text-on-surface-variant" />
                  </div>
                  <div>
                    <p className="text-sm text-on-surface">{item.title}</p>
                    <p className="text-xs text-on-surface-variant">
                      {new Date(item.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-surface-container text-on-surface-variant capitalize">
                  {item.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-primary rounded-2xl p-6 text-white">
        <h2 className="text-lg font-display font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/resources/new">
            <Button variant="secondary" className="bg-white text-primary hover:bg-white/90">
              <BookOpen className="h-4 w-4 mr-2" />
              Add Resource
            </Button>
          </Link>
          <Link href="/admin/faqs/new">
            <Button variant="secondary" className="bg-white text-primary hover:bg-white/90">
              <HelpCircle className="h-4 w-4 mr-2" />
              Add FAQ
            </Button>
          </Link>
          <Link href="/admin/categories/new">
            <Button variant="secondary" className="bg-white text-primary hover:bg-white/90">
              <FolderOpen className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

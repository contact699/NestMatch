'use client'

import { useEffect, useState } from 'react'
import { clientLogger } from '@/lib/client-logger'
import {
  Eye,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  BookOpen,
  HelpCircle,
  Loader2,
  Users,
  CheckCircle,
  BarChart3,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface AnalyticsData {
  resources: {
    totalViews: number
    totalHelpful: number
    topResources: Array<{
      id: string
      title: string
      view_count: number
      helpful_count: number
    }>
    byType: Record<string, number>
  }
  faqs: {
    totalHelpful: number
    totalNotHelpful: number
    helpfulRate: number
    topFaqs: Array<{
      id: string
      question: string
      helpful_count: number
      not_helpful_count: number
    }>
  }
  totalUsers: number
}

type TimePeriod = '30' | '90' | 'all'

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30')

  useEffect(() => {
    fetchAnalytics()
  }, [timePeriod])

  const fetchAnalytics = async () => {
    setIsLoading(true)
    const supabase = createClient()

    try {
      // Fetch resources
      let resourcesQuery = supabase
        .from('resources')
        .select('id, title, view_count, helpful_count, resource_type, created_at')
        .eq('is_published', true)

      if (timePeriod !== 'all') {
        const daysAgo = new Date()
        daysAgo.setDate(daysAgo.getDate() - parseInt(timePeriod))
        resourcesQuery = resourcesQuery.gte('created_at', daysAgo.toISOString())
      }

      const { data: resources } = await resourcesQuery

      // Build resource type breakdown
      const byType: Record<string, number> = {}
      ;(resources || []).forEach((r: any) => {
        const type = r.resource_type || 'other'
        byType[type] = (byType[type] || 0) + 1
      })

      const resourceStats = {
        totalViews: resources?.reduce((sum: number, r: any) => sum + (r.view_count || 0), 0) || 0,
        totalHelpful: resources?.reduce((sum: number, r: any) => sum + (r.helpful_count || 0), 0) || 0,
        topResources: (resources || [])
          .sort((a: any, b: any) => (b.view_count || 0) - (a.view_count || 0))
          .slice(0, 5)
          .map((r: any) => ({
            id: r.id,
            title: r.title,
            view_count: r.view_count || 0,
            helpful_count: r.helpful_count || 0,
          })),
        byType,
      }

      // Fetch FAQs
      let faqsQuery = supabase
        .from('faqs')
        .select('id, question, helpful_count, not_helpful_count, created_at')
        .eq('is_published', true)

      if (timePeriod !== 'all') {
        const daysAgo = new Date()
        daysAgo.setDate(daysAgo.getDate() - parseInt(timePeriod))
        faqsQuery = faqsQuery.gte('created_at', daysAgo.toISOString())
      }

      const { data: faqs } = await faqsQuery

      const totalHelpful = faqs?.reduce((sum: number, f: any) => sum + (f.helpful_count || 0), 0) || 0
      const totalNotHelpful = faqs?.reduce((sum: number, f: any) => sum + (f.not_helpful_count || 0), 0) || 0
      const totalVotes = totalHelpful + totalNotHelpful

      const faqStats = {
        totalHelpful,
        totalNotHelpful,
        helpfulRate: totalVotes > 0 ? (totalHelpful / totalVotes) * 100 : 0,
        topFaqs: (faqs || [])
          .sort((a: any, b: any) => (b.helpful_count || 0) - (a.helpful_count || 0))
          .slice(0, 5)
          .map((f: any) => ({
            id: f.id,
            question: f.question,
            helpful_count: f.helpful_count || 0,
            not_helpful_count: f.not_helpful_count || 0,
          })),
      }

      // Fetch total user count
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      setData({
        resources: resourceStats,
        faqs: faqStats,
        totalUsers: totalUsers || 0,
      })
    } catch (error) {
      clientLogger.error('Error fetching analytics', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const totalResourceTypes = Object.values(data?.resources.byType || {}).reduce((a, b) => a + b, 0) || 1

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-medium text-secondary uppercase tracking-widest mb-1">
            System Analytics
          </p>
          <h1 className="text-3xl font-display font-bold text-on-surface">Performance Overview</h1>
        </div>
        <div className="flex items-center gap-1 bg-surface-container-lowest rounded-xl ghost-border p-1">
          {(['30', '90', 'all'] as TimePeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                timePeriod === period
                  ? 'bg-primary text-white'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {period === '30' ? 'Last 30 Days' : period === '90' ? 'Quarterly' : 'Yearly'}
            </button>
          ))}
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Users */}
        <div className="bg-surface-container-lowest rounded-2xl ghost-border p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">Registered Users</p>
              <p className="text-3xl font-display font-bold text-on-surface">
                {data?.totalUsers.toLocaleString() || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Content Engagement */}
        <div className="bg-surface-container-lowest rounded-2xl ghost-border p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">FAQ Helpful Rate</p>
              <p className="text-3xl font-display font-bold text-on-surface">
                {data?.faqs.helpfulRate ? `${data.faqs.helpfulRate.toFixed(1)}%` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Content Health Score */}
        <div className="bg-secondary-container rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-on-surface-variant">Content Health Score</p>
            <BarChart3 className="h-5 w-5 text-secondary" />
          </div>
          <p className="text-3xl font-display font-bold text-on-surface mb-1">
            {data?.faqs.helpfulRate && data.faqs.helpfulRate > 80
              ? 'Excellent'
              : data?.faqs.helpfulRate && data.faqs.helpfulRate > 50
                ? 'Good'
                : data?.faqs.helpfulRate
                  ? 'Needs Attention'
                  : 'N/A'}
          </p>
          <p className="text-sm text-on-surface-variant">
            {data?.resources.totalViews
              ? `${data.resources.totalViews.toLocaleString()} total content views`
              : 'No engagement data yet'}
          </p>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Views */}
        <div className="bg-surface-container-lowest rounded-2xl ghost-border p-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">Total Views</p>
              <p className="text-2xl font-display font-bold text-on-surface">
                {data?.resources.totalViews.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Helpful Votes */}
        <div className="bg-surface-container-lowest rounded-2xl ghost-border p-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
              <ThumbsUp className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">Helpful Votes</p>
              <p className="text-2xl font-display font-bold text-on-surface">
                {((data?.resources.totalHelpful || 0) + (data?.faqs.totalHelpful || 0)).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Helpful Rate */}
        <div className="bg-surface-container-lowest rounded-2xl ghost-border p-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">Engagement Rate</p>
              <p className="text-2xl font-display font-bold text-on-surface">
                {data?.faqs.helpfulRate ? `${data.faqs.helpfulRate.toFixed(1)}%` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Not Helpful */}
        <div className="bg-surface-container-lowest rounded-2xl ghost-border p-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center">
              <ThumbsDown className="h-5 w-5 text-error" />
            </div>
            <div>
              <p className="text-sm text-on-surface-variant">Not Helpful</p>
              <p className="text-2xl font-display font-bold text-on-surface">
                {data?.faqs.totalNotHelpful.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Resources */}
        <div className="bg-surface-container-lowest rounded-2xl ghost-border p-6">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-display font-semibold text-on-surface">Top Resources</h2>
          </div>

          {data?.resources.topResources.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant">
              <BookOpen className="h-10 w-10 mx-auto text-on-surface-variant/40 mb-2" />
              <p>No resources data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data?.resources.topResources.map((resource, index) => (
                <div
                  key={resource.id}
                  className="flex items-center gap-4 p-3 rounded-xl ghost-border hover:bg-surface-container-low transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-on-surface truncate">
                      {resource.title}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {resource.view_count.toLocaleString()} views
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        {resource.helpful_count} helpful
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top FAQs */}
        <div className="bg-surface-container-lowest rounded-2xl ghost-border p-6">
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="h-5 w-5 text-secondary" />
            <h2 className="text-lg font-display font-semibold text-on-surface">Top FAQs</h2>
          </div>

          {data?.faqs.topFaqs.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant">
              <HelpCircle className="h-10 w-10 mx-auto text-on-surface-variant/40 mb-2" />
              <p>No FAQ data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data?.faqs.topFaqs.map((faq, index) => (
                <div
                  key={faq.id}
                  className="flex items-center gap-4 p-3 rounded-xl ghost-border hover:bg-surface-container-low transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-sm font-medium text-secondary">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-on-surface line-clamp-2">
                      {faq.question}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-on-surface-variant">
                      <span className="flex items-center gap-1 text-secondary">
                        <ThumbsUp className="h-3 w-3" />
                        {faq.helpful_count} helpful
                      </span>
                      <span className="flex items-center gap-1 text-error">
                        <ThumbsDown className="h-3 w-3" />
                        {faq.not_helpful_count} not helpful
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Popular Listing Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest rounded-2xl ghost-border p-6">
          <h2 className="text-lg font-display font-semibold text-on-surface mb-6">Popular Content Types</h2>
          {Object.keys(data?.resources.byType || {}).length === 0 ? (
            <p className="text-sm text-on-surface-variant">No content type data available</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(data?.resources.byType || {})
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-on-surface capitalize">{type}s</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 rounded-full bg-surface-container overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(count / totalResourceTypes) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-on-surface-variant w-8 text-right">
                        {Math.round((count / totalResourceTypes) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Verification Metrics (honest version) */}
        <div className="bg-surface-container-lowest rounded-2xl ghost-border p-6">
          <h2 className="text-lg font-display font-semibold text-on-surface mb-2">Verification Metrics</h2>
          <p className="text-sm text-on-surface-variant mb-6">
            User verification metrics based on platform data.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-low rounded-xl p-4 text-center">
              <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">
                Total Users
              </p>
              <p className="text-2xl font-display font-bold text-on-surface">
                {data?.totalUsers || 'N/A'}
              </p>
            </div>
            <div className="bg-surface-container-low rounded-xl p-4 text-center">
              <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">
                Content Items
              </p>
              <p className="text-2xl font-display font-bold text-on-surface">
                {((data?.resources.topResources.length ? data.resources.totalViews : 0) > 0)
                  ? data?.resources.topResources.length
                  : 'N/A'}
              </p>
            </div>
            <div className="bg-surface-container-low rounded-xl p-4 text-center">
              <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">
                Helpful Rate
              </p>
              <p className="text-2xl font-display font-bold text-on-surface">
                {data?.faqs.helpfulRate ? `${data.faqs.helpfulRate.toFixed(0)}%` : 'N/A'}
              </p>
            </div>
            <div className="bg-surface-container-low rounded-xl p-4 text-center">
              <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">
                Total Feedback
              </p>
              <p className="text-2xl font-display font-bold text-on-surface">
                {(data?.faqs.totalHelpful || 0) + (data?.faqs.totalNotHelpful || 0) > 0
                  ? ((data?.faqs.totalHelpful || 0) + (data?.faqs.totalNotHelpful || 0)).toLocaleString()
                  : 'N/A'}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-secondary" />
            <span className="text-sm text-secondary">
              Platform status: Operational
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

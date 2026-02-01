'use client'

import { useEffect, useState } from 'react'
import {
  Eye,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  BookOpen,
  HelpCircle,
  Loader2,
  Calendar,
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
}

type DateRange = '7' | '30' | '90' | 'all'

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>('30')

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    setIsLoading(true)
    const supabase = createClient()

    try {
      // Fetch resources
      let resourcesQuery = (supabase as any)
        .from('resources')
        .select('id, title, view_count, helpful_count, created_at')
        .eq('is_published', true)

      if (dateRange !== 'all') {
        const daysAgo = new Date()
        daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange))
        resourcesQuery = resourcesQuery.gte('created_at', daysAgo.toISOString())
      }

      const { data: resources } = await resourcesQuery

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
      }

      // Fetch FAQs
      let faqsQuery = (supabase as any)
        .from('faqs')
        .select('id, question, helpful_count, not_helpful_count, created_at')
        .eq('is_published', true)

      if (dateRange !== 'all') {
        const daysAgo = new Date()
        daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange))
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

      setData({
        resources: resourceStats,
        faqs: faqStats,
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getDateRangeLabel = (range: DateRange) => {
    switch (range) {
      case '7':
        return 'Last 7 days'
      case '30':
        return 'Last 30 days'
      case '90':
        return 'Last 90 days'
      case 'all':
        return 'All time'
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Knowledge base engagement metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-400" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Views */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Eye className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Views</p>
              <p className="text-2xl font-bold text-gray-900">
                {data?.resources.totalViews.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Helpful Votes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <ThumbsUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Helpful Votes</p>
              <p className="text-2xl font-bold text-gray-900">
                {((data?.resources.totalHelpful || 0) + (data?.faqs.totalHelpful || 0)).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Helpful Rate */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">FAQ Helpful Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {data?.faqs.helpfulRate.toFixed(1) || 0}%
              </p>
            </div>
          </div>
        </div>

        {/* Not Helpful */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
              <ThumbsDown className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Not Helpful</p>
              <p className="text-2xl font-bold text-gray-900">
                {data?.faqs.totalNotHelpful.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Resources */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Top Resources</h2>
          </div>

          {data?.resources.topResources.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="h-10 w-10 mx-auto text-gray-300 mb-2" />
              <p>No resources data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data?.resources.topResources.map((resource, index) => (
                <div
                  key={resource.id}
                  className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {resource.title}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
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
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Top FAQs</h2>
          </div>

          {data?.faqs.topFaqs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <HelpCircle className="h-10 w-10 mx-auto text-gray-300 mb-2" />
              <p>No FAQ data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data?.faqs.topFaqs.map((faq, index) => (
                <div
                  key={faq.id}
                  className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-medium text-green-700">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">
                      {faq.question}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1 text-green-600">
                        <ThumbsUp className="h-3 w-3" />
                        {faq.helpful_count} helpful
                      </span>
                      <span className="flex items-center gap-1 text-red-500">
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
    </div>
  )
}

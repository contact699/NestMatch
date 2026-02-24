'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  FolderOpen,
  MessageCircle,
  Settings,
  Loader2,
  ShieldAlert,
  ChevronLeft,
  BarChart3,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/resources', label: 'Resources', icon: BookOpen },
  { href: '/admin/faqs', label: 'FAQs', icon: HelpCircle },
  { href: '/admin/categories', label: 'Categories', icon: FolderOpen },
  { href: '/admin/questions', label: 'Questions', icon: MessageCircle },
  { href: '/admin/clauses', label: 'Agreement Clauses', icon: Settings },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentPath, setCurrentPath] = useState('')

  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/sign-in')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', user.id)
        .single()

      if (!profile?.is_admin) {
        setIsAdmin(false)
        setIsLoading(false)
        return
      }

      setIsAdmin(true)
      setIsLoading(false)
    }

    checkAdmin()
  }, [router])

  useEffect(() => {
    setCurrentPath(window.location.pathname)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <ShieldAlert className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access the admin panel.
          </p>
          <Link href="/">
            <Button>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen fixed left-0 top-0 pt-16">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-blue-600" />
              Admin Panel
            </h2>
          </div>
          <nav className="p-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPath === item.href ||
                (item.href !== '/admin' && currentPath.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setCurrentPath(item.href)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
            <Link
              href="/resources"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Resources
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-64 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

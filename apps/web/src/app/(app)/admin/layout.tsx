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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <ShieldAlert className="h-16 w-16 mx-auto text-error mb-4" />
          <h1 className="text-2xl font-display font-bold text-on-surface mb-2">Access Denied</h1>
          <p className="text-on-surface-variant mb-6">
            You don&apos;t have permission to access the admin panel.
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
    <div className="min-h-screen bg-surface-container-low">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-surface-container-lowest ghost-border min-h-screen fixed left-0 top-0 pt-16">
          <div className="p-4 ghost-border border-t-0 border-l-0 border-r-0">
            <h2 className="font-display font-semibold text-on-surface flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
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
                      ? 'bg-primary/10 text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 p-4 ghost-border border-b-0 border-l-0 border-r-0">
            <Link
              href="/resources"
              className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface"
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

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { clientLogger } from '@/lib/client-logger'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Search,
  Home,
  MessageSquare,
  BookOpen,
  User,
  Users,
  Menu,
  X,
  LogOut,
  Settings,
  Star,
  Receipt,
  Calendar,
  Bell,
  LayoutDashboard,
  Bookmark,
  ShieldCheck,
  Plus,
  HelpCircle,
  LucideIcon,
} from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface NavbarProps {
  user: SupabaseUser | null
}

// Top navbar links (simplified — sidebar handles main nav)
const topNavLinks = [
  { href: '/search', label: 'Discover', icon: Search },
  { href: '/my-listings', label: 'Listings', icon: Home },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/resources', label: 'Resources', icon: BookOpen },
]

// Mobile sidebar nav items (mirror sidebar)
const mobileNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/search', label: 'Discover', icon: Search },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/my-listings', label: 'My Listings', icon: Home },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/verify', label: 'Trust Center', icon: ShieldCheck },
]

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isScrolled, setIsScrolled] = useState(false)

  // Handle scroll for glassmorphism effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Fetch unread message count
  useEffect(() => {
    if (!user) return

    async function fetchUnreadCount() {
      try {
        const response = await fetch('/api/conversations')
        if (response.ok) {
          const data = await response.json()
          const total = data.conversations?.reduce(
            (sum: number, c: any) => sum + (c.unread_count || 0),
            0
          ) || 0
          setUnreadCount(total)
        }
      } catch (error) {
        clientLogger.error('Error fetching unread count', error)
      }
    }

    fetchUnreadCount()

    // Set up real-time subscription for new messages
    const supabase = createClient()
    const channel = supabase
      .channel('navbar-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchUnreadCount()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  return (
    <nav
      className={cn(
        'sticky top-0 z-50 h-16 transition-all duration-300',
        isScrolled
          ? 'glass-nav border-b border-outline-variant/15 shadow-sm'
          : 'bg-surface-container-lowest border-b border-outline-variant/15'
      )}
    >
      <div className="h-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-full">
          {/* Logo */}
          <div className="flex items-center">
            <Link href={user ? '/dashboard' : '/'} className="flex items-center group">
              <span className="font-display text-primary font-bold text-xl transition-transform duration-300 group-hover:scale-105">
                NestMatch
              </span>
            </Link>
          </div>

          {/* Desktop Center Navigation (4 high-level links) */}
          {user && (
            <div className="hidden md:flex items-center space-x-1">
              {topNavLinks.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(href + '/')
                const showBadge = href === '/messages' && unreadCount > 0

                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative',
                      isActive
                        ? 'text-primary font-semibold'
                        : 'text-on-surface-variant hover:text-on-surface'
                    )}
                  >
                    <div className="relative">
                      <Icon className="h-4 w-4 transition-transform duration-300" />
                      {showBadge && (
                        <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center w-4 h-4 bg-error text-on-error text-[10px] font-bold rounded-full animate-bounce-subtle">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                    {label}
                    {/* Active underline indicator */}
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
                    )}
                  </Link>
                )
              })}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* Notification Bell */}
                <button
                  className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-all duration-300"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-error rounded-full border-2 border-surface-container-lowest" />
                  )}
                </button>

                {/* Profile / Avatar */}
                <div className="relative">
                  <button
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-container-low transition-all duration-300"
                  >
                    <div className="w-8 h-8 bg-primary-fixed rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-105">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  </button>

                  {profileMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setProfileMenuOpen(false)}
                        aria-hidden="true"
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-surface-container-lowest rounded-lg shadow-lg border border-outline-variant/15 py-1 z-50 animate-scale-in origin-top-right">
                        <Link
                          href="/profile"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <User className="h-4 w-4" />
                          Profile
                        </Link>
                        <Link
                          href="/reviews"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <Star className="h-4 w-4" />
                          Reviews
                        </Link>
                        <Link
                          href="/expenses"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <Receipt className="h-4 w-4" />
                          Expenses
                        </Link>
                        <Link
                          href="/groups"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <Users className="h-4 w-4" />
                          Co-Renter Groups
                        </Link>
                        <Link
                          href="/resources"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <BookOpen className="h-4 w-4" />
                          Resources
                        </Link>
                        <Link
                          href="/calendar"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <Calendar className="h-4 w-4" />
                          Calendar
                        </Link>
                        <Link
                          href="/settings"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors"
                          onClick={() => setProfileMenuOpen(false)}
                        >
                          <Settings className="h-4 w-4" />
                          Settings
                        </Link>
                        <hr className="my-1 border-outline-variant/15" />
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-error hover:bg-surface-container-low w-full transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Mobile sign in button - visible in header */}
                <Link href="/login" className="sm:hidden">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <User className="h-4 w-4" />
                    Sign in
                  </Button>
                </Link>
                {/* Desktop sign in buttons */}
                <Link href="/login" className="hidden sm:block">
                  <Button variant="ghost" size="sm">
                    Sign in
                  </Button>
                </Link>
                <Link href="/signup" className="hidden sm:block">
                  <Button variant="glow" size="sm">Get started</Button>
                </Link>
              </>
            )}

            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-surface-container-low transition-all duration-300"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <div className="relative w-5 h-5">
                <X
                  className={cn(
                    'h-5 w-5 absolute inset-0 transition-all duration-300',
                    mobileMenuOpen ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90'
                  )}
                />
                <Menu
                  className={cn(
                    'h-5 w-5 absolute inset-0 transition-all duration-300',
                    mobileMenuOpen ? 'opacity-0 -rotate-90' : 'opacity-100 rotate-0'
                  )}
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Overlay */}
      <div
        className={cn(
          'lg:hidden border-t border-outline-variant/15 bg-surface-container-lowest overflow-hidden transition-all duration-300 ease-out',
          mobileMenuOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-2 py-3 space-y-1">
          {user ? (
            <>
              {mobileNavItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(href + '/')
                const showBadge = href === '/messages' && unreadCount > 0

                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-surface-container-low text-secondary'
                        : 'text-on-surface-variant hover:bg-surface-container-low'
                    )}
                    onClick={closeMobileMenu}
                  >
                    <div className="relative">
                      <Icon className="h-5 w-5" />
                      {showBadge && (
                        <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center w-4 h-4 bg-error text-on-error text-[10px] font-bold rounded-full">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                    {label}
                    {showBadge && (
                      <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 bg-error text-on-error text-xs font-bold rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                )
              })}

              <hr className="my-2 border-outline-variant/15" />

              {/* Post a Listing */}
              <Link
                href="/listings/new"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
                onClick={closeMobileMenu}
              >
                <Plus className="h-5 w-5" />
                Post a Listing
              </Link>

              {/* Settings */}
              <Link
                href="/settings"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
                onClick={closeMobileMenu}
              >
                <Settings className="h-5 w-5" />
                Settings
              </Link>

              {/* Help */}
              <Link
                href="/help"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
                onClick={closeMobileMenu}
              >
                <HelpCircle className="h-5 w-5" />
                Help & Support
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="flex items-center gap-3 px-3 py-3 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
                onClick={closeMobileMenu}
              >
                <User className="h-5 w-5" />
                <span className="font-medium">Sign in</span>
              </Link>
              <Link
                href="/signup"
                className="flex items-center gap-3 px-3 py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-lg transition-colors"
                onClick={closeMobileMenu}
              >
                <Users className="h-5 w-5" />
                <span className="font-medium">Get started</span>
              </Link>
              <hr className="my-2 border-outline-variant/15" />
              <Link
                href="/search"
                className="flex items-center gap-3 px-3 py-3 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
                onClick={closeMobileMenu}
              >
                <Search className="h-5 w-5" />
                <span className="font-medium">Browse listings</span>
              </Link>
              <Link
                href="/resources"
                className="flex items-center gap-3 px-3 py-3 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
                onClick={closeMobileMenu}
              >
                <BookOpen className="h-5 w-5" />
                <span className="font-medium">Resources</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

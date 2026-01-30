'use client'

import { useState, useEffect, memo, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Home,
  Search,
  PlusCircle,
  MessageCircle,
  User,
  Users,
  Menu,
  X,
  LogOut,
  Settings,
  Heart,
  Star,
  Receipt,
  LucideIcon,
} from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface NavLinkProps {
  href: string
  label: string
  icon: LucideIcon
  isActive: boolean
  onClick?: () => void
  mobile?: boolean
  badge?: number
}

const NavLink = memo(function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  onClick,
  mobile,
  badge,
}: NavLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center rounded-lg text-sm font-medium transition-all duration-300 relative',
        mobile ? 'gap-3 px-3 py-2' : 'gap-2 px-3 py-2',
        isActive
          ? 'bg-blue-50 text-blue-600'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )}
      onClick={onClick}
    >
      <div className="relative">
        <Icon className={cn(mobile ? 'h-5 w-5' : 'h-4 w-4', 'transition-transform duration-300')} />
        {badge && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full animate-bounce-subtle">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      {label}
      {badge && badge > 0 && mobile && (
        <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
})

interface NavbarProps {
  user: SupabaseUser | null
}

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
        console.error('Error fetching unread count:', error)
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

  const navLinks = user
    ? [
        { href: '/dashboard', label: 'Home', icon: Home },
        { href: '/search', label: 'Search', icon: Search },
        { href: '/roommates', label: 'Roommates', icon: Users },
        { href: '/listings/new', label: 'Post', icon: PlusCircle },
        { href: '/my-listings', label: 'Listings', icon: Home },
        { href: '/messages', label: 'Messages', icon: MessageCircle, badge: unreadCount },
        { href: '/saved', label: 'Saved', icon: Heart },
      ]
    : []

  return (
    <nav
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white/80 backdrop-blur-lg border-b border-gray-200/50 shadow-sm'
          : 'bg-white border-b border-gray-200'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href={user ? '/dashboard' : '/'} className="flex items-center group">
              <span className="text-2xl font-bold text-blue-600 transition-transform duration-300 group-hover:scale-105">
                NestMatch
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map(({ href, label, icon, badge }) => (
              <NavLink
                key={href}
                href={href}
                label={label}
                icon={icon}
                isActive={pathname === href}
                badge={badge}
              />
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-all duration-300"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-105">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                </button>

                {profileMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setProfileMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 animate-scale-in origin-top-right">
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        <User className="h-4 w-4" />
                        Profile
                      </Link>
                      <Link
                        href="/reviews"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        <Star className="h-4 w-4" />
                        Reviews
                      </Link>
                      <Link
                        href="/expenses"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        <Receipt className="h-4 w-4" />
                        Expenses
                      </Link>
                      <Link
                        href="/groups"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        <Users className="h-4 w-4" />
                        Co-Renter Groups
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                      <hr className="my-1" />
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button variant="glow" size="sm">Get started</Button>
                </Link>
              </>
            )}

            {/* Mobile menu button */}
            {user && (
              <button
                className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-all duration-300"
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
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div
        className={cn(
          'md:hidden border-t border-gray-200 bg-white overflow-hidden transition-all duration-300 ease-out',
          mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        {user && (
          <div className="px-2 py-3 space-y-1">
            {navLinks.map(({ href, label, icon, badge }) => (
              <NavLink
                key={href}
                href={href}
                label={label}
                icon={icon}
                isActive={pathname === href}
                onClick={closeMobileMenu}
                mobile
                badge={badge}
              />
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}

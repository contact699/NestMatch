'use client'

import { LogoMark } from '@/components/ui/logo-mark'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Search,
  MessageSquare,
  Home,
  Bookmark,
  ShieldCheck,
  Plus,
  Settings,
  HelpCircle,
  Users,
  UsersRound,
} from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/search', label: 'Search listings', icon: Search },
  { href: '/roommates', label: 'Find Roommates', icon: Users },
  { href: '/groups', label: 'Co-Renter Groups', icon: UsersRound },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/my-listings', label: 'My Listings', icon: Home },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/verify', label: 'Trust Center', icon: ShieldCheck },
]

interface SidebarProps {
  user: SupabaseUser | null
  unreadCount?: number
}

export function Sidebar({ user, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname()

  if (!user) return null

  return (
    <aside className="hidden lg:flex fixed top-16 left-0 w-64 h-[calc(100vh-4rem)] bg-surface-container-lowest flex-col z-40 border-r border-outline-variant/15">
      {/* Logo / Brand section */}
      <div className="px-6 py-6">
        <div className="flex items-center gap-2.5 mb-1">
          <LogoMark size={28} />
          <h2 className="font-logo text-lg font-semibold text-primary tracking-[-0.02em] leading-none">NestMatch</h2>
        </div>
        <p className="text-xs text-on-surface-variant">Premium Housing Concierge</p>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          const showBadge = href === '/messages' && unreadCount > 0

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-surface-container-low text-secondary'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center w-4 h-4 bg-error text-on-error text-[10px] font-bold rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span>{label}</span>
              {showBadge && (
                <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 bg-error text-on-error text-xs font-bold rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-6 mt-auto space-y-2">
        {/* Post a Listing button */}
        <Link href="/listings/new" className="block px-1">
          <Button variant="primary" className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Post a Listing
          </Button>
        </Link>

        {/* Settings link */}
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
            pathname === '/settings'
              ? 'bg-surface-container-low text-secondary'
              : 'text-on-surface-variant hover:bg-surface-container-low'
          )}
        >
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </Link>

        {/* Help & Support link */}
        <Link
          href="/help"
          className={cn(
            'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
            pathname === '/help'
              ? 'bg-surface-container-low text-secondary'
              : 'text-on-surface-variant hover:bg-surface-container-low'
          )}
        >
          <HelpCircle className="h-5 w-5" />
          <span>Help & Support</span>
        </Link>
      </div>
    </aside>
  )
}

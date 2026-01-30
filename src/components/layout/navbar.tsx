'use client'

import { useState, memo, useCallback } from 'react'
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
}

const NavLink = memo(function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  onClick,
  mobile,
}: NavLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center rounded-lg text-sm font-medium transition-colors',
        mobile ? 'gap-3 px-3 py-2' : 'gap-2 px-3 py-2',
        isActive
          ? 'bg-blue-50 text-blue-600'
          : 'text-gray-600 hover:bg-gray-100'
      )}
      onClick={onClick}
    >
      <Icon className={mobile ? 'h-5 w-5' : 'h-4 w-4'} />
      {label}
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
        { href: '/listings/new', label: 'Post', icon: PlusCircle },
        { href: '/my-listings', label: 'Listings', icon: Home },
        { href: '/messages', label: 'Messages', icon: MessageCircle },
        { href: '/saved', label: 'Saved', icon: Heart },
      ]
    : []

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href={user ? '/dashboard' : '/'} className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">NestMatch</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map(({ href, label, icon }) => (
              <NavLink
                key={href}
                href={href}
                label={label}
                icon={icon}
                isActive={pathname === href}
              />
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                </button>

                {profileMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setProfileMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        <User className="h-4 w-4" />
                        Profile
                      </Link>
                      <Link
                        href="/reviews"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        <Star className="h-4 w-4" />
                        Reviews
                      </Link>
                      <Link
                        href="/expenses"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        <Receipt className="h-4 w-4" />
                        Expenses
                      </Link>
                      <Link
                        href="/groups"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        <Users className="h-4 w-4" />
                        Co-Renter Groups
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                      <hr className="my-1" />
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full"
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
                  <Button size="sm">Get started</Button>
                </Link>
              </>
            )}

            {/* Mobile menu button */}
            {user && (
              <button
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && user && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-2 py-3 space-y-1">
            {navLinks.map(({ href, label, icon }) => (
              <NavLink
                key={href}
                href={href}
                label={label}
                icon={icon}
                isActive={pathname === href}
                onClick={closeMobileMenu}
                mobile
              />
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}

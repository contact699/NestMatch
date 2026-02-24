'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Scale,
  Users,
  DollarSign,
  Truck,
  Shield,
  BookOpen,
  HelpCircle,
  Wrench,
  FileText,
  Bookmark,
} from 'lucide-react'
import { ResourceCategory } from '@/types/database'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Scale,
  Users,
  DollarSign,
  Truck,
  Shield,
  BookOpen,
  HelpCircle,
  Wrench,
  FileText,
  Bookmark,
}

interface CategoryNavProps {
  categories: ResourceCategory[]
  variant?: 'horizontal' | 'vertical'
}

export function CategoryNav({ categories, variant = 'horizontal' }: CategoryNavProps) {
  const pathname = usePathname()

  const navItems = [
    { href: '/resources', label: 'Overview', icon: BookOpen },
    { href: '/resources/guides', label: 'Guides', icon: FileText },
    { href: '/resources/faq', label: 'FAQ', icon: HelpCircle },
    { href: '/resources/tools', label: 'Tools', icon: Wrench },
    { href: '/resources/agreement', label: 'Agreement', icon: Scale },
    { href: '/resources/bookmarks', label: 'Saved', icon: Bookmark },
  ]

  if (variant === 'vertical') {
    return (
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/resources' && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors
                ${isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
              `}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <nav className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
      {navItems.map((item) => {
        const isActive = pathname === item.href ||
          (item.href !== '/resources' && pathname.startsWith(item.href))
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm rounded-full whitespace-nowrap transition-colors
              ${isActive
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'}
            `}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

interface CategoryChipsProps {
  categories: ResourceCategory[]
  selected: string | null
  onSelect: (categoryId: string | null) => void
}

export function CategoryChips({ categories, selected, onSelect }: CategoryChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={`
          px-3 py-1.5 text-sm rounded-full transition-colors
          ${!selected
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
        `}
      >
        All
      </button>
      {categories.map((category) => {
        const Icon = ICON_MAP[category.icon || 'BookOpen'] || BookOpen
        return (
          <button
            key={category.id}
            onClick={() => onSelect(category.id)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full transition-colors
              ${selected === category.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
            `}
          >
            <Icon className="h-3.5 w-3.5" />
            {category.name}
          </button>
        )
      })}
    </div>
  )
}

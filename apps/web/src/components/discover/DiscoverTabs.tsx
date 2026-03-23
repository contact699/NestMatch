'use client'

import { cn } from '@/lib/utils'
import { Sparkles, Users, UserSearch } from 'lucide-react'

type TabId = 'suggestions' | 'people' | 'groups'

interface Tab {
  id: TabId
  label: string
  icon: typeof Sparkles
  count?: number
}

interface DiscoverTabsProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  counts?: {
    suggestions?: number
    people?: number
    groups?: number
  }
}

export function DiscoverTabs({ activeTab, onTabChange, counts }: DiscoverTabsProps) {
  const tabs: Tab[] = [
    {
      id: 'suggestions',
      label: 'Suggested Groups',
      icon: Sparkles,
      count: counts?.suggestions,
    },
    {
      id: 'people',
      label: 'Compatible People',
      icon: UserSearch,
      count: counts?.people,
    },
    {
      id: 'groups',
      label: 'Public Groups',
      icon: Users,
      count: counts?.groups,
    },
  ]

  return (
    <div className="border-b border-outline-variant/15">
      <nav className="flex -mb-px overflow-x-auto scrollbar-hide">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/30'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4',
                  isActive ? 'text-primary' : 'text-outline'
                )}
              />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full transition-colors',
                    isActive
                      ? 'bg-primary-fixed text-primary'
                      : 'bg-surface-container-low text-on-surface-variant'
                  )}
                >
                  {tab.count > 99 ? '99+' : tab.count}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export type { TabId }

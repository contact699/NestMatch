'use client'

import { cn } from '@/lib/utils'
import { List, Map, Navigation } from 'lucide-react'

export type ViewMode = 'list' | 'map' | 'proximity'

interface Tab {
  id: ViewMode
  label: string
  icon: typeof List
}

interface ViewModeTabsProps {
  activeMode: ViewMode
  onModeChange: (mode: ViewMode) => void
  disabled?: boolean
}

const tabs: Tab[] = [
  { id: 'list', label: 'List', icon: List },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'proximity', label: 'Nearby', icon: Navigation },
]

export function ViewModeTabs({ activeMode, onModeChange, disabled }: ViewModeTabsProps) {
  return (
    <div className="inline-flex items-center bg-surface-container-low rounded-xl p-1">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeMode === tab.id

        return (
          <button
            key={tab.id}
            onClick={() => onModeChange(tab.id)}
            disabled={disabled}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
              isActive
                ? 'bg-surface-container-lowest text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}

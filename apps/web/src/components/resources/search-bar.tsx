'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'Search resources...' }: SearchBarProps) {
  const [focused, setFocused] = useState(false)

  return (
    <div
      className={`
        relative flex items-center bg-surface-container-lowest ghost-border rounded-xl transition-all
        ${focused ? 'ring-2 ring-secondary/30' : ''}
      `}
    >
      <Search className="h-5 w-5 text-on-surface-variant ml-3" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 text-sm bg-transparent outline-none placeholder:text-on-surface-variant text-on-surface"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="p-1.5 mr-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-full transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

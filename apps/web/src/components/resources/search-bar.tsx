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
        relative flex items-center bg-white border rounded-lg transition-all
        ${focused ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}
      `}
    >
      <Search className="h-5 w-5 text-gray-400 ml-3" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 text-sm bg-transparent outline-none placeholder:text-gray-400"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="p-1.5 mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

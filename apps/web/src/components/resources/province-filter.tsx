'use client'

import { MapPin } from 'lucide-react'

const PROVINCES = [
  { code: 'ON', name: 'Ontario' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'QC', name: 'Quebec' },
  { code: 'AB', name: 'Alberta' },
]

interface ProvinceFilterProps {
  selected: string | null
  onChange: (province: string | null) => void
  showAll?: boolean
}

export function ProvinceFilter({ selected, onChange, showAll = true }: ProvinceFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-500 flex items-center gap-1">
        <MapPin className="h-4 w-4" />
        Province:
      </span>
      {showAll && (
        <button
          onClick={() => onChange(null)}
          className={`
            px-3 py-1.5 text-sm rounded-full transition-colors
            ${!selected
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
          `}
        >
          All
        </button>
      )}
      {PROVINCES.map((province) => (
        <button
          key={province.code}
          onClick={() => onChange(province.code)}
          className={`
            px-3 py-1.5 text-sm rounded-full transition-colors
            ${selected === province.code
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
          `}
        >
          {province.name}
        </button>
      ))}
    </div>
  )
}

export function ProvinceBadge({ province }: { province: string }) {
  const name = PROVINCES.find(p => p.code === province)?.name || province
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
      <MapPin className="h-3 w-3" />
      {name}
    </span>
  )
}

export { PROVINCES }

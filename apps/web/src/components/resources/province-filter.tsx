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
      <span className="text-sm text-on-surface-variant flex items-center gap-1">
        <MapPin className="h-4 w-4" />
        Province:
      </span>
      {showAll && (
        <button
          onClick={() => onChange(null)}
          className={`
            px-3 py-1.5 text-sm rounded-full transition-colors
            ${!selected
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}
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
              ? 'bg-primary text-on-primary'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}
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
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-secondary-container text-secondary rounded-full">
      <MapPin className="h-3 w-3" />
      {name}
    </span>
  )
}

export { PROVINCES }

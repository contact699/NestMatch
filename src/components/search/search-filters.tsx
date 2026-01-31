'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { MAJOR_CITIES, CANADIAN_PROVINCES } from '@/lib/utils'
import {
  Search,
  MapPin,
  DollarSign,
  Leaf,
} from 'lucide-react'

export function SearchFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    city: searchParams.get('city') || '',
    province: searchParams.get('province') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    type: searchParams.get('type') || '',
    newcomerFriendly: searchParams.get('newcomerFriendly') === 'true',
    noCreditOk: searchParams.get('noCreditOk') === 'true',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const params = new URLSearchParams()

    // Only add non-empty values to URL
    if (filters.q) params.set('q', filters.q)
    if (filters.city) params.set('city', filters.city)
    if (filters.province) params.set('province', filters.province)
    if (filters.minPrice) params.set('minPrice', filters.minPrice)
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice)
    if (filters.type) params.set('type', filters.type)
    if (filters.newcomerFriendly) params.set('newcomerFriendly', 'true')
    if (filters.noCreditOk) params.set('noCreditOk', 'true')

    const queryString = params.toString()
    const url = queryString ? `/search?${queryString}` : '/search'

    startTransition(() => {
      router.push(url)
    })
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={filters.q}
          onChange={(e) => handleChange('q', e.target.value)}
          placeholder="Search by keyword (optional)..."
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm transition-all"
        />
      </div>

      {/* Filter row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* City */}
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={filters.city}
            onChange={(e) => handleChange('city', e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all hover:border-gray-300"
          >
            <option value="">All Cities</option>
            {MAJOR_CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Province */}
        <select
          value={filters.province}
          onChange={(e) => handleChange('province', e.target.value)}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all hover:border-gray-300"
        >
          <option value="">All Provinces</option>
          {CANADIAN_PROVINCES.map((province) => (
            <option key={province.value} value={province.value}>
              {province.label}
            </option>
          ))}
        </select>

        {/* Min Price */}
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="number"
            value={filters.minPrice}
            onChange={(e) => handleChange('minPrice', e.target.value)}
            placeholder="Min $"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all hover:border-gray-300"
          />
        </div>

        {/* Max Price */}
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="number"
            value={filters.maxPrice}
            onChange={(e) => handleChange('maxPrice', e.target.value)}
            placeholder="Max $"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all hover:border-gray-300"
          />
        </div>

        {/* Room Type */}
        <select
          value={filters.type}
          onChange={(e) => handleChange('type', e.target.value)}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all hover:border-gray-300"
        >
          <option value="">All Types</option>
          <option value="room">Private Room</option>
          <option value="shared_room">Shared Room</option>
          <option value="entire_place">Entire Place</option>
        </select>

        {/* Search Button */}
        <Button type="submit" variant="glow" className="w-full" isLoading={isPending}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2 pt-2">
        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 hover:border-gray-300 cursor-pointer text-sm transition-all">
          <input
            type="checkbox"
            checked={filters.newcomerFriendly}
            onChange={(e) => handleChange('newcomerFriendly', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <Leaf className="h-4 w-4 text-green-600" />
          Newcomer Friendly
        </label>
        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 hover:border-gray-300 cursor-pointer text-sm transition-all">
          <input
            type="checkbox"
            checked={filters.noCreditOk}
            onChange={(e) => handleChange('noCreditOk', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          No Credit History OK
        </label>
      </div>
    </form>
  )
}

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { CITIES_BY_PROVINCE, CANADIAN_PROVINCES, BATHROOM_TYPES } from '@/lib/utils'
import {
  Search,
  MapPin,
  DollarSign,
  Leaf,
  Bath,
  GraduationCap,
  HandHelping,
  PawPrint,
  CigaretteOff,
  Car,
  RotateCcw,
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
    bathroomType: searchParams.get('bathroomType') || '',
    newcomerFriendly: searchParams.get('newcomerFriendly') === 'true',
    noCreditOk: searchParams.get('noCreditOk') === 'true',
    idealForStudents: searchParams.get('idealForStudents') === 'true',
    assistanceRequired: searchParams.get('assistanceRequired') === 'true',
    petsAllowed: searchParams.get('petsAllowed') === 'true',
    noSmoking: searchParams.get('noSmoking') === 'true',
    parkingIncluded: searchParams.get('parkingIncluded') === 'true',
  })

  // Get cities for selected province
  const availableCities = filters.province ? CITIES_BY_PROVINCE[filters.province] || [] : []

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
    if (filters.bathroomType) params.set('bathroomType', filters.bathroomType)
    if (filters.newcomerFriendly) params.set('newcomerFriendly', 'true')
    if (filters.noCreditOk) params.set('noCreditOk', 'true')
    if (filters.idealForStudents) params.set('idealForStudents', 'true')
    if (filters.assistanceRequired) params.set('assistanceRequired', 'true')
    if (filters.petsAllowed) params.set('petsAllowed', 'true')
    if (filters.noSmoking) params.set('noSmoking', 'true')
    if (filters.parkingIncluded) params.set('parkingIncluded', 'true')

    const queryString = params.toString()
    const url = queryString ? `/search?${queryString}` : '/search'

    startTransition(() => {
      router.push(url)
    })
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const handleReset = () => {
    setFilters({
      q: '', city: '', province: '', minPrice: '', maxPrice: '', type: '', bathroomType: '',
      newcomerFriendly: false, noCreditOk: false, idealForStudents: false,
      assistanceRequired: false, petsAllowed: false, noSmoking: false, parkingIncluded: false,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-on-surface-variant" />
        <input
          type="text"
          value={filters.q}
          onChange={(e) => handleChange('q', e.target.value)}
          placeholder="Search by keyword (optional)..."
          className="w-full pl-10 pr-4 py-3 ghost-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent bg-surface-container-lowest backdrop-blur-sm transition-all text-on-surface placeholder:text-on-surface-variant"
        />
      </div>

      {/* Filter row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Province - First for filtering cities */}
        <select
          value={filters.province}
          onChange={(e) => {
            handleChange('province', e.target.value)
            // Reset city when province changes
            if (filters.city && !CITIES_BY_PROVINCE[e.target.value]?.includes(filters.city)) {
              handleChange('city', '')
            }
          }}
          className="w-full px-4 py-2 ghost-border rounded-xl appearance-none bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary text-sm transition-all hover:bg-surface-container-low text-on-surface"
        >
          <option value="">All Provinces</option>
          {CANADIAN_PROVINCES.map((province) => (
            <option key={province.value} value={province.value}>
              {province.label}
            </option>
          ))}
        </select>

        {/* City - Filtered by province */}
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
          <select
            value={filters.city}
            onChange={(e) => handleChange('city', e.target.value)}
            className="w-full pl-9 pr-4 py-2 ghost-border rounded-xl appearance-none bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary text-sm transition-all hover:bg-surface-container-low text-on-surface"
          >
            <option value="">{filters.province ? 'All Cities' : 'Select Province First'}</option>
            {availableCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Min Price */}
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
          <input
            type="number"
            min={0}
            value={filters.minPrice}
            onChange={(e) => handleChange('minPrice', e.target.value)}
            placeholder="Min $"
            className="w-full pl-9 pr-4 py-2 ghost-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary text-sm transition-all hover:bg-surface-container-low bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant"
          />
        </div>

        {/* Max Price */}
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
          <input
            type="number"
            min={0}
            value={filters.maxPrice}
            onChange={(e) => handleChange('maxPrice', e.target.value)}
            placeholder="Max $"
            className="w-full pl-9 pr-4 py-2 ghost-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary text-sm transition-all hover:bg-surface-container-low bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant"
          />
        </div>

        {/* Room Type */}
        <select
          value={filters.type}
          onChange={(e) => handleChange('type', e.target.value)}
          className="w-full px-4 py-2 ghost-border rounded-xl appearance-none bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary text-sm transition-all hover:bg-surface-container-low text-on-surface"
        >
          <option value="">All Types</option>
          <option value="room">Private Room</option>
          <option value="shared_room">Shared Room</option>
          <option value="entire_place">Entire Place</option>
        </select>

        {/* Bathroom Type */}
        <div className="relative">
          <Bath className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
          <select
            value={filters.bathroomType}
            onChange={(e) => handleChange('bathroomType', e.target.value)}
            className="w-full pl-9 pr-4 py-2 ghost-border rounded-xl appearance-none bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary text-sm transition-all hover:bg-surface-container-low text-on-surface"
          >
            <option value="">Any Bathroom</option>
            {BATHROOM_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search Button */}
        <Button type="submit" variant="glow" className="w-full" isLoading={isPending}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2 pt-2">
        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full ghost-border hover:bg-surface-container-low cursor-pointer text-sm transition-all">
          <input
            type="checkbox"
            checked={filters.newcomerFriendly}
            onChange={(e) => handleChange('newcomerFriendly', e.target.checked)}
            className="rounded border-outline/30 text-secondary focus:ring-secondary"
          />
          <Leaf className="h-4 w-4 text-secondary" />
          <span className="text-on-surface-variant">Newcomer Friendly</span>
        </label>
        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full ghost-border hover:bg-surface-container-low cursor-pointer text-sm transition-all">
          <input
            type="checkbox"
            checked={filters.noCreditOk}
            onChange={(e) => handleChange('noCreditOk', e.target.checked)}
            className="rounded border-outline/30 text-secondary focus:ring-secondary"
          />
          <span className="text-on-surface-variant">No Credit History OK</span>
        </label>
        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full ghost-border hover:bg-surface-container-low cursor-pointer text-sm transition-all">
          <input
            type="checkbox"
            checked={filters.idealForStudents}
            onChange={(e) => handleChange('idealForStudents', e.target.checked)}
            className="rounded border-outline/30 text-secondary focus:ring-secondary"
          />
          <GraduationCap className="h-4 w-4 text-primary" />
          <span className="text-on-surface-variant">Ideal for Students</span>
        </label>
        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full ghost-border hover:bg-surface-container-low cursor-pointer text-sm transition-all">
          <input
            type="checkbox"
            checked={filters.assistanceRequired}
            onChange={(e) => handleChange('assistanceRequired', e.target.checked)}
            className="rounded border-outline/30 text-secondary focus:ring-secondary"
          />
          <HandHelping className="h-4 w-4 text-tertiary" />
          <span className="text-on-surface-variant">Assistance Required</span>
        </label>
        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full ghost-border hover:bg-surface-container-low cursor-pointer text-sm transition-all">
          <input
            type="checkbox"
            checked={filters.petsAllowed}
            onChange={(e) => handleChange('petsAllowed', e.target.checked)}
            className="rounded border-outline/30 text-secondary focus:ring-secondary"
          />
          <PawPrint className="h-4 w-4 text-tertiary" />
          <span className="text-on-surface-variant">Pets Allowed</span>
        </label>
        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full ghost-border hover:bg-surface-container-low cursor-pointer text-sm transition-all">
          <input
            type="checkbox"
            checked={filters.noSmoking}
            onChange={(e) => handleChange('noSmoking', e.target.checked)}
            className="rounded border-outline/30 text-secondary focus:ring-secondary"
          />
          <CigaretteOff className="h-4 w-4 text-error" />
          <span className="text-on-surface-variant">No Smoking</span>
        </label>
        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full ghost-border hover:bg-surface-container-low cursor-pointer text-sm transition-all">
          <input
            type="checkbox"
            checked={filters.parkingIncluded}
            onChange={(e) => handleChange('parkingIncluded', e.target.checked)}
            className="rounded border-outline/30 text-secondary focus:ring-secondary"
          />
          <Car className="h-4 w-4 text-primary" />
          <span className="text-on-surface-variant">Parking Included</span>
        </label>

        {/* Reset */}
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>
    </form>
  )
}

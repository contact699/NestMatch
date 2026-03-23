'use client'

import { UseFormRegister, FieldErrors, UseFormWatch } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { CANADIAN_PROVINCES, CITIES_BY_PROVINCE } from '@/lib/utils'
import { ListingFormData } from '../types'
import { MapPin, Building2 } from 'lucide-react'

interface StepLocationProps {
  register: UseFormRegister<ListingFormData>
  errors: FieldErrors<ListingFormData>
  watch: UseFormWatch<ListingFormData>
}

export function StepLocation({ register, errors, watch }: StepLocationProps) {
  const selectedProvince = watch('province')
  const availableCities = selectedProvince ? CITIES_BY_PROVINCE[selectedProvince] || [] : []

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-display font-semibold text-on-surface">
        Where is it located?
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-1">
            City *
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <select
              {...register('city')}
              disabled={!selectedProvince}
              className="w-full pl-9 pr-4 py-2.5 ghost-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary bg-surface-container-lowest text-on-surface disabled:opacity-50"
            >
              <option value="">{selectedProvince ? 'e.g. Toronto' : 'Select province first'}</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
          {errors.city && (
            <p className="mt-1 text-sm text-error">{errors.city.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-1">
            Neighborhood
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <input
              {...register('address')}
              placeholder="e.g. Liberty Village"
              className="w-full pl-9 pr-4 py-2.5 ghost-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-on-surface-variant mb-1">
          Province *
        </label>
        <select
          {...register('province')}
          className="w-full px-3 py-2.5 ghost-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary bg-surface-container-lowest text-on-surface"
        >
          <option value="">Select a province</option>
          {CANADIAN_PROVINCES.map((prov) => (
            <option key={prov.value} value={prov.value}>
              {prov.label}
            </option>
          ))}
        </select>
        {errors.province && (
          <p className="mt-1 text-sm text-error">{errors.province.message}</p>
        )}
      </div>

      <Input
        {...register('postal_code')}
        label="Postal Code (optional)"
        placeholder="M5V 1J2"
        helperText="Used for search radius only, not displayed publicly"
      />

      {/* Professional Tip */}
      <div className="p-4 bg-surface-container-low rounded-2xl flex items-start gap-3">
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-white text-sm font-bold">!</span>
        </div>
        <div>
          <p className="font-semibold text-on-surface text-sm">Professional Tip</p>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Accurate neighborhood tags increase listing visibility by up to 45%. We&apos;ll help you refine this based on the street address in the next step.
          </p>
        </div>
      </div>
    </div>
  )
}

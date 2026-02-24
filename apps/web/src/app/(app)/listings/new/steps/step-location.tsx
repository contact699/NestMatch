'use client'

import { UseFormRegister, FieldErrors, UseFormWatch } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { CANADIAN_PROVINCES, CITIES_BY_PROVINCE } from '@/lib/utils'
import { ListingFormData } from '../types'

interface StepLocationProps {
  register: UseFormRegister<ListingFormData>
  errors: FieldErrors<ListingFormData>
  watch: UseFormWatch<ListingFormData>
}

export function StepLocation({ register, errors, watch }: StepLocationProps) {
  const selectedProvince = watch('province')
  const availableCities = selectedProvince ? CITIES_BY_PROVINCE[selectedProvince] || [] : []

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        Where is the room located?
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Province *
          </label>
          <select
            {...register('province')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a province</option>
            {CANADIAN_PROVINCES.map((prov) => (
              <option key={prov.value} value={prov.value}>
                {prov.label}
              </option>
            ))}
          </select>
          {errors.province && (
            <p className="mt-1 text-sm text-red-600">{errors.province.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City *
          </label>
          <select
            {...register('city')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!selectedProvince}
          >
            <option value="">{selectedProvince ? 'Select a city' : 'Select province first'}</option>
            {availableCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          {errors.city && (
            <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            City not listed? Select the closest city in your province.
          </p>
        </div>
      </div>

      <Input
        {...register('address')}
        label="Street Address (optional)"
        placeholder="123 Main Street"
        helperText="Only shown to confirmed matches"
      />

      <Input
        {...register('postal_code')}
        label="Postal Code (optional)"
        placeholder="M5V 1J2"
        helperText="Used for search radius only, not displayed publicly"
      />
    </div>
  )
}

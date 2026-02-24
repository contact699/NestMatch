'use client'

import { UseFormWatch, UseFormSetValue } from 'react-hook-form'
import { AMENITIES } from '@/lib/utils'
import { ListingFormData } from '../types'

interface StepAmenitiesProps {
  watch: UseFormWatch<ListingFormData>
  setValue: UseFormSetValue<ListingFormData>
}

export function StepAmenities({ watch, setValue }: StepAmenitiesProps) {
  const formData = watch()

  const toggleAmenity = (amenity: string) => {
    const current = formData.amenities || []
    if (current.includes(amenity)) {
      setValue('amenities', current.filter((a) => a !== amenity))
    } else {
      setValue('amenities', [...current, amenity])
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        What amenities are available?
      </h3>
      <p className="text-sm text-gray-500">Select all that apply</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {AMENITIES.map((amenity) => (
          <label
            key={amenity}
            className={`
              flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all
              ${
                formData.amenities?.includes(amenity)
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <input
              type="checkbox"
              checked={formData.amenities?.includes(amenity)}
              onChange={() => toggleAmenity(amenity)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{amenity}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

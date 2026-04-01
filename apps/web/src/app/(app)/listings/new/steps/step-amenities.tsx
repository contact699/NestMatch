'use client'

import { UseFormWatch, UseFormSetValue } from 'react-hook-form'
import { AMENITIES } from '@/lib/utils'
import { ListingFormData } from '../types'
import { Check } from 'lucide-react'

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
    <div className="space-y-6">
      <h3 className="text-lg font-display font-semibold text-on-surface">
        What amenities are available?
      </h3>
      <p className="text-sm text-on-surface-variant">Select all that apply</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {AMENITIES.map((amenity) => {
          const isSelected = formData.amenities?.includes(amenity)
          return (
            <label
              key={amenity}
              className={`
                flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all
                ${
                  isSelected
                    ? 'bg-secondary-container ghost-border ring-2 ring-secondary'
                    : 'ghost-border hover:bg-surface-container-low'
                }
              `}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleAmenity(amenity)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                isSelected ? 'bg-secondary text-white' : 'ghost-border'
              }`}>
                {isSelected && <Check className="h-3 w-3" />}
              </div>
              <span className="text-sm text-on-surface">{amenity}</span>
            </label>
          )
        })}
      </div>

      {formData.amenities && formData.amenities.length > 0 && (
        <p className="text-sm text-on-surface-variant">
          {formData.amenities.length} amenit{formData.amenities.length === 1 ? 'y' : 'ies'} selected
        </p>
      )}
    </div>
  )
}

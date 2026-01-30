'use client'

import { UseFormRegister, UseFormWatch } from 'react-hook-form'
import { Check } from 'lucide-react'
import { ListingFormData } from '../types'

interface StepTypeProps {
  register: UseFormRegister<ListingFormData>
  watch: UseFormWatch<ListingFormData>
}

const TYPE_LABELS = {
  room: { label: 'Private Room', desc: 'A private room in a shared home' },
  shared_room: { label: 'Shared Room', desc: 'A room shared with others' },
  entire_place: { label: 'Entire Place', desc: 'The whole apartment or house' },
}

export function StepType({ register, watch }: StepTypeProps) {
  const formData = watch()

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        What type of space are you listing?
      </h3>
      <div className="grid gap-4">
        {(Object.keys(TYPE_LABELS) as Array<keyof typeof TYPE_LABELS>).map((type) => (
          <label
            key={type}
            className={`
              flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all
              ${
                formData.type === type
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }
            `}
          >
            <input
              type="radio"
              {...register('type')}
              value={type}
              className="sr-only"
            />
            <div className="flex-1">
              <p className="font-medium text-gray-900">{TYPE_LABELS[type].label}</p>
              <p className="text-sm text-gray-500">{TYPE_LABELS[type].desc}</p>
            </div>
            {formData.type === type && <Check className="h-5 w-5 text-blue-600" />}
          </label>
        ))}
      </div>
    </div>
  )
}

export { TYPE_LABELS }

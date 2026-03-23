'use client'

import { UseFormRegister, UseFormWatch } from 'react-hook-form'
import { Check, Building2, Home, Rows3, MoreHorizontal } from 'lucide-react'
import { ListingFormData } from '../types'

interface StepTypeProps {
  register: UseFormRegister<ListingFormData>
  watch: UseFormWatch<ListingFormData>
}

const TYPE_LABELS = {
  room: { label: 'Private Room', desc: 'A private room in a shared home', icon: Building2 },
  shared_room: { label: 'Shared Room', desc: 'A room shared with others', icon: Rows3 },
  entire_place: { label: 'Entire Place', desc: 'The whole apartment or house', icon: Home },
}

export function StepType({ register, watch }: StepTypeProps) {
  const formData = watch()

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-display font-semibold text-on-surface">
        What type of home is it?
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {(Object.keys(TYPE_LABELS) as Array<keyof typeof TYPE_LABELS>).map((type) => {
          const Icon = TYPE_LABELS[type].icon
          const isSelected = formData.type === type
          return (
            <label
              key={type}
              className={`
                flex flex-col items-start p-5 rounded-2xl cursor-pointer transition-all
                ${
                  isSelected
                    ? 'bg-secondary-container ghost-border ring-2 ring-secondary'
                    : 'bg-surface-container-lowest ghost-border hover:bg-surface-container-low'
                }
              `}
            >
              <input
                type="radio"
                {...register('type')}
                value={type}
                className="sr-only"
              />
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                isSelected ? 'bg-secondary text-white' : 'bg-surface-container-low text-on-surface-variant'
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-on-surface">{TYPE_LABELS[type].label}</p>
                {isSelected && <Check className="h-4 w-4 text-secondary" />}
              </div>
              <p className="text-sm text-on-surface-variant mt-1">{TYPE_LABELS[type].desc}</p>
            </label>
          )
        })}
      </div>
    </div>
  )
}

export { TYPE_LABELS }

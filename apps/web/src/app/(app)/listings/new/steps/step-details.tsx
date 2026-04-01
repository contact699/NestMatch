'use client'

import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { DollarSign, Bath, HandHeart } from 'lucide-react'
import { ListingFormData } from '../types'
import { BATHROOM_TYPES, BATHROOM_SIZES, HELP_TASKS } from '@/lib/utils'

interface StepDetailsProps {
  register: UseFormRegister<ListingFormData>
  errors: FieldErrors<ListingFormData>
  watch: UseFormWatch<ListingFormData>
  setValue: UseFormSetValue<ListingFormData>
}

export function StepDetails({ register, errors, watch, setValue }: StepDetailsProps) {
  const helpNeeded = watch('help_needed')
  const selectedHelpTasks = watch('help_tasks') || []
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-display font-semibold text-on-surface">
        Tell us about the listing
      </h3>

      <Input
        {...register('title')}
        label="Listing Title *"
        placeholder="Cozy room in downtown apartment"
        error={errors.title?.message}
      />

      <div>
        <label className="block text-sm font-medium text-on-surface-variant mb-1">
          Description
        </label>
        <textarea
          {...register('description')}
          rows={4}
          placeholder="Describe the room, the home, and what makes it special..."
          className="w-full px-3 py-2.5 ghost-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary resize-none bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-1">
            Monthly Rent (CAD) *
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <input
              type="number"
              {...register('price', { valueAsNumber: true })}
              placeholder="1200"
              className="w-full pl-9 pr-4 py-2.5 ghost-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant"
            />
          </div>
          {errors.price && (
            <p className="mt-1 text-sm text-error">{errors.price.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-1">
            Minimum Stay (months)
          </label>
          <select
            {...register('minimum_stay', { valueAsNumber: true })}
            className="w-full px-3 py-2.5 ghost-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary bg-surface-container-lowest text-on-surface"
          >
            {[1, 2, 3, 6, 12, 24].map((months) => (
              <option key={months} value={months}>
                {months} {months === 1 ? 'month' : 'months'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-on-surface-variant mb-1">
          Available From *
        </label>
        <input
          type="date"
          {...register('available_date')}
          min={new Date().toISOString().split('T')[0]}
          className="w-full px-3 py-2.5 ghost-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary bg-surface-container-lowest text-on-surface"
        />
        {errors.available_date && (
          <p className="mt-1 text-sm text-error">{errors.available_date.message}</p>
        )}
      </div>

      <label className="flex items-center gap-2 p-3 ghost-border rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors">
        <input
          type="checkbox"
          {...register('utilities_included')}
          className="rounded border-outline/30 text-secondary focus:ring-secondary"
        />
        <span className="text-sm text-on-surface">Utilities included in rent</span>
      </label>

      {/* Bathroom Section */}
      <div className="space-y-4 pt-4 ghost-border-t">
        <div className="flex items-center gap-2 text-sm font-medium text-on-surface">
          <Bath className="h-4 w-4" />
          Bathroom
        </div>

        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-2">
            Bathroom Type *
          </label>
          <div className="space-y-2">
            {BATHROOM_TYPES.map((type) => (
              <label
                key={type.value}
                className="flex items-start gap-3 p-3 ghost-border rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors"
              >
                <input
                  type="radio"
                  {...register('bathroom_type')}
                  value={type.value}
                  className="mt-0.5 border-outline/30 text-secondary focus:ring-secondary"
                />
                <div>
                  <span className="text-sm font-medium text-on-surface">{type.label}</span>
                  <p className="text-xs text-on-surface-variant">{type.description}</p>
                </div>
              </label>
            ))}
          </div>
          {errors.bathroom_type && (
            <p className="mt-1 text-sm text-error">{errors.bathroom_type.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-1">
            Bathroom Size (optional)
          </label>
          <select
            {...register('bathroom_size', { setValueAs: (v) => v === '' ? null : v })}
            className="w-full px-3 py-2.5 ghost-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary bg-surface-container-lowest text-on-surface"
          >
            <option value="">Not specified</option>
            {BATHROOM_SIZES.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label} - {size.description}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Help Needed Section */}
      <div className="space-y-4 pt-4 ghost-border-t">
        <div className="flex items-center gap-2 text-sm font-medium text-on-surface">
          <HandHeart className="h-4 w-4" />
          Help Exchange Program
        </div>
        <p className="text-sm text-on-surface-variant">
          Offer reduced rent in exchange for help around the house. Great for seniors or those needing assistance.
        </p>

        <label className="flex items-center gap-3 p-3 ghost-border rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors">
          <input
            type="checkbox"
            {...register('help_needed')}
            className="rounded border-outline/30 text-secondary focus:ring-secondary"
          />
          <div>
            <span className="text-sm font-medium text-on-surface">Looking for help with household tasks</span>
            <p className="text-xs text-on-surface-variant">Rent may be reduced in exchange for assistance</p>
          </div>
        </label>

        {helpNeeded && (
          <div className="space-y-4 pl-4 border-l-2 border-secondary/30">
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-2">
                What kind of help do you need?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {HELP_TASKS.map((task) => (
                  <label
                    key={task.value}
                    className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-colors ${
                      selectedHelpTasks.includes(task.value)
                        ? 'ghost-border ring-2 ring-secondary bg-secondary-container'
                        : 'ghost-border hover:bg-surface-container-low'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedHelpTasks.includes(task.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setValue('help_tasks', [...selectedHelpTasks, task.value])
                        } else {
                          setValue('help_tasks', selectedHelpTasks.filter((t: string) => t !== task.value))
                        }
                      }}
                      className="rounded border-outline/30 text-secondary focus:ring-secondary"
                    />
                    <span className="text-sm text-on-surface">{task.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">
                Additional details (optional)
              </label>
              <textarea
                {...register('help_details')}
                rows={3}
                placeholder="Describe the help you need, expected hours per week, rent reduction offered, etc."
                className="w-full px-3 py-2.5 ghost-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary resize-none text-sm bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

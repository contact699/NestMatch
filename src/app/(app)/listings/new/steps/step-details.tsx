'use client'

import { UseFormRegister, FieldErrors } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { DollarSign } from 'lucide-react'
import { ListingFormData } from '../types'

interface StepDetailsProps {
  register: UseFormRegister<ListingFormData>
  errors: FieldErrors<ListingFormData>
}

export function StepDetails({ register, errors }: StepDetailsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        Tell us about the listing
      </h3>

      <Input
        {...register('title')}
        label="Listing Title *"
        placeholder="Cozy room in downtown apartment"
        error={errors.title?.message}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          {...register('description')}
          rows={4}
          placeholder="Describe the room, the home, and what makes it special..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Monthly Rent (CAD) *
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="number"
              {...register('price', { valueAsNumber: true })}
              placeholder="1200"
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {errors.price && (
            <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Stay (months)
          </label>
          <select
            {...register('minimum_stay', { valueAsNumber: true })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Available From *
        </label>
        <input
          type="date"
          {...register('available_date')}
          min={new Date().toISOString().split('T')[0]}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.available_date && (
          <p className="mt-1 text-sm text-red-600">{errors.available_date.message}</p>
        )}
      </div>

      <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
        <input
          type="checkbox"
          {...register('utilities_included')}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">Utilities included in rent</span>
      </label>
    </div>
  )
}

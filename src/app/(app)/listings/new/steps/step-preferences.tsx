'use client'

import { UseFormRegister } from 'react-hook-form'
import { ListingFormData } from '../types'

interface StepPreferencesProps {
  register: UseFormRegister<ListingFormData>
}

export function StepPreferences({ register }: StepPreferencesProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        Roommate preferences
      </h3>
      <p className="text-sm text-gray-500">
        These help match you with compatible roommates
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Gender Preference
        </label>
        <select
          {...register('roommate_gender_preference')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="any">Any gender</option>
          <option value="male">Male only</option>
          <option value="female">Female only</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Minimum Age (optional)
          </label>
          <input
            type="number"
            {...register('roommate_age_min', {
              setValueAs: (v) => v === '' ? undefined : parseInt(v, 10)
            })}
            placeholder="18"
            min={18}
            max={120}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Maximum Age (optional)
          </label>
          <input
            type="number"
            {...register('roommate_age_max', {
              setValueAs: (v) => v === '' ? undefined : parseInt(v, 10)
            })}
            placeholder="65"
            min={18}
            max={120}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Property features */}
      <div className="space-y-3 pt-4 border-t border-gray-200">
        <p className="text-sm font-medium text-gray-700">
          Property features
        </p>

        <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            {...register('pets_allowed')}
            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">
              Pets Allowed
            </p>
            <p className="text-sm text-gray-500">
              Tenants can bring pets (dogs, cats, etc.)
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            {...register('smoking_allowed')}
            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">
              Smoking Allowed
            </p>
            <p className="text-sm text-gray-500">
              Smoking is permitted on the premises
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            {...register('parking_included')}
            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">
              Parking Included
            </p>
            <p className="text-sm text-gray-500">
              A parking spot is available for tenants
            </p>
          </div>
        </label>
      </div>

      {/* Special accommodations */}
      <div className="space-y-3 pt-4 border-t border-gray-200">
        <p className="text-sm font-medium text-gray-700">
          Special accommodations
        </p>

        <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            {...register('newcomer_friendly')}
            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">
              Newcomer Friendly
            </p>
            <p className="text-sm text-gray-500">
              Open to newcomers, international students, and those new to Canada
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            {...register('no_credit_history_ok')}
            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">
              No Credit History OK
            </p>
            <p className="text-sm text-gray-500">
              Open to tenants without Canadian credit history
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            {...register('ideal_for_students')}
            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">
              Ideal for Students
            </p>
            <p className="text-sm text-gray-500">
              Best suited for students - close to campus, flexible terms, or student-only preference
            </p>
          </div>
        </label>
      </div>
    </div>
  )
}

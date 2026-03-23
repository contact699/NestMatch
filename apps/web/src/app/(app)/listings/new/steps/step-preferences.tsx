'use client'

import { UseFormRegister } from 'react-hook-form'
import { ListingFormData } from '../types'

interface StepPreferencesProps {
  register: UseFormRegister<ListingFormData>
}

export function StepPreferences({ register }: StepPreferencesProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-display font-semibold text-on-surface">
        Roommate preferences
      </h3>
      <p className="text-sm text-on-surface-variant">
        These help match you with compatible roommates
      </p>

      <div>
        <label className="block text-sm font-medium text-on-surface-variant mb-1">
          Gender Preference
        </label>
        <select
          {...register('roommate_gender_preference')}
          className="w-full px-3 py-2.5 ghost-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary bg-surface-container-lowest text-on-surface"
        >
          <option value="any">Any gender</option>
          <option value="male">Male only</option>
          <option value="female">Female only</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-1">
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
            className="w-full px-3 py-2.5 ghost-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-1">
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
            className="w-full px-3 py-2.5 ghost-border rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant"
          />
        </div>
      </div>

      {/* Property features */}
      <div className="space-y-3 pt-4 ghost-border-t">
        <p className="text-sm font-medium text-on-surface">
          Property features
        </p>

        <label className="flex items-start gap-3 p-3 ghost-border rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors">
          <input
            type="checkbox"
            {...register('pets_allowed')}
            className="mt-1 rounded border-outline/30 text-secondary focus:ring-secondary"
          />
          <div>
            <p className="text-sm font-medium text-on-surface">
              Pets Allowed
            </p>
            <p className="text-sm text-on-surface-variant">
              Tenants can bring pets (dogs, cats, etc.)
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3 ghost-border rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors">
          <input
            type="checkbox"
            {...register('smoking_allowed')}
            className="mt-1 rounded border-outline/30 text-secondary focus:ring-secondary"
          />
          <div>
            <p className="text-sm font-medium text-on-surface">
              Smoking Allowed
            </p>
            <p className="text-sm text-on-surface-variant">
              Smoking is permitted on the premises
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3 ghost-border rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors">
          <input
            type="checkbox"
            {...register('parking_included')}
            className="mt-1 rounded border-outline/30 text-secondary focus:ring-secondary"
          />
          <div>
            <p className="text-sm font-medium text-on-surface">
              Parking Included
            </p>
            <p className="text-sm text-on-surface-variant">
              A parking spot is available for tenants
            </p>
          </div>
        </label>
      </div>

      {/* Special accommodations */}
      <div className="space-y-3 pt-4 ghost-border-t">
        <p className="text-sm font-medium text-on-surface">
          Special accommodations
        </p>

        <label className="flex items-start gap-3 p-3 ghost-border rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors">
          <input
            type="checkbox"
            {...register('newcomer_friendly')}
            className="mt-1 rounded border-outline/30 text-secondary focus:ring-secondary"
          />
          <div>
            <p className="text-sm font-medium text-on-surface">
              Newcomer Friendly
            </p>
            <p className="text-sm text-on-surface-variant">
              Open to newcomers, international students, and those new to Canada
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3 ghost-border rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors">
          <input
            type="checkbox"
            {...register('no_credit_history_ok')}
            className="mt-1 rounded border-outline/30 text-secondary focus:ring-secondary"
          />
          <div>
            <p className="text-sm font-medium text-on-surface">
              No Credit History OK
            </p>
            <p className="text-sm text-on-surface-variant">
              Open to tenants without Canadian credit history
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3 ghost-border rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors">
          <input
            type="checkbox"
            {...register('ideal_for_students')}
            className="mt-1 rounded border-outline/30 text-secondary focus:ring-secondary"
          />
          <div>
            <p className="text-sm font-medium text-on-surface">
              Ideal for Students
            </p>
            <p className="text-sm text-on-surface-variant">
              Best suited for students - close to campus, flexible terms, or student-only preference
            </p>
          </div>
        </label>
      </div>
    </div>
  )
}

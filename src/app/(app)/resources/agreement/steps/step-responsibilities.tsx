'use client'

import { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form'
import { AgreementFormData } from '../types'

interface StepResponsibilitiesProps {
  register: UseFormRegister<AgreementFormData>
  watch: UseFormWatch<AgreementFormData>
  setValue: UseFormSetValue<AgreementFormData>
  errors: FieldErrors<AgreementFormData>
}

const CLEANING_SCHEDULES = [
  { value: 'rotating', label: 'Rotating Schedule', desc: 'Take turns cleaning different areas each week' },
  { value: 'assigned', label: 'Assigned Areas', desc: 'Each person is responsible for specific areas' },
  { value: 'as_needed', label: 'As Needed', desc: 'Clean when it needs cleaning, no formal schedule' },
  { value: 'hired', label: 'Hired Cleaner', desc: 'Split the cost of professional cleaning' },
]

const SHARED_SUPPLIES = [
  { value: 'split', label: 'Split Costs', desc: 'Everyone contributes to a shared supplies fund' },
  { value: 'rotate', label: 'Rotate Buying', desc: 'Take turns purchasing shared supplies' },
  { value: 'individual', label: 'Individual', desc: 'Everyone buys their own supplies' },
]

const CLEANING_AREAS = [
  'Kitchen',
  'Living Room',
  'Bathroom(s)',
  'Hallways/Common Areas',
  'Taking out trash',
  'Vacuuming/Mopping',
]

export function StepResponsibilities({ register, watch, setValue, errors }: StepResponsibilitiesProps) {
  const cleaningSchedule = watch('cleaningSchedule')
  const roommateNames = watch('roommateNames') || []
  const cleaningAreas = watch('cleaningAreas') || []

  const initializeCleaningAreas = () => {
    if (cleaningAreas.length === 0) {
      setValue(
        'cleaningAreas',
        CLEANING_AREAS.map((area) => ({ area, assignedTo: '' }))
      )
    }
  }

  const updateAreaAssignment = (areaIndex: number, assignedTo: string) => {
    const updated = [...cleaningAreas]
    updated[areaIndex] = { ...updated[areaIndex], assignedTo }
    setValue('cleaningAreas', updated)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Responsibilities</h3>
        <p className="text-sm text-gray-500">
          Define how household duties and supplies will be managed
        </p>
      </div>

      {/* Cleaning Schedule */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cleaning Approach *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CLEANING_SCHEDULES.map((schedule) => (
            <button
              key={schedule.value}
              type="button"
              onClick={() => {
                setValue('cleaningSchedule', schedule.value as any)
                if (schedule.value === 'assigned') {
                  initializeCleaningAreas()
                }
              }}
              className={`
                p-3 rounded-lg border-2 text-left transition-colors
                ${cleaningSchedule === schedule.value
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'}
              `}
            >
              <p className="font-medium text-sm text-gray-900">{schedule.label}</p>
              <p className="text-xs text-gray-500">{schedule.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Assigned Areas */}
      {cleaningSchedule === 'assigned' && cleaningAreas.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-3">
          <p className="text-sm font-medium text-gray-700">Assign areas to roommates:</p>
          {cleaningAreas.map((area, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="text-sm text-gray-700 flex-1">{area.area}</span>
              <select
                value={area.assignedTo || ''}
                onChange={(e) => updateAreaAssignment(index, e.target.value)}
                className="w-40 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
              >
                <option value="">Unassigned</option>
                {roommateNames.map((name, i) => (
                  <option key={i} value={name || `Roommate ${i + 1}`}>
                    {name || `Roommate ${i + 1}`}
                  </option>
                ))}
                <option value="rotating">Rotating</option>
              </select>
            </div>
          ))}
        </div>
      )}

      {/* Shared Supplies */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Shared Household Supplies *
        </label>
        <p className="text-xs text-gray-500 mb-3">
          How will you handle toilet paper, cleaning supplies, etc.?
        </p>
        <div className="space-y-3">
          {SHARED_SUPPLIES.map((approach) => (
            <label
              key={approach.value}
              className={`
                flex items-start p-3 rounded-lg border-2 cursor-pointer transition-colors
                ${watch('sharedSuppliesApproach') === approach.value
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'}
              `}
            >
              <input
                type="radio"
                {...register('sharedSuppliesApproach')}
                value={approach.value}
                className="sr-only"
              />
              <div>
                <p className="font-medium text-sm text-gray-900">{approach.label}</p>
                <p className="text-xs text-gray-500">{approach.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Maintenance Reporting */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Maintenance & Repairs
        </label>
        <textarea
          {...register('maintenanceReporting')}
          placeholder="How will maintenance issues be reported to the landlord? Who is the primary contact? (optional)"
          rows={3}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-colors resize-none"
        />
      </div>
    </div>
  )
}

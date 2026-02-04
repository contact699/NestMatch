'use client'

import { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form'
import { AgreementFormData } from '../types'

interface StepAccommodationsProps {
  register: UseFormRegister<AgreementFormData>
  watch: UseFormWatch<AgreementFormData>
  setValue: UseFormSetValue<AgreementFormData>
  errors: FieldErrors<AgreementFormData>
}

const VISITOR_PARKING_OPTIONS = [
  { value: 'available', label: 'Available', desc: 'Visitor parking is freely available' },
  { value: 'limited', label: 'Limited', desc: 'Limited spots - notify roommates in advance' },
  { value: 'none', label: 'None', desc: 'No visitor parking on premises' },
  { value: 'street_only', label: 'Street Only', desc: 'Visitors must park on the street' },
]

export function StepAccommodations({ register, watch, setValue, errors }: StepAccommodationsProps) {
  const parkingIncluded = watch('parkingIncluded')
  const parkingSpots = watch('parkingSpots') || 0
  const roommateNames = watch('roommateNames') || []
  const parkingAssignments = watch('parkingAssignments') || []

  const careScheduledVisits = watch('careScheduledVisits')
  const careQuietHoursMedical = watch('careQuietHoursMedical')
  const careAccessibilityMods = watch('careAccessibilityMods')
  const hasCareNeeds = careScheduledVisits || careQuietHoursMedical || careAccessibilityMods
  const helpExchangeEnabled = watch('helpExchangeEnabled')

  const initializeParkingAssignments = (spots: number) => {
    if (spots > 0) {
      const assignments = Array.from({ length: spots }, (_, i) => ({
        roommate: '',
        spotNumber: `Spot ${i + 1}`,
      }))
      setValue('parkingAssignments', assignments)
    } else {
      setValue('parkingAssignments', [])
    }
  }

  const updateParkingAssignment = (index: number, roommate: string) => {
    const updated = [...parkingAssignments]
    updated[index] = { ...updated[index], roommate }
    setValue('parkingAssignments', updated)
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Accommodations</h3>
        <p className="text-sm text-gray-500">
          Parking arrangements and accessibility needs
        </p>
      </div>

      {/* Parking Section */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-800 border-b border-gray-200 pb-2">Parking</h4>

        {/* Parking Included Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-sm text-gray-900">Parking Included</p>
            <p className="text-xs text-gray-500">Does this property include parking?</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={parkingIncluded}
              onChange={(e) => {
                setValue('parkingIncluded', e.target.checked)
                if (!e.target.checked) {
                  setValue('parkingSpots', 0)
                  setValue('parkingAssignments', [])
                }
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {parkingIncluded && (
          <div className="space-y-4 pl-4 border-l-2 border-blue-200">
            {/* Number of Spots */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Spots
                </label>
                <input
                  type="number"
                  {...register('parkingSpots', { valueAsNumber: true })}
                  min="0"
                  max="10"
                  onChange={(e) => {
                    const spots = parseInt(e.target.value) || 0
                    setValue('parkingSpots', spots)
                    initializeParkingAssignments(spots)
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Cost (optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    {...register('parkingMonthlyCost', { valueAsNumber: true })}
                    min="0"
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Spot Assignments */}
            {parkingSpots > 0 && parkingAssignments.length > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <p className="text-sm font-medium text-gray-700">Assign spots to roommates:</p>
                {parkingAssignments.map((assignment, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-20">{assignment.spotNumber}</span>
                    <select
                      value={assignment.roommate || ''}
                      onChange={(e) => updateParkingAssignment(index, e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
                    >
                      <option value="">Unassigned</option>
                      {roommateNames.filter(Boolean).map((name, i) => (
                        <option key={i} value={name}>
                          {name}
                        </option>
                      ))}
                      <option value="rotating">Rotating</option>
                      <option value="shared">Shared</option>
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* Visitor Parking */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visitor Parking Policy
              </label>
              <div className="grid grid-cols-2 gap-2">
                {VISITOR_PARKING_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setValue('visitorParkingPolicy', option.value as any)}
                    className={`
                      p-2 rounded-lg border-2 text-left transition-colors
                      ${watch('visitorParkingPolicy') === option.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'}
                    `}
                  >
                    <p className="font-medium text-xs text-gray-900">{option.label}</p>
                    <p className="text-xs text-gray-500">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Parking Rotation */}
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                {...register('parkingRotation')}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">Parking Rotation</p>
                <p className="text-xs text-gray-500">Spots rotate among roommates periodically</p>
              </div>
            </label>

            {/* Vehicle Restrictions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Restrictions (optional)
              </label>
              <textarea
                {...register('vehicleRestrictions')}
                placeholder="e.g., No commercial vehicles, size limitations, electric vehicle charging rules..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Accessibility Section */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-800 border-b border-gray-200 pb-2">Accessibility Needs</h4>

        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              {...register('accessibilityWheelchair')}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Wheelchair Accessible Entrance Required</p>
              <p className="text-xs text-gray-500">Unit needs accessible entryways and pathways</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              {...register('accessibilityMobilityStorage')}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Mobility Aid Storage Needed</p>
              <p className="text-xs text-gray-500">Space required for wheelchairs, walkers, or other mobility devices</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              {...register('accessibilityServiceAnimal')}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Service Animal Accommodation</p>
              <p className="text-xs text-gray-500">A service animal will be residing in the unit</p>
            </div>
          </label>
        </div>
      </div>

      {/* Care/Support Needs Section */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-800 border-b border-gray-200 pb-2">Care/Support Needs</h4>

        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              {...register('careScheduledVisits')}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Scheduled Support Worker Visits</p>
              <p className="text-xs text-gray-500">Regular visits from healthcare or support workers</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              {...register('careQuietHoursMedical')}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Quiet Hours for Medical Needs</p>
              <p className="text-xs text-gray-500">Extended or specific quiet hours required for health reasons</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              {...register('careAccessibilityMods')}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Specific Accessibility Modifications</p>
              <p className="text-xs text-gray-500">Grab bars, ramps, or other modifications needed</p>
            </div>
          </label>
        </div>

        {/* Additional Details */}
        {hasCareNeeds && (
          <div className="pl-4 border-l-2 border-blue-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Details
            </label>
            <textarea
              {...register('careAdditionalDetails')}
              placeholder="Describe any specific care or accessibility requirements that roommates should be aware of..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none text-sm"
            />
          </div>
        )}
      </div>

      {/* Help/Assistance Exchange Section */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-800 border-b border-gray-200 pb-2">Help/Assistance Exchange</h4>
        <p className="text-sm text-gray-500">
          If a roommate provides help or assistance (e.g., cleaning, errands, caregiving) in exchange for reduced rent or other compensation, document it here.
        </p>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-sm text-gray-900">Help Exchange Arrangement</p>
            <p className="text-xs text-gray-500">Does this living arrangement include an assistance exchange?</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={helpExchangeEnabled}
              onChange={(e) => setValue('helpExchangeEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {helpExchangeEnabled && (
          <div className="space-y-4 pl-4 border-l-2 border-blue-200">
            {/* Who provides help */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Who provides the assistance?
              </label>
              <select
                {...register('helpExchangeProvider')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value="">Select a roommate</option>
                {roommateNames.filter(Boolean).map((name, i) => (
                  <option key={i} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* Tasks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tasks included in the arrangement
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'cleaning', label: 'Cleaning' },
                  { value: 'cooking', label: 'Cooking/Meal Prep' },
                  { value: 'groceries', label: 'Grocery Shopping' },
                  { value: 'errands', label: 'Running Errands' },
                  { value: 'caregiving', label: 'Caregiving/Companionship' },
                  { value: 'gardening', label: 'Yard/Garden Work' },
                  { value: 'driving', label: 'Driving/Transportation' },
                  { value: 'pet_care', label: 'Pet Care' },
                ].map((task) => (
                  <label key={task.value} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      value={task.value}
                      {...register('helpExchangeTasks')}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    {task.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Compensation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Compensation type
              </label>
              <select
                {...register('helpExchangeCompensation')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value="reduced_rent">Reduced Rent</option>
                <option value="free_rent">Free Rent</option>
                <option value="utilities_covered">Utilities Covered</option>
                <option value="other">Other Arrangement</option>
              </select>
            </div>

            {/* Additional Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Details of the arrangement
              </label>
              <textarea
                {...register('helpExchangeDetails')}
                placeholder="Describe the specific arrangement, expected hours, schedule, and any other relevant details..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none text-sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

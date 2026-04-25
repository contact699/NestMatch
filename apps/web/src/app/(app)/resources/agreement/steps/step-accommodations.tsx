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
  const helpExchangeAssignments = watch('helpExchangeAssignments') || []

  const HELP_TASK_OPTIONS = [
    { value: 'cleaning', label: 'Cleaning' },
    { value: 'cooking', label: 'Cooking/Meal Prep' },
    { value: 'groceries', label: 'Grocery Shopping' },
    { value: 'errands', label: 'Running Errands' },
    { value: 'caregiving', label: 'Caregiving/Companionship' },
    { value: 'gardening', label: 'Yard/Garden Work' },
    { value: 'driving', label: 'Driving/Transportation' },
    { value: 'pet_care', label: 'Pet Care' },
  ]

  const getTaskProvider = (taskValue: string): string =>
    helpExchangeAssignments.find((a) => a.task === taskValue)?.provider || ''

  const setTaskProvider = (taskValue: string, provider: string) => {
    const filtered = helpExchangeAssignments.filter((a) => a.task !== taskValue)
    const next = provider
      ? [...filtered, { task: taskValue, provider }]
      : filtered
    setValue('helpExchangeAssignments', next)
  }

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
        <h3 className="text-lg font-display font-semibold text-on-surface mb-1">Accommodations</h3>
        <p className="text-sm text-on-surface-variant">
          Parking arrangements and accessibility needs
        </p>
      </div>

      {/* Parking Section */}
      <div className="space-y-4">
        <h4 className="font-display font-medium text-on-surface ghost-border-b pb-2">Parking</h4>

        {/* Parking Included Toggle */}
        <div className="flex items-center justify-between p-4 bg-surface-container rounded-xl">
          <div>
            <p className="font-medium text-sm text-on-surface">Parking Included</p>
            <p className="text-xs text-on-surface-variant">Does this property include parking?</p>
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
            <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-secondary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-container-high after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
          </label>
        </div>

        {parkingIncluded && (
          <div className="space-y-4 pl-4 border-l-2 border-secondary/30">
            {/* Number of Spots */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
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
                  className="w-full px-3 py-2 ghost-border rounded-lg focus:ring-2 focus:ring-secondary/30 outline-none bg-surface-container-lowest text-on-surface"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Monthly Cost (optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-on-surface-variant">$</span>
                  <input
                    type="number"
                    {...register('parkingMonthlyCost', { valueAsNumber: true })}
                    min="0"
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 ghost-border rounded-lg focus:ring-2 focus:ring-secondary/30 outline-none bg-surface-container-lowest text-on-surface"
                  />
                </div>
              </div>
            </div>

            {/* Spot Assignments */}
            {parkingSpots > 0 && parkingAssignments.length > 0 && (
              <div className="p-4 bg-surface-container rounded-xl space-y-3">
                <p className="text-sm font-medium text-on-surface-variant">Assign spots to roommates:</p>
                {parkingAssignments.map((assignment, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-sm text-on-surface-variant w-20">{assignment.spotNumber}</span>
                    <select
                      value={assignment.roommate || ''}
                      onChange={(e) => updateParkingAssignment(index, e.target.value)}
                      className="flex-1 px-3 py-2 text-sm ghost-border rounded-lg bg-surface-container-lowest text-on-surface"
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
              <label className="block text-sm font-medium text-on-surface-variant mb-2">
                Visitor Parking Policy
              </label>
              <div className="grid grid-cols-2 gap-2">
                {VISITOR_PARKING_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setValue('visitorParkingPolicy', option.value as any)}
                    className={`
                      p-2 rounded-xl ghost-border text-left transition-colors
                      ${watch('visitorParkingPolicy') === option.value
                        ? 'bg-secondary-container/30 ring-1 ring-secondary'
                        : 'bg-surface-container-lowest hover:bg-surface-container'}
                    `}
                  >
                    <p className="font-medium text-xs text-on-surface">{option.label}</p>
                    <p className="text-xs text-on-surface-variant">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Parking Rotation */}
            <label className="flex items-center gap-3 p-3 bg-surface-container rounded-xl cursor-pointer">
              <input
                type="checkbox"
                {...register('parkingRotation')}
                className="w-4 h-4 text-secondary rounded focus:ring-secondary"
              />
              <div>
                <p className="text-sm font-medium text-on-surface">Parking Rotation</p>
                <p className="text-xs text-on-surface-variant">Spots rotate among roommates periodically</p>
              </div>
            </label>

            {/* Parking Hours Restriction */}
            <label className="flex items-center gap-3 p-3 bg-surface-container rounded-xl cursor-pointer">
              <input
                type="checkbox"
                {...register('parkingHoursRestriction')}
                className="w-4 h-4 text-secondary rounded focus:ring-secondary"
              />
              <div>
                <p className="text-sm font-medium text-on-surface">Parking Hours Restriction</p>
                <p className="text-xs text-on-surface-variant">Are there specific hours when parking is restricted?</p>
              </div>
            </label>

            {watch('parkingHoursRestriction') && (
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Parking Hours Details
                </label>
                <input
                  type="text"
                  {...register('parkingHoursDetails')}
                  placeholder="e.g., No overnight parking 2am-6am, No parking during snow removal"
                  className="w-full px-3 py-2 ghost-border rounded-lg focus:ring-2 focus:ring-secondary/30 outline-none text-sm bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant"
                />
              </div>
            )}

            {/* Snow Removal */}
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-2">
                Snow Removal Responsibility
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'landlord', label: 'Landlord', desc: 'Landlord handles all snow removal' },
                  { value: 'tenants_rotate', label: 'Tenants Rotate', desc: 'Tenants take turns clearing snow' },
                  { value: 'tenants_own_spot', label: 'Own Spot', desc: 'Each tenant clears their own spot' },
                  { value: 'not_applicable', label: 'N/A', desc: 'Not applicable (e.g., underground parking)' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setValue('parkingSnowRemoval', option.value as any)}
                    className={`
                      p-2 rounded-xl ghost-border text-left transition-colors
                      ${watch('parkingSnowRemoval') === option.value
                        ? 'bg-secondary-container/30 ring-1 ring-secondary'
                        : 'bg-surface-container-lowest hover:bg-surface-container'}
                    `}
                  >
                    <p className="font-medium text-xs text-on-surface">{option.label}</p>
                    <p className="text-xs text-on-surface-variant">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* EV Charging */}
            <label className="flex items-center gap-3 p-3 bg-surface-container rounded-xl cursor-pointer">
              <input
                type="checkbox"
                {...register('parkingEvCharging')}
                className="w-4 h-4 text-secondary rounded focus:ring-secondary"
              />
              <div>
                <p className="text-sm font-medium text-on-surface">EV Charging Available</p>
                <p className="text-xs text-on-surface-variant">Electric vehicle charging station on premises</p>
              </div>
            </label>

            {watch('parkingEvCharging') && (
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  EV Charging Details
                </label>
                <input
                  type="text"
                  {...register('parkingEvDetails')}
                  placeholder="e.g., Level 2 charger, shared between tenants, electricity cost split equally"
                  className="w-full px-3 py-2 ghost-border rounded-lg focus:ring-2 focus:ring-secondary/30 outline-none text-sm bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant"
                />
              </div>
            )}

            {/* Towing Policy */}
            <label className="flex items-center gap-3 p-3 bg-surface-container rounded-xl cursor-pointer">
              <input
                type="checkbox"
                {...register('parkingTowingPolicy')}
                className="w-4 h-4 text-secondary rounded focus:ring-secondary"
              />
              <div>
                <p className="text-sm font-medium text-on-surface">Unauthorized Vehicle Towing</p>
                <p className="text-xs text-on-surface-variant">Unauthorized vehicles may be towed at owner&apos;s expense</p>
              </div>
            </label>

            {/* Vehicle Restrictions */}
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">
                Vehicle Restrictions (optional)
              </label>
              <textarea
                {...register('vehicleRestrictions')}
                placeholder="e.g., No commercial vehicles, size limitations..."
                rows={2}
                className="w-full px-3 py-2 ghost-border rounded-lg focus:ring-2 focus:ring-secondary/30 outline-none resize-none text-sm bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant"
              />
            </div>
          </div>
        )}
      </div>

      {/* Accessibility Section */}
      <div className="space-y-4">
        <h4 className="font-display font-medium text-on-surface ghost-border-b pb-2">Accessibility Needs</h4>

        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 bg-surface-container rounded-xl cursor-pointer">
            <input
              type="checkbox"
              {...register('accessibilityWheelchair')}
              className="w-4 h-4 text-secondary rounded focus:ring-secondary"
            />
            <div>
              <p className="text-sm font-medium text-on-surface">Wheelchair Accessible Entrance Required</p>
              <p className="text-xs text-on-surface-variant">Unit needs accessible entryways and pathways</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-surface-container rounded-xl cursor-pointer">
            <input
              type="checkbox"
              {...register('accessibilityMobilityStorage')}
              className="w-4 h-4 text-secondary rounded focus:ring-secondary"
            />
            <div>
              <p className="text-sm font-medium text-on-surface">Mobility Aid Storage Needed</p>
              <p className="text-xs text-on-surface-variant">Space required for wheelchairs, walkers, or other mobility devices</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-surface-container rounded-xl cursor-pointer">
            <input
              type="checkbox"
              {...register('accessibilityServiceAnimal')}
              className="w-4 h-4 text-secondary rounded focus:ring-secondary"
            />
            <div>
              <p className="text-sm font-medium text-on-surface">Service Animal Accommodation</p>
              <p className="text-xs text-on-surface-variant">A service animal will be residing in the unit</p>
            </div>
          </label>
        </div>
      </div>

      {/* Care/Support Needs Section */}
      <div className="space-y-4">
        <h4 className="font-display font-medium text-on-surface ghost-border-b pb-2">Care/Support Needs</h4>

        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 bg-surface-container rounded-xl cursor-pointer">
            <input
              type="checkbox"
              {...register('careScheduledVisits')}
              className="w-4 h-4 text-secondary rounded focus:ring-secondary"
            />
            <div>
              <p className="text-sm font-medium text-on-surface">Scheduled Support Worker Visits</p>
              <p className="text-xs text-on-surface-variant">Regular visits from healthcare or support workers</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-surface-container rounded-xl cursor-pointer">
            <input
              type="checkbox"
              {...register('careQuietHoursMedical')}
              className="w-4 h-4 text-secondary rounded focus:ring-secondary"
            />
            <div>
              <p className="text-sm font-medium text-on-surface">Quiet Hours for Medical Needs</p>
              <p className="text-xs text-on-surface-variant">Extended or specific quiet hours required for health reasons</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-surface-container rounded-xl cursor-pointer">
            <input
              type="checkbox"
              {...register('careAccessibilityMods')}
              className="w-4 h-4 text-secondary rounded focus:ring-secondary"
            />
            <div>
              <p className="text-sm font-medium text-on-surface">Specific Accessibility Modifications</p>
              <p className="text-xs text-on-surface-variant">Grab bars, ramps, or other modifications needed</p>
            </div>
          </label>
        </div>

        {/* Additional Details */}
        {hasCareNeeds && (
          <div className="pl-4 border-l-2 border-secondary/30">
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Additional Details
            </label>
            <textarea
              {...register('careAdditionalDetails')}
              placeholder="Describe any specific care or accessibility requirements that roommates should be aware of..."
              rows={3}
              className="w-full px-3 py-2 ghost-border rounded-lg focus:ring-2 focus:ring-secondary/30 outline-none resize-none text-sm bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant"
            />
          </div>
        )}
      </div>

      {/* Assistance Required / Help Exchange Section */}
      <div className="space-y-4">
        <h4 className="font-display font-medium text-on-surface ghost-border-b pb-2">Assistance Required</h4>
        <p className="text-sm text-on-surface-variant">
          If a roommate provides help or assistance (e.g., cleaning, errands, caregiving, elderly care, babysitting) in exchange for reduced rent or other compensation, document the arrangement here.
        </p>

        <div className="flex items-center justify-between p-4 bg-error-container/20 rounded-xl ghost-border">
          <div>
            <p className="font-medium text-sm text-on-surface">Assistance Required Arrangement</p>
            <p className="text-xs text-on-surface-variant">Does this living arrangement include assistance in exchange for compensation?</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={helpExchangeEnabled}
              onChange={(e) => setValue('helpExchangeEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-secondary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-container-high after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
          </label>
        </div>

        {helpExchangeEnabled && (
          <div className="space-y-4 pl-4 border-l-2 border-secondary/30">
            {/* Per-task assignment matrix — each task can be assigned to a
                different roommate. Leaving a row Unassigned omits the task. */}
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-2">
                Tasks and who provides each
              </label>
              <p className="text-xs text-on-surface-variant mb-3">
                Pick a roommate for each task that's part of the arrangement. Leave a task as &ldquo;Unassigned&rdquo; to skip it.
              </p>
              <div className="space-y-2">
                {HELP_TASK_OPTIONS.map((task) => {
                  const assigned = getTaskProvider(task.value)
                  return (
                    <div
                      key={task.value}
                      className={`flex items-center gap-3 p-2 rounded-lg ${
                        assigned ? 'bg-secondary-container/30' : 'bg-surface-container'
                      }`}
                    >
                      <span className="text-sm text-on-surface flex-1">{task.label}</span>
                      <select
                        value={assigned}
                        onChange={(e) => setTaskProvider(task.value, e.target.value)}
                        className="px-3 py-1.5 ghost-border rounded-md focus:ring-2 focus:ring-secondary/30 outline-none bg-surface-container-lowest text-on-surface text-sm"
                      >
                        <option value="">Unassigned</option>
                        {roommateNames.filter(Boolean).map((name, i) => (
                          <option key={i} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Compensation */}
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">
                Compensation type
              </label>
              <select
                {...register('helpExchangeCompensation')}
                className="w-full px-3 py-2 ghost-border rounded-lg focus:ring-2 focus:ring-secondary/30 outline-none bg-surface-container-lowest text-on-surface"
              >
                <option value="reduced_rent">Reduced Rent</option>
                <option value="free_rent">Free Rent</option>
                <option value="utilities_covered">Utilities Covered</option>
                <option value="other">Other Arrangement</option>
              </select>
            </div>

            {/* Hours Per Week */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Expected Hours Per Week
                </label>
                <input
                  type="number"
                  {...register('helpExchangeHoursPerWeek', { valueAsNumber: true })}
                  min="0"
                  max="40"
                  placeholder="e.g., 10"
                  className="w-full px-3 py-2 ghost-border rounded-lg focus:ring-2 focus:ring-secondary/30 outline-none text-sm bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Trial Period (days)
                </label>
                <input
                  type="number"
                  {...register('helpExchangeTrialPeriod', { valueAsNumber: true })}
                  min="0"
                  max="90"
                  placeholder="e.g., 30"
                  className="w-full px-3 py-2 ghost-border rounded-lg focus:ring-2 focus:ring-secondary/30 outline-none text-sm bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant"
                />
                <p className="text-xs text-on-surface-variant mt-1">Period to evaluate if the arrangement works</p>
              </div>
            </div>

            {/* Schedule */}
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">
                Assistance Schedule
              </label>
              <input
                type="text"
                {...register('helpExchangeSchedule')}
                placeholder="e.g., Weekday mornings 8am-12pm, or as needed"
                className="w-full px-3 py-2 ghost-border rounded-lg focus:ring-2 focus:ring-secondary/30 outline-none text-sm bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant"
              />
            </div>

            {/* Additional Details */}
            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-1">
                Additional Details
              </label>
              <textarea
                {...register('helpExchangeDetails')}
                placeholder="Describe any specific requirements, expectations, boundaries, or other relevant details..."
                rows={3}
                className="w-full px-3 py-2 ghost-border rounded-lg focus:ring-2 focus:ring-secondary/30 outline-none resize-none text-sm bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

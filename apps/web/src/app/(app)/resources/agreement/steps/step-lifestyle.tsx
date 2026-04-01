'use client'

import { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { AgreementFormData } from '../types'

interface StepLifestyleProps {
  register: UseFormRegister<AgreementFormData>
  watch: UseFormWatch<AgreementFormData>
  setValue: UseFormSetValue<AgreementFormData>
  errors: FieldErrors<AgreementFormData>
}

const GUEST_POLICIES = [
  { value: 'notify', label: 'Notify roommates', desc: 'Let others know when having guests' },
  { value: 'limit', label: 'Set limits', desc: 'Maximum nights per week for overnight guests' },
  { value: 'approval', label: 'Get approval', desc: 'Ask permission for overnight guests' },
  { value: 'flexible', label: 'Flexible', desc: 'No specific rules for guests' },
]

const SMOKING_POLICIES = [
  { value: 'no_smoking', label: 'No smoking anywhere' },
  { value: 'outside_only', label: 'Outside only' },
  { value: 'designated_area', label: 'Designated area only' },
]

const CANNABIS_POLICIES = [
  { value: 'no_cannabis', label: 'No cannabis use' },
  { value: 'outside_only', label: 'Outside only' },
  { value: 'designated_area', label: 'Designated area only' },
  { value: 'same_as_smoking', label: 'Same as smoking policy' },
]

export function StepLifestyle({ register, watch, setValue, errors }: StepLifestyleProps) {
  const guestPolicy = watch('guestPolicy')
  const petsAllowed = watch('petsAllowed')

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-display font-semibold text-on-surface mb-1">Lifestyle Rules</h3>
        <p className="text-sm text-on-surface-variant">
          Set expectations for daily living and shared spaces
        </p>
      </div>

      {/* Quiet Hours */}
      <div>
        <label className="block text-sm font-medium text-on-surface-variant mb-2">
          Quiet Hours
        </label>
        <p className="text-xs text-on-surface-variant mb-3">
          When should noise be kept to a minimum?
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-on-surface-variant block mb-1">Start</label>
            <Input type="time" {...register('quietHoursStart')} className="bg-surface-container-lowest" />
          </div>
          <span className="text-on-surface-variant pt-5">to</span>
          <div className="flex-1">
            <label className="text-xs text-on-surface-variant block mb-1">End</label>
            <Input type="time" {...register('quietHoursEnd')} className="bg-surface-container-lowest" />
          </div>
        </div>
      </div>

      {/* Guest Policy */}
      <div>
        <label className="block text-sm font-medium text-on-surface-variant mb-2">
          Guest Policy *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GUEST_POLICIES.map((policy) => (
            <button
              key={policy.value}
              type="button"
              onClick={() => setValue('guestPolicy', policy.value as any)}
              className={`
                p-3 rounded-xl ghost-border text-left transition-colors
                ${guestPolicy === policy.value
                  ? 'bg-secondary-container/30 ring-1 ring-secondary'
                  : 'bg-surface-container-lowest hover:bg-surface-container'}
              `}
            >
              <p className="font-medium text-sm text-on-surface">{policy.label}</p>
              <p className="text-xs text-on-surface-variant">{policy.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Overnight Guest Limit */}
      {guestPolicy === 'limit' && (
        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-2">
            Maximum overnight guest nights per week
          </label>
          <Input
            type="number"
            {...register('overnightGuestLimit', { valueAsNumber: true })}
            min={0}
            max={7}
            placeholder="3"
            className="bg-surface-container-lowest"
          />
        </div>
      )}

      {/* Smoking Policy */}
      <div>
        <label className="block text-sm font-medium text-on-surface-variant mb-2">
          Smoking Policy *
        </label>
        <select
          {...register('smokingPolicy')}
          className="w-full px-4 py-3 ghost-border rounded-xl focus:ring-2 focus:ring-secondary/30 outline-none transition-colors bg-surface-container-lowest text-on-surface"
        >
          {SMOKING_POLICIES.map((policy) => (
            <option key={policy.value} value={policy.value}>
              {policy.label}
            </option>
          ))}
        </select>
      </div>

      {/* Cannabis Policy */}
      <div>
        <label className="block text-sm font-medium text-on-surface-variant mb-2">
          Cannabis Policy *
        </label>
        <select
          {...register('cannabisPolicy')}
          className="w-full px-4 py-3 ghost-border rounded-xl focus:ring-2 focus:ring-secondary/30 outline-none transition-colors bg-surface-container-lowest text-on-surface"
        >
          {CANNABIS_POLICIES.map((policy) => (
            <option key={policy.value} value={policy.value}>
              {policy.label}
            </option>
          ))}
        </select>
      </div>

      {/* Pets */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...register('petsAllowed')}
            className="w-5 h-5 rounded text-secondary focus:ring-secondary"
          />
          <div>
            <span className="text-sm font-medium text-on-surface">Pets are allowed</span>
            <p className="text-xs text-on-surface-variant">Check this if any roommate has or may have pets</p>
          </div>
        </label>
      </div>

      {petsAllowed && (
        <div>
          <label className="block text-sm font-medium text-on-surface-variant mb-2">
            Pet Details
          </label>
          <textarea
            {...register('petDetails')}
            placeholder="Describe current or expected pets (type, size, who owns them, any restrictions)"
            rows={3}
            className="w-full px-4 py-3 ghost-border rounded-xl focus:ring-2 focus:ring-secondary/30 outline-none transition-colors resize-none bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant"
          />
        </div>
      )}
    </div>
  )
}

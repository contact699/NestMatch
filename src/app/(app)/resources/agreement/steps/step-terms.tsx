'use client'

import { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { AgreementFormData } from '../types'

interface StepTermsProps {
  register: UseFormRegister<AgreementFormData>
  watch: UseFormWatch<AgreementFormData>
  setValue: UseFormSetValue<AgreementFormData>
  errors: FieldErrors<AgreementFormData>
}

const DISPUTE_RESOLUTION_OPTIONS = [
  {
    value: 'direct',
    label: 'Direct Conversation',
    desc: 'Address issues through respectful, face-to-face discussion',
  },
  {
    value: 'written',
    label: 'Written Communication',
    desc: 'Put concerns in writing so everyone can consider responses',
  },
  {
    value: 'mediation',
    label: 'Third-Party Mediation',
    desc: 'Seek a neutral mediator if direct resolution fails',
  },
]

const AGREEMENT_DURATION_OPTIONS = [
  {
    value: 'month_to_month',
    label: 'Month-to-Month',
    desc: 'Agreement renews automatically each month',
  },
  {
    value: 'fixed_term',
    label: 'Fixed Term',
    desc: 'Agreement ends on a specific date',
  },
]

export function StepTerms({ register, watch, setValue, errors }: StepTermsProps) {
  const disputeResolution = watch('disputeResolution')
  const agreementDuration = watch('agreementDuration')

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Agreement Terms</h3>
        <p className="text-sm text-gray-500">
          Set the terms for notice periods, dispute resolution, and agreement duration
        </p>
      </div>

      {/* Notice to Leave */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notice to Leave (days) *
        </label>
        <p className="text-xs text-gray-500 mb-3">
          How many days of written notice must a roommate give before moving out? (1-90 days)
        </p>
        <Input
          type="number"
          {...register('noticeToLeave', { valueAsNumber: true })}
          min={1}
          max={90}
          placeholder="30"
        />
        {errors.noticeToLeave && (
          <p className="mt-1 text-sm text-red-600">{errors.noticeToLeave.message}</p>
        )}
      </div>

      {/* Dispute Resolution */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dispute Resolution *
        </label>
        <p className="text-xs text-gray-500 mb-3">
          How should disagreements between roommates be handled?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DISPUTE_RESOLUTION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setValue('disputeResolution', option.value as any)}
              className={`
                p-3 rounded-lg border-2 text-left transition-colors
                ${disputeResolution === option.value
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'}
              `}
            >
              <p className="font-medium text-sm text-gray-900">{option.label}</p>
              <p className="text-xs text-gray-500">{option.desc}</p>
            </button>
          ))}
        </div>
        {errors.disputeResolution && (
          <p className="mt-1 text-sm text-red-600">{errors.disputeResolution.message}</p>
        )}
      </div>

      {/* Agreement Duration */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Agreement Duration *
        </label>
        <p className="text-xs text-gray-500 mb-3">
          How long will this agreement be in effect?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AGREEMENT_DURATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setValue('agreementDuration', option.value as any)}
              className={`
                p-3 rounded-lg border-2 text-left transition-colors
                ${agreementDuration === option.value
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'}
              `}
            >
              <p className="font-medium text-sm text-gray-900">{option.label}</p>
              <p className="text-xs text-gray-500">{option.desc}</p>
            </button>
          ))}
        </div>
        {errors.agreementDuration && (
          <p className="mt-1 text-sm text-red-600">{errors.agreementDuration.message}</p>
        )}
      </div>

      {/* Fixed Term End Date (conditional) */}
      {agreementDuration === 'fixed_term' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date *
          </label>
          <p className="text-xs text-gray-500 mb-3">
            When does this fixed-term agreement end?
          </p>
          <Input
            type="date"
            {...register('fixedTermEndDate')}
          />
          {errors.fixedTermEndDate && (
            <p className="mt-1 text-sm text-red-600">{errors.fixedTermEndDate.message}</p>
          )}
        </div>
      )}
    </div>
  )
}

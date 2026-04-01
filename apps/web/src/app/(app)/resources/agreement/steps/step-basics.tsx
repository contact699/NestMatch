'use client'

import { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form'
import { Plus, Trash2, Users, Home, Calendar, Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PROVINCES } from '@/components/resources'
import { AgreementFormData } from '../types'

interface StepBasicsProps {
  register: UseFormRegister<AgreementFormData>
  watch: UseFormWatch<AgreementFormData>
  setValue: UseFormSetValue<AgreementFormData>
  errors: FieldErrors<AgreementFormData>
}

export function StepBasics({ register, watch, setValue, errors }: StepBasicsProps) {
  const roommateNames = watch('roommateNames') || ['']

  const addRoommate = () => {
    setValue('roommateNames', [...roommateNames, ''])
  }

  const removeRoommate = (index: number) => {
    if (roommateNames.length > 1) {
      setValue(
        'roommateNames',
        roommateNames.filter((_, i) => i !== index)
      )
    }
  }

  const updateRoommateName = (index: number, value: string) => {
    const updated = [...roommateNames]
    updated[index] = value
    setValue('roommateNames', updated)
  }

  return (
    <div className="space-y-8">
      {/* Roommates & Co-tenants */}
      <div>
        <h3 className="text-lg font-display font-semibold text-on-surface mb-1 flex items-center gap-2">
          <Users className="h-5 w-5 text-on-surface-variant" />
          Roommates & Co-tenants
        </h3>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {roommateNames.map((name, index) => (
            <div key={index} className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-on-surface-variant mb-1">
                  Roommate {index + 1} (Legal Name)
                </label>
                <Input
                  value={name}
                  onChange={(e) => updateRoommateName(index, e.target.value)}
                  placeholder={index === 0 ? 'e.g. Alex Henderson' : 'e.g. Sarah Chen'}
                  className="bg-surface-container-lowest"
                />
              </div>
              {roommateNames.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRoommate(index)}
                  className="p-2 mt-5 text-on-surface-variant hover:text-error hover:bg-error-container/30 rounded-lg transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRoommate}
          className="mt-3"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add another roommate
        </Button>
        {errors.roommateNames && (
          <p className="mt-1 text-sm text-error">{errors.roommateNames.message}</p>
        )}
      </div>

      {/* Property Information */}
      <div>
        <h3 className="text-lg font-display font-semibold text-on-surface mb-1 flex items-center gap-2">
          <Home className="h-5 w-5 text-on-surface-variant" />
          Property Information
        </h3>

        {/* Province */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-on-surface-variant mb-2">
            Province *
          </label>
          <select
            {...register('province')}
            className="w-full px-4 py-3 ghost-border rounded-xl focus:ring-2 focus:ring-secondary/30 outline-none transition-colors bg-surface-container-lowest text-on-surface"
          >
            <option value="">Select province</option>
            {PROVINCES.map((province) => (
              <option key={province.code} value={province.code}>
                {province.name}
              </option>
            ))}
          </select>
          {errors.province && (
            <p className="mt-1 text-sm text-error">{errors.province.message}</p>
          )}
        </div>

        {/* Address */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-on-surface-variant mb-2">
            Residential Address
          </label>
          <Input
            {...register('address')}
            placeholder="Street, Apt #, City, Province, Postal Code"
            className="bg-surface-container-lowest"
          />
          {errors.address && (
            <p className="mt-1 text-sm text-error">{errors.address.message}</p>
          )}
          <p className="mt-2 text-xs text-on-surface-variant flex items-start gap-1.5">
            <Info className="h-3.5 w-3.5 text-secondary flex-shrink-0 mt-0.5" />
            Ensure this matches the address on your primary lease with the landlord.
            This agreement acts as a secondary contract between co-tenants.
          </p>
        </div>
      </div>

      {/* Term Dates */}
      <div>
        <h3 className="text-lg font-display font-semibold text-on-surface mb-1 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-on-surface-variant" />
          Term Dates
        </h3>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2">
              Start Date
            </label>
            <Input
              type="date"
              {...register('moveInDate')}
              className="bg-surface-container-lowest"
            />
            {errors.moveInDate && (
              <p className="mt-1 text-sm text-error">{errors.moveInDate.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2">
              End Date (Optional)
            </label>
            <Input
              type="date"
              {...register('fixedTermEndDate')}
              className="bg-surface-container-lowest"
            />
          </div>
        </div>
        <label className="flex items-center gap-3 mt-3 cursor-pointer">
          <input
            type="checkbox"
            {...register('agreementDuration')}
            value="month_to_month"
            className="w-4 h-4 rounded text-secondary focus:ring-secondary"
          />
          <span className="text-sm text-on-surface-variant">
            Agreement continues month-to-month indefinitely
          </span>
        </label>
      </div>
    </div>
  )
}

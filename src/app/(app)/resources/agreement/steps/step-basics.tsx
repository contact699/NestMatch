'use client'

import { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Basic Information</h3>
        <p className="text-sm text-gray-500">
          Start with the fundamental details of your living arrangement
        </p>
      </div>

      {/* Province */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Province *
        </label>
        <select
          {...register('province')}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-colors bg-white"
        >
          <option value="">Select province</option>
          {PROVINCES.map((province) => (
            <option key={province.code} value={province.code}>
              {province.name}
            </option>
          ))}
        </select>
        {errors.province && (
          <p className="mt-1 text-sm text-red-600">{errors.province.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          This helps us include province-specific legal information
        </p>
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Property Address *
        </label>
        <Input
          {...register('address')}
          placeholder="123 Main Street, Unit 4B, Toronto"
        />
        {errors.address && (
          <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
        )}
      </div>

      {/* Move-in Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Move-In Date *
        </label>
        <Input
          type="date"
          {...register('moveInDate')}
        />
        {errors.moveInDate && (
          <p className="mt-1 text-sm text-red-600">{errors.moveInDate.message}</p>
        )}
      </div>

      {/* Roommate Names */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Roommate Names *
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Add all roommates who will be signing this agreement
        </p>
        <div className="space-y-3">
          {roommateNames.map((name, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => updateRoommateName(index, e.target.value)}
                placeholder={`Roommate ${index + 1} full name`}
                className="flex-1"
              />
              {roommateNames.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRoommate(index)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
          Add Roommate
        </Button>
        {errors.roommateNames && (
          <p className="mt-1 text-sm text-red-600">{errors.roommateNames.message}</p>
        )}
      </div>
    </div>
  )
}

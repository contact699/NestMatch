'use client'

import { UseFormRegister, UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form'
import { DollarSign } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { AgreementFormData } from '../types'

interface StepFinancialProps {
  register: UseFormRegister<AgreementFormData>
  watch: UseFormWatch<AgreementFormData>
  setValue: UseFormSetValue<AgreementFormData>
  errors: FieldErrors<AgreementFormData>
}

const PAYMENT_METHODS = [
  { value: 'e-transfer', label: 'E-Transfer' },
  { value: 'cheque', label: 'Post-dated Cheques' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
]

export function StepFinancial({ register, watch, setValue, errors }: StepFinancialProps) {
  const totalRent = watch('totalRent') || 0
  const rentSplitMethod = watch('rentSplitMethod')
  const roommateNames = watch('roommateNames') || []
  const utilitiesIncluded = watch('utilitiesIncluded')
  const rentSplits = watch('rentSplits') || []

  // Calculate equal split
  const equalSplit = roommateNames.length > 0 ? totalRent / roommateNames.length : 0

  // Initialize rent splits when switching to custom
  const handleSplitMethodChange = (method: 'equal' | 'custom') => {
    setValue('rentSplitMethod', method)
    if (method === 'custom' && rentSplits.length === 0) {
      setValue(
        'rentSplits',
        roommateNames.map((name) => ({ name: name || 'Unnamed', amount: equalSplit }))
      )
    }
  }

  const updateRentSplit = (index: number, amount: number) => {
    const updated = [...rentSplits]
    updated[index] = { ...updated[index], amount }
    setValue('rentSplits', updated)
  }

  const customTotal = rentSplits.reduce((sum, split) => sum + (split.amount || 0), 0)
  const customDifference = totalRent - customTotal

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Financial Terms</h3>
        <p className="text-sm text-gray-500">
          Agree on rent, deposits, and payment details
        </p>
      </div>

      {/* Total Rent */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Total Monthly Rent *
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="number"
            {...register('totalRent', { valueAsNumber: true })}
            placeholder="2000"
            className="pl-10"
          />
        </div>
        {errors.totalRent && (
          <p className="mt-1 text-sm text-red-600">{errors.totalRent.message}</p>
        )}
      </div>

      {/* Rent Split Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How will rent be split? *
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleSplitMethodChange('equal')}
            className={`
              p-4 rounded-lg border-2 text-left transition-colors
              ${rentSplitMethod === 'equal'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'}
            `}
          >
            <p className="font-medium text-gray-900">Equal Split</p>
            <p className="text-sm text-gray-500">
              ${equalSplit.toFixed(0)} each
            </p>
          </button>
          <button
            type="button"
            onClick={() => handleSplitMethodChange('custom')}
            className={`
              p-4 rounded-lg border-2 text-left transition-colors
              ${rentSplitMethod === 'custom'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'}
            `}
          >
            <p className="font-medium text-gray-900">Custom Split</p>
            <p className="text-sm text-gray-500">Different amounts</p>
          </button>
        </div>
      </div>

      {/* Custom Splits */}
      {rentSplitMethod === 'custom' && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-3">
          {roommateNames.map((name, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="text-sm text-gray-700 flex-1">
                {name || `Roommate ${index + 1}`}
              </span>
              <div className="relative w-32">
                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  value={rentSplits[index]?.amount || 0}
                  onChange={(e) => updateRentSplit(index, Number(e.target.value) || 0)}
                  className="pl-7 h-9"
                />
              </div>
            </div>
          ))}
          <div className="pt-3 border-t border-gray-200 flex justify-between text-sm">
            <span className="text-gray-600">Total:</span>
            <span className={customDifference !== 0 ? 'text-red-600 font-medium' : 'text-gray-900'}>
              ${customTotal.toFixed(0)}
              {customDifference !== 0 && (
                <span className="ml-2">
                  ({customDifference > 0 ? '-' : '+'}${Math.abs(customDifference).toFixed(0)})
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Rent Due Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rent Due Date *
        </label>
        <select
          {...register('rentDueDate', { valueAsNumber: true })}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-colors bg-white"
        >
          {[1, 5, 10, 15, 20, 25].map((day) => (
            <option key={day} value={day}>
              {day === 1 ? '1st' : day === 2 ? '2nd' : day === 3 ? '3rd' : `${day}th`} of each month
            </option>
          ))}
        </select>
      </div>

      {/* Payment Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Method *
        </label>
        <select
          {...register('paymentMethod')}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-colors bg-white"
        >
          {PAYMENT_METHODS.map((method) => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </select>
      </div>

      {/* Security Deposit */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Security Deposit (if applicable)
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="number"
            {...register('securityDeposit', { valueAsNumber: true })}
            placeholder="0"
            className="pl-10"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Note: Security deposit rules vary by province. Check our guides for details.
        </p>
      </div>

      {/* Utilities */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...register('utilitiesIncluded')}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-900">Utilities included in rent</span>
            <p className="text-xs text-gray-500">If unchecked, you'll specify how to split utilities</p>
          </div>
        </label>
      </div>

      {!utilitiesIncluded && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How will utilities be split?
          </label>
          <select
            {...register('utilitiesSplit')}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-colors bg-white"
          >
            <option value="equal">Split equally each month</option>
            <option value="usage">Based on individual usage (if measurable)</option>
            <option value="rotation">Rotate who pays each month</option>
          </select>
        </div>
      )}
    </div>
  )
}

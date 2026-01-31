'use client'

import { UseFormWatch } from 'react-hook-form'
import { ListingFormData } from '../types'
import { TYPE_LABELS } from './step-type'
import { BATHROOM_TYPES, BATHROOM_SIZES, HELP_TASKS } from '@/lib/utils'

interface StepReviewProps {
  watch: UseFormWatch<ListingFormData>
}

export function StepReview({ watch }: StepReviewProps) {
  const formData = watch()

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">
        Review your listing
      </h3>

      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Basic Info</h4>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-gray-500">Type:</dt>
            <dd className="text-gray-900">{TYPE_LABELS[formData.type]?.label}</dd>
            <dt className="text-gray-500">Title:</dt>
            <dd className="text-gray-900">{formData.title || '-'}</dd>
            <dt className="text-gray-500">Price:</dt>
            <dd className="text-gray-900">${formData.price}/mo</dd>
            <dt className="text-gray-500">Utilities:</dt>
            <dd className="text-gray-900">
              {formData.utilities_included ? 'Included' : 'Not included'}
            </dd>
          </dl>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Location</h4>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-gray-500">City:</dt>
            <dd className="text-gray-900">{formData.city || '-'}</dd>
            <dt className="text-gray-500">Province:</dt>
            <dd className="text-gray-900">{formData.province || '-'}</dd>
            <dt className="text-gray-500">Address:</dt>
            <dd className="text-gray-900">{formData.address || 'Not provided'}</dd>
          </dl>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Details</h4>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-gray-500">Available:</dt>
            <dd className="text-gray-900">{formData.available_date || '-'}</dd>
            <dt className="text-gray-500">Min Stay:</dt>
            <dd className="text-gray-900">{formData.minimum_stay} months</dd>
            <dt className="text-gray-500">Bathroom:</dt>
            <dd className="text-gray-900">
              {BATHROOM_TYPES.find(b => b.value === formData.bathroom_type)?.label || 'Shared'}
              {formData.bathroom_size && (
                <span className="text-gray-500"> ({BATHROOM_SIZES.find(b => b.value === formData.bathroom_size)?.label})</span>
              )}
            </dd>
            <dt className="text-gray-500">Amenities:</dt>
            <dd className="text-gray-900">
              {formData.amenities?.length || 0} selected
            </dd>
          </dl>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Preferences</h4>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-gray-500">Gender:</dt>
            <dd className="text-gray-900 capitalize">
              {formData.roommate_gender_preference || 'Any'}
            </dd>
            <dt className="text-gray-500">Newcomer Friendly:</dt>
            <dd className="text-gray-900">
              {formData.newcomer_friendly ? 'Yes' : 'No'}
            </dd>
            <dt className="text-gray-500">No Credit OK:</dt>
            <dd className="text-gray-900">
              {formData.no_credit_history_ok ? 'Yes' : 'No'}
            </dd>
          </dl>
        </div>

        {formData.help_needed && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Help Exchange</h4>
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <dt className="text-blue-700">Tasks requested:</dt>
              <dd className="text-blue-900">
                {formData.help_tasks && formData.help_tasks.length > 0
                  ? formData.help_tasks.map(task =>
                      HELP_TASKS.find(t => t.value === task)?.label || task
                    ).join(', ')
                  : 'None specified'}
              </dd>
              {formData.help_details && (
                <>
                  <dt className="text-blue-700 mt-2">Details:</dt>
                  <dd className="text-blue-900">{formData.help_details}</dd>
                </>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}

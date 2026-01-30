'use client'

import { UseFormWatch } from 'react-hook-form'
import { ListingFormData } from '../types'
import { TYPE_LABELS } from './step-type'

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
      </div>
    </div>
  )
}

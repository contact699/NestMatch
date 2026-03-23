'use client'

import { UseFormWatch } from 'react-hook-form'
import { ListingFormData } from '../types'
import { TYPE_LABELS } from './step-type'
import { BATHROOM_TYPES, BATHROOM_SIZES, HELP_TASKS } from '@/lib/utils'
import { Check, X } from 'lucide-react'

interface StepReviewProps {
  watch: UseFormWatch<ListingFormData>
}

export function StepReview({ watch }: StepReviewProps) {
  const formData = watch()

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-display font-semibold text-on-surface">
        Review your listing
      </h3>

      <div className="space-y-4">
        <div className="p-4 bg-surface-container-low rounded-2xl">
          <h4 className="font-display font-medium text-on-surface mb-2">Basic Info</h4>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-on-surface-variant">Type:</dt>
            <dd className="text-on-surface">{TYPE_LABELS[formData.type]?.label}</dd>
            <dt className="text-on-surface-variant">Title:</dt>
            <dd className="text-on-surface">{formData.title || '-'}</dd>
            <dt className="text-on-surface-variant">Price:</dt>
            <dd className="text-on-surface">${formData.price}/mo</dd>
            <dt className="text-on-surface-variant">Utilities:</dt>
            <dd className="text-on-surface">
              {formData.utilities_included ? 'Included' : 'Not included'}
            </dd>
          </dl>
        </div>

        <div className="p-4 bg-surface-container-low rounded-2xl">
          <h4 className="font-display font-medium text-on-surface mb-2">Location</h4>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-on-surface-variant">City:</dt>
            <dd className="text-on-surface">{formData.city || '-'}</dd>
            <dt className="text-on-surface-variant">Province:</dt>
            <dd className="text-on-surface">{formData.province || '-'}</dd>
            <dt className="text-on-surface-variant">Address:</dt>
            <dd className="text-on-surface">{formData.address || 'Not provided'}</dd>
          </dl>
        </div>

        <div className="p-4 bg-surface-container-low rounded-2xl">
          <h4 className="font-display font-medium text-on-surface mb-2">Details</h4>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-on-surface-variant">Available:</dt>
            <dd className="text-on-surface">{formData.available_date || '-'}</dd>
            <dt className="text-on-surface-variant">Min Stay:</dt>
            <dd className="text-on-surface">{formData.minimum_stay} months</dd>
            <dt className="text-on-surface-variant">Bathroom:</dt>
            <dd className="text-on-surface">
              {BATHROOM_TYPES.find(b => b.value === formData.bathroom_type)?.label || 'Shared'}
              {formData.bathroom_size && (
                <span className="text-on-surface-variant"> ({BATHROOM_SIZES.find(b => b.value === formData.bathroom_size)?.label})</span>
              )}
            </dd>
            <dt className="text-on-surface-variant">Amenities:</dt>
            <dd className="text-on-surface">
              {formData.amenities?.length || 0} selected
            </dd>
            <dt className="text-on-surface-variant">Photos:</dt>
            <dd className="text-on-surface">
              {formData.photos?.length || 0} uploaded
            </dd>
          </dl>
        </div>

        <div className="p-4 bg-surface-container-low rounded-2xl">
          <h4 className="font-display font-medium text-on-surface mb-2">Preferences</h4>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-on-surface-variant">Gender:</dt>
            <dd className="text-on-surface capitalize">
              {formData.roommate_gender_preference || 'Any'}
            </dd>
            <dt className="text-on-surface-variant">Newcomer Friendly:</dt>
            <dd className="text-on-surface flex items-center gap-1">
              {formData.newcomer_friendly ? (
                <><Check className="h-3.5 w-3.5 text-secondary" /> Yes</>
              ) : (
                <><X className="h-3.5 w-3.5 text-on-surface-variant" /> No</>
              )}
            </dd>
            <dt className="text-on-surface-variant">No Credit OK:</dt>
            <dd className="text-on-surface flex items-center gap-1">
              {formData.no_credit_history_ok ? (
                <><Check className="h-3.5 w-3.5 text-secondary" /> Yes</>
              ) : (
                <><X className="h-3.5 w-3.5 text-on-surface-variant" /> No</>
              )}
            </dd>
            <dt className="text-on-surface-variant">Ideal for Students:</dt>
            <dd className="text-on-surface flex items-center gap-1">
              {formData.ideal_for_students ? (
                <><Check className="h-3.5 w-3.5 text-secondary" /> Yes</>
              ) : (
                <><X className="h-3.5 w-3.5 text-on-surface-variant" /> No</>
              )}
            </dd>
          </dl>
        </div>

        {formData.help_needed && (
          <div className="p-4 bg-secondary-container rounded-2xl">
            <h4 className="font-display font-medium text-secondary mb-2">Help Exchange</h4>
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <dt className="text-secondary/80">Tasks requested:</dt>
              <dd className="text-on-surface">
                {formData.help_tasks && formData.help_tasks.length > 0
                  ? formData.help_tasks.map(task =>
                      HELP_TASKS.find(t => t.value === task)?.label || task
                    ).join(', ')
                  : 'None specified'}
              </dd>
              {formData.help_details && (
                <>
                  <dt className="text-secondary/80 mt-2">Details:</dt>
                  <dd className="text-on-surface">{formData.help_details}</dd>
                </>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}

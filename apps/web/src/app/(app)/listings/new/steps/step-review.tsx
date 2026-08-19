'use client'

import { ReactNode } from 'react'
import { UseFormWatch } from 'react-hook-form'
import { ListingFormData, WIZARD_STEP } from '../types'
import { TYPE_LABELS } from './step-type'
import { BATHROOM_TYPES, BATHROOM_SIZES, HELP_TASKS } from '@/lib/utils'
import { Check, X, Pencil } from 'lucide-react'

const STEP_TYPE = WIZARD_STEP.TYPE
const STEP_LOCATION = WIZARD_STEP.LOCATION
const STEP_DETAILS = WIZARD_STEP.DETAILS
const STEP_AMENITIES = WIZARD_STEP.AMENITIES
const STEP_PHOTOS = WIZARD_STEP.PHOTOS
const STEP_PREFERENCES = WIZARD_STEP.PREFERENCES

const MAX_THUMBNAILS = 6

interface StepReviewProps {
  watch: UseFormWatch<ListingFormData>
  /** Jump back to a wizard step so the host can correct something before publishing. */
  onEdit: (step: number) => void
}

interface ReviewSectionProps {
  title: string
  step: number
  onEdit: (step: number) => void
  children: ReactNode
  className?: string
}

function ReviewSection({ title, step, onEdit, children, className }: ReviewSectionProps) {
  return (
    <div className={className ?? 'p-4 bg-surface-container-low rounded-2xl'}>
      <div className="flex items-center justify-between gap-4 mb-2">
        <h4 className="font-display font-medium text-on-surface">{title}</h4>
        <button
          type="button"
          onClick={() => onEdit(step)}
          aria-label={`Edit ${title}`}
          className="flex items-center gap-1 text-sm font-medium text-secondary hover:underline focus:outline-none focus:ring-2 focus:ring-secondary rounded-md px-1"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>
      {children}
    </div>
  )
}

function YesNo({ value }: { value: boolean | undefined }) {
  return (
    <span className="flex items-center gap-1">
      {value ? (
        <>
          <Check className="h-3.5 w-3.5 text-secondary" /> Yes
        </>
      ) : (
        <>
          <X className="h-3.5 w-3.5 text-on-surface-variant" /> No
        </>
      )}
    </span>
  )
}

export function StepReview({ watch, onEdit }: StepReviewProps) {
  const formData = watch()

  const photos = formData.photos || []
  const amenities = formData.amenities || []
  const price = Number(formData.price)
  const priceLabel = Number.isFinite(price) ? `$${price.toLocaleString('en-CA')}/mo` : '—'

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-display font-semibold text-on-surface">
          Review your listing
        </h3>
        <p className="text-sm text-on-surface-variant mt-1">
          Nothing is published until you press <strong>Publish Listing</strong> at the bottom of
          this page. Use the Edit links to go back and change anything.
        </p>
      </div>

      <div className="space-y-4">
        <ReviewSection title="Home type" step={STEP_TYPE} onEdit={onEdit}>
          <p className="text-sm text-on-surface">
            {formData.type ? TYPE_LABELS[formData.type]?.label : '—'}
          </p>
        </ReviewSection>

        <ReviewSection title="Location" step={STEP_LOCATION} onEdit={onEdit}>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-on-surface-variant">City:</dt>
            <dd className="text-on-surface">{formData.city || '—'}</dd>
            <dt className="text-on-surface-variant">Province:</dt>
            <dd className="text-on-surface">{formData.province || '—'}</dd>
            <dt className="text-on-surface-variant">Neighbourhood:</dt>
            <dd className="text-on-surface">{formData.address || 'Not provided'}</dd>
            <dt className="text-on-surface-variant">Postal code:</dt>
            <dd className="text-on-surface">{formData.postal_code || 'Not provided'}</dd>
          </dl>
        </ReviewSection>

        <ReviewSection title="Details" step={STEP_DETAILS} onEdit={onEdit}>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-on-surface-variant">Title:</dt>
            <dd className="text-on-surface">{formData.title || '—'}</dd>
            <dt className="text-on-surface-variant">Price:</dt>
            <dd className="text-on-surface">{priceLabel}</dd>
            <dt className="text-on-surface-variant">Utilities:</dt>
            <dd className="text-on-surface">
              {formData.utilities_included ? 'Included' : 'Not included'}
            </dd>
            <dt className="text-on-surface-variant">Available from:</dt>
            <dd className="text-on-surface">{formData.available_date || '—'}</dd>
            <dt className="text-on-surface-variant">Minimum stay:</dt>
            <dd className="text-on-surface">
              {formData.minimum_stay
                ? `${formData.minimum_stay} ${formData.minimum_stay === 1 ? 'month' : 'months'}`
                : '—'}
            </dd>
            <dt className="text-on-surface-variant">Bathroom:</dt>
            <dd className="text-on-surface">
              {BATHROOM_TYPES.find((b) => b.value === formData.bathroom_type)?.label || 'Shared'}
              {formData.bathroom_size && (
                <span className="text-on-surface-variant">
                  {' '}
                  ({BATHROOM_SIZES.find((b) => b.value === formData.bathroom_size)?.label})
                </span>
              )}
            </dd>
          </dl>
          {formData.description && (
            <p className="mt-3 pt-3 ghost-border-t text-sm text-on-surface whitespace-pre-line">
              {formData.description}
            </p>
          )}
        </ReviewSection>

        <ReviewSection title="Amenities" step={STEP_AMENITIES} onEdit={onEdit}>
          {amenities.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {amenities.map((amenity) => (
                <li
                  key={amenity}
                  className="px-2.5 py-1 rounded-full bg-secondary-container text-on-surface text-xs"
                >
                  {amenity}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-on-surface-variant">No amenities selected</p>
          )}
        </ReviewSection>

        <ReviewSection title="Photos" step={STEP_PHOTOS} onEdit={onEdit}>
          <p className="text-sm text-on-surface-variant mb-3">
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
            {photos.length > 0 && ' — the first one is the cover photo'}
          </p>
          {photos.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {photos.slice(0, MAX_THUMBNAILS).map((url, index) => (
                <div
                  key={url}
                  className="relative aspect-square rounded-lg overflow-hidden bg-surface-container-lowest"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- remote Supabase storage URLs are not configured for next/image */}
                  <img
                    src={url}
                    alt={`Listing photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {index === MAX_THUMBNAILS - 1 && photos.length > MAX_THUMBNAILS && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-sm font-medium">
                      +{photos.length - MAX_THUMBNAILS}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-error">
              At least 1 photo is required before you can publish.
            </p>
          )}
        </ReviewSection>

        <ReviewSection title="Preferences" step={STEP_PREFERENCES} onEdit={onEdit}>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-on-surface-variant">Gender:</dt>
            <dd className="text-on-surface capitalize">
              {formData.roommate_gender_preference || 'Any'}
            </dd>
            <dt className="text-on-surface-variant">Age range:</dt>
            <dd className="text-on-surface">
              {formData.roommate_age_min || formData.roommate_age_max
                ? `${formData.roommate_age_min ?? 'Any'} – ${formData.roommate_age_max ?? 'Any'}`
                : 'No preference'}
            </dd>
            <dt className="text-on-surface-variant">Pets allowed:</dt>
            <dd className="text-on-surface">
              <YesNo value={formData.pets_allowed} />
            </dd>
            <dt className="text-on-surface-variant">Smoking allowed:</dt>
            <dd className="text-on-surface">
              <YesNo value={formData.smoking_allowed} />
            </dd>
            <dt className="text-on-surface-variant">Parking included:</dt>
            <dd className="text-on-surface">
              <YesNo value={formData.parking_included} />
            </dd>
            <dt className="text-on-surface-variant">Newcomer friendly:</dt>
            <dd className="text-on-surface">
              <YesNo value={formData.newcomer_friendly} />
            </dd>
            <dt className="text-on-surface-variant">No credit history OK:</dt>
            <dd className="text-on-surface">
              <YesNo value={formData.no_credit_history_ok} />
            </dd>
            <dt className="text-on-surface-variant">Ideal for students:</dt>
            <dd className="text-on-surface">
              <YesNo value={formData.ideal_for_students} />
            </dd>
          </dl>
        </ReviewSection>

        {formData.help_needed && (
          <ReviewSection
            title="Help Exchange"
            step={STEP_DETAILS}
            onEdit={onEdit}
            className="p-4 bg-secondary-container rounded-2xl"
          >
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <dt className="text-on-surface-variant">Tasks requested:</dt>
              <dd className="text-on-surface">
                {formData.help_tasks && formData.help_tasks.length > 0
                  ? formData.help_tasks
                      .map((task) => HELP_TASKS.find((t) => t.value === task)?.label || task)
                      .join(', ')
                  : 'None specified'}
              </dd>
              {formData.help_details && (
                <>
                  <dt className="text-on-surface-variant mt-2">Details:</dt>
                  <dd className="text-on-surface">{formData.help_details}</dd>
                </>
              )}
            </dl>
          </ReviewSection>
        )}
      </div>
    </div>
  )
}

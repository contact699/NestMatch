'use client'

import { UseFormWatch, UseFormSetValue, FieldErrors } from 'react-hook-form'
import { ImageUploader } from '@/components/ui/image-uploader'
import { ListingFormData } from '../types'
import { Camera } from 'lucide-react'

interface StepPhotosProps {
  watch: UseFormWatch<ListingFormData>
  setValue: UseFormSetValue<ListingFormData>
  errors: FieldErrors<ListingFormData>
}

export function StepPhotos({ watch, setValue, errors }: StepPhotosProps) {
  const formData = watch()

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-display font-semibold text-on-surface">
        Add photos of the space
      </h3>
      <p className="text-sm text-on-surface-variant">
        At least one photo is required. You can add up to 10.
      </p>

      <div>
        <ImageUploader
          images={formData.photos || []}
          // Re-validate on change so the "add a photo" error clears as soon as one is added
          onChange={(photos) => setValue('photos', photos, { shouldValidate: true })}
          maxImages={10}
          bucket="listing-photos"
        />
        {errors.photos && (
          <p className="mt-2 text-sm text-error" role="alert">
            {errors.photos.message}
          </p>
        )}
      </div>

      {/* Professional Tip */}
      <div className="p-4 bg-surface-container-low rounded-2xl flex items-start gap-3">
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <Camera className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="font-semibold text-on-surface text-sm">Photo Tips</p>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Photos of the room, common areas, bathroom, and any outdoor spaces help your
            listing stand out. Natural daylight and a tidy space go a long way.
          </p>
        </div>
      </div>
    </div>
  )
}

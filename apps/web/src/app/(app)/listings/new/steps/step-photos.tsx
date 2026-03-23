'use client'

import { UseFormWatch, UseFormSetValue } from 'react-hook-form'
import { ImageUploader } from '@/components/ui/image-uploader'
import { ListingFormData } from '../types'
import { Camera } from 'lucide-react'

interface StepPhotosProps {
  watch: UseFormWatch<ListingFormData>
  setValue: UseFormSetValue<ListingFormData>
}

export function StepPhotos({ watch, setValue }: StepPhotosProps) {
  const formData = watch()

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-display font-semibold text-on-surface">
        Add photos of the space
      </h3>
      <p className="text-sm text-on-surface-variant">
        Photos help attract more interest. You can add up to 10 photos.
      </p>

      <ImageUploader
        images={formData.photos || []}
        onChange={(photos) => setValue('photos', photos)}
        maxImages={10}
        bucket="listing-photos"
      />

      {/* Professional Tip */}
      <div className="p-4 bg-surface-container-low rounded-2xl flex items-start gap-3">
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <Camera className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="font-semibold text-on-surface text-sm">Photo Tips</p>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Include photos of the room, common areas, bathroom, and any outdoor spaces. Listings with 5+ photos get 3x more views.
          </p>
        </div>
      </div>
    </div>
  )
}

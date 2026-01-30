'use client'

import { UseFormWatch, UseFormSetValue } from 'react-hook-form'
import { ImageUploader } from '@/components/ui/image-uploader'
import { ListingFormData } from '../types'

interface StepPhotosProps {
  watch: UseFormWatch<ListingFormData>
  setValue: UseFormSetValue<ListingFormData>
}

export function StepPhotos({ watch, setValue }: StepPhotosProps) {
  const formData = watch()

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        Add photos of the space
      </h3>
      <p className="text-sm text-gray-500">
        Photos help attract more interest. You can add up to 10 photos.
      </p>

      <ImageUploader
        images={formData.photos || []}
        onChange={(photos) => setValue('photos', photos)}
        maxImages={10}
        bucket="listing-photos"
      />

      <p className="text-sm text-gray-500">
        Tip: Include photos of the room, common areas, bathroom, and any outdoor spaces
      </p>
    </div>
  )
}

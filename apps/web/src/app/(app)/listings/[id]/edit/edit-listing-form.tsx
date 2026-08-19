'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/modal'
import { ImageUploader } from '@/components/ui/image-uploader'
import { CANADIAN_PROVINCES, MAJOR_CITIES, AMENITIES } from '@/lib/utils'
import { clientLogger } from '@/lib/client-logger'
import {
  ArrowLeft,
  Loader2,
  Save,
  Trash2,
  AlertCircle,
  DollarSign,
} from 'lucide-react'
import Link from 'next/link'
import { deleteListing } from '@/lib/listing-mutations'

const listingSchema = z.object({
  type: z.enum(['room', 'shared_room', 'entire_place']),
  title: z.string().min(5, 'Title must be at least 5 characters').max(100),
  description: z.string().max(2000).optional().nullable(),
  price: z.number().min(100, 'Price must be at least $100').max(50000),
  utilities_included: z.boolean(),
  available_date: z.string().min(1, 'Available date is required'),
  minimum_stay: z.number().min(1).max(24),
  address: z.string().optional().nullable(),
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province is required'),
  postal_code: z.string().optional().nullable(),
  photos: z.array(z.string()).min(1, 'Add at least 1 photo to keep your listing published.'),
  amenities: z.array(z.string()),
  roommate_gender_preference: z.enum(['male', 'female', 'any']).optional().nullable(),
  roommate_age_min: z.number().min(18).optional().nullable(),
  roommate_age_max: z.number().max(120).optional().nullable(),
  newcomer_friendly: z.boolean(),
  no_credit_history_ok: z.boolean(),
  is_active: z.boolean(),
})

type ListingFormData = z.infer<typeof listingSchema>

export interface EditableListing {
  id: string
  type: 'room' | 'shared_room' | 'entire_place'
  title: string
  description: string | null
  price: number
  utilities_included: boolean
  available_date: string
  minimum_stay: number | null
  address: string | null
  city: string
  province: string
  postal_code: string | null
  photos: string[] | null
  amenities: string[] | null
  roommate_gender_preference: 'male' | 'female' | 'any' | null
  roommate_age_min: number | null
  roommate_age_max: number | null
  newcomer_friendly: boolean
  no_credit_history_ok: boolean
  is_active: boolean
}

export function EditListingForm({ listing }: { listing: EditableListing }) {
  const router = useRouter()
  const listingId = listing.id

  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      type: listing.type,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      utilities_included: listing.utilities_included,
      available_date: listing.available_date,
      minimum_stay: listing.minimum_stay || 1,
      address: listing.address,
      city: listing.city,
      province: listing.province,
      postal_code: listing.postal_code,
      photos: listing.photos || [],
      amenities: listing.amenities || [],
      roommate_gender_preference: listing.roommate_gender_preference,
      roommate_age_min: listing.roommate_age_min,
      roommate_age_max: listing.roommate_age_max,
      newcomer_friendly: listing.newcomer_friendly,
      no_credit_history_ok: listing.no_credit_history_ok,
      is_active: listing.is_active,
    },
  })

  // Subscribe only to the fields that drive rendering. A bare `watch()` would
  // re-render every input, amenity chip and photo thumbnail on each keystroke.
  const isActive = watch('is_active')
  const amenities = watch('amenities')
  const photos = watch('photos')

  const onSubmit = async (data: ListingFormData) => {
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/listings/${listingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update listing')
      }

      router.push(`/listings/${listingId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      await deleteListing(listingId)
      router.push('/my-listings')
    } catch (err) {
      clientLogger.error('Failed to delete listing', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const toggleAmenity = (amenity: string) => {
    const current = amenities || []
    if (current.includes(amenity)) {
      setValue(
        'amenities',
        current.filter((a) => a !== amenity)
      )
    } else {
      setValue('amenities', [...current, amenity])
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href={`/listings/${listingId}`}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to listing
        </Link>
      </div>

      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Edit Listing</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Status toggle */}
            <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Listing Status</p>
                <p className="text-sm text-gray-500">
                  {isActive ? 'Visible to searchers' : 'Hidden from searchers'}
                </p>
              </div>
              <input
                type="checkbox"
                {...register('is_active')}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Listing Type
              </label>
              <select
                {...register('type')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="room">Private Room</option>
                <option value="shared_room">Shared Room</option>
                <option value="entire_place">Entire Place</option>
              </select>
            </div>

            {/* Title */}
            <Input
              {...register('title')}
              label="Listing Title"
              error={errors.title?.message}
            />

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Price and minimum stay */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Rent (CAD)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    {...register('price', { valueAsNumber: true })}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Stay (months)
                </label>
                <select
                  {...register('minimum_stay', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[1, 2, 3, 6, 12, 24].map((months) => (
                    <option key={months} value={months}>
                      {months} {months === 1 ? 'month' : 'months'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Available date and utilities */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Available From
                </label>
                <input
                  type="date"
                  {...register('available_date')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.available_date && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.available_date.message}
                  </p>
                )}
              </div>

              <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 self-end">
                <input
                  type="checkbox"
                  {...register('utilities_included')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Utilities included</span>
              </label>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <select
                  {...register('city')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a city</option>
                  {MAJOR_CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Province
                </label>
                <select
                  {...register('province')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a province</option>
                  {CANADIAN_PROVINCES.map((prov) => (
                    <option key={prov.value} value={prov.value}>
                      {prov.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                {...register('address')}
                label="Street Address (optional)"
              />
              <Input
                {...register('postal_code')}
                label="Postal Code (optional)"
              />
            </div>

            {/* Amenities */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amenities
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AMENITIES.map((amenity) => (
                  <label
                    key={amenity}
                    className={`
                      flex items-center gap-2 p-2 border rounded-lg cursor-pointer text-sm transition-all
                      ${
                        amenities?.includes(amenity)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={amenities?.includes(amenity) ?? false}
                      onChange={() => toggleAmenity(amenity)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Photos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos
              </label>
              <ImageUploader
                images={photos || []}
                onChange={(images) => setValue('photos', images, { shouldValidate: true })}
                maxImages={10}
              />
              {errors.photos && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.photos.message}
                </p>
              )}
            </div>

            {/* Roommate preferences */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Roommate Preferences
              </label>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Gender
                  </label>
                  <select
                    {...register('roommate_gender_preference')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="any">Any gender</option>
                    <option value="male">Male only</option>
                    <option value="female">Female only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Min Age
                  </label>
                  <input
                    type="number"
                    {...register('roommate_age_min', { valueAsNumber: true })}
                    placeholder="18"
                    min={18}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Max Age
                  </label>
                  <input
                    type="number"
                    {...register('roommate_age_max', { valueAsNumber: true })}
                    placeholder="65"
                    max={120}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('newcomer_friendly')}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Newcomer Friendly</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('no_credit_history_ok')}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">No Credit History OK</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>

              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Listing?"
        message="This action cannot be undone. The listing will be permanently removed."
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  )
}

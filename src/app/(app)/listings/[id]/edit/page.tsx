'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/modal'
import { ImageUploader } from '@/components/ui/image-uploader'
import { CANADIAN_PROVINCES, CITIES_BY_PROVINCE, AMENITIES, BATHROOM_TYPES, BATHROOM_SIZES, HELP_TASKS } from '@/lib/utils'
import {
  ArrowLeft,
  Loader2,
  Save,
  Trash2,
  AlertCircle,
  DollarSign,
  Bath,
  HandHeart,
} from 'lucide-react'
import Link from 'next/link'

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
  photos: z.array(z.string()),
  amenities: z.array(z.string()),
  bathroom_type: z.enum(['ensuite', 'private', 'shared']),
  bathroom_size: z.enum(['full', 'three_quarter', 'half']).nullable().optional(),
  roommate_gender_preference: z.enum(['male', 'female', 'any']).optional().nullable(),
  roommate_age_min: z.number().min(18).optional().nullable(),
  roommate_age_max: z.number().max(120).optional().nullable(),
  pets_allowed: z.boolean(),
  smoking_allowed: z.boolean(),
  parking_included: z.boolean(),
  newcomer_friendly: z.boolean(),
  no_credit_history_ok: z.boolean(),
  ideal_for_students: z.boolean(),
  help_needed: z.boolean(),
  help_tasks: z.array(z.string()).optional(),
  help_details: z.string().max(500).optional().nullable(),
  is_active: z.boolean(),
})

type ListingFormData = z.infer<typeof listingSchema>

export default function EditListingPage() {
  const router = useRouter()
  const params = useParams()
  const listingId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
  })

  const formData = watch()

  useEffect(() => {
    async function loadListing() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: listing, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .single() as { data: any; error: any }

      if (error || !listing) {
        setError('Listing not found')
        setIsLoading(false)
        return
      }

      if (listing.user_id !== user.id) {
        router.push('/dashboard')
        return
      }

      reset({
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
        bathroom_type: listing.bathroom_type || 'shared',
        bathroom_size: listing.bathroom_size || null,
        roommate_gender_preference: listing.roommate_gender_preference,
        roommate_age_min: listing.roommate_age_min,
        roommate_age_max: listing.roommate_age_max,
        pets_allowed: listing.pets_allowed ?? false,
        smoking_allowed: listing.smoking_allowed ?? false,
        parking_included: listing.parking_included ?? false,
        newcomer_friendly: listing.newcomer_friendly,
        no_credit_history_ok: listing.no_credit_history_ok,
        ideal_for_students: listing.ideal_for_students ?? false,
        help_needed: listing.help_needed ?? false,
        help_tasks: listing.help_tasks || [],
        help_details: listing.help_details || null,
        is_active: listing.is_active,
      })

      setIsLoading(false)
    }

    loadListing()
  }, [listingId, reset, router])

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
      const response = await fetch(`/api/listings/${listingId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete listing')
      }

      router.push('/my-listings')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const toggleAmenity = (amenity: string) => {
    const current = formData.amenities || []
    if (current.includes(amenity)) {
      setValue('amenities', current.filter((a) => a !== amenity))
    } else {
      setValue('amenities', [...current, amenity])
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
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
                  {formData.is_active ? 'Visible to searchers' : 'Hidden from searchers'}
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
                  Province
                </label>
                <select
                  {...register('province', {
                    onChange: () => {
                      setValue('city', '')
                    },
                  })}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <select
                  {...register('city')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.province}
                >
                  <option value="">{formData.province ? 'Select a city' : 'Select province first'}</option>
                  {(formData.province ? CITIES_BY_PROVINCE[formData.province] || [] : []).map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                {errors.city && (
                  <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  City not listed? Select the closest city in your province.
                </p>
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
                        formData.amenities?.includes(amenity)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={formData.amenities?.includes(amenity)}
                      onChange={() => toggleAmenity(amenity)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Bathroom */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Bath className="h-4 w-4" />
                Bathroom
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bathroom Type
                </label>
                <div className="space-y-2">
                  {BATHROOM_TYPES.map((type) => (
                    <label
                      key={type.value}
                      className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        {...register('bathroom_type')}
                        value={type.value}
                        className="mt-0.5 border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">{type.label}</span>
                        <p className="text-xs text-gray-500">{type.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.bathroom_type && (
                  <p className="mt-1 text-sm text-red-600">{errors.bathroom_type.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bathroom Size (optional)
                </label>
                <select
                  {...register('bathroom_size', { setValueAs: (v) => v === '' ? null : v })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Not specified</option>
                  {BATHROOM_SIZES.map((size) => (
                    <option key={size.value} value={size.value}>
                      {size.label} - {size.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Photos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos
              </label>
              <ImageUploader
                images={formData.photos || []}
                onChange={(images) => setValue('photos', images)}
                maxImages={10}
              />
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
            </div>

            {/* Property Features / Lifestyle */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Property Features
              </label>

              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  {...register('pets_allowed')}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Pets Allowed</p>
                  <p className="text-sm text-gray-500">Tenants can bring pets (dogs, cats, etc.)</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  {...register('smoking_allowed')}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Smoking Allowed</p>
                  <p className="text-sm text-gray-500">Smoking is permitted on the premises</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  {...register('parking_included')}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Parking Included</p>
                  <p className="text-sm text-gray-500">A parking spot is available for tenants</p>
                </div>
              </label>
            </div>

            {/* Special Accommodations */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Special Accommodations
              </label>

              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  {...register('newcomer_friendly')}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Newcomer Friendly</p>
                  <p className="text-sm text-gray-500">Open to newcomers, international students, and those new to Canada</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  {...register('no_credit_history_ok')}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">No Credit History OK</p>
                  <p className="text-sm text-gray-500">Open to tenants without Canadian credit history</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  {...register('ideal_for_students')}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Ideal for Students</p>
                  <p className="text-sm text-gray-500">Best suited for students - close to campus, flexible terms, or student-only preference</p>
                </div>
              </label>
            </div>

            {/* Help Exchange */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <HandHeart className="h-4 w-4" />
                Help Exchange Program
              </div>
              <p className="text-sm text-gray-500">
                Offer reduced rent in exchange for help around the house. Great for seniors or those needing assistance.
              </p>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  {...register('help_needed')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Looking for help with household tasks</span>
                  <p className="text-xs text-gray-500">Rent may be reduced in exchange for assistance</p>
                </div>
              </label>

              {formData.help_needed && (
                <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      What kind of help do you need?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {HELP_TASKS.map((task) => (
                        <label
                          key={task.value}
                          className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-colors ${
                            (formData.help_tasks || []).includes(task.value)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={(formData.help_tasks || []).includes(task.value)}
                            onChange={(e) => {
                              const current = formData.help_tasks || []
                              if (e.target.checked) {
                                setValue('help_tasks', [...current, task.value])
                              } else {
                                setValue('help_tasks', current.filter((t) => t !== task.value))
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{task.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional details (optional)
                    </label>
                    <textarea
                      {...register('help_details')}
                      rows={3}
                      placeholder="Describe the help you need, expected hours per week, rent reduction offered, etc."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                    />
                  </div>
                </div>
              )}
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

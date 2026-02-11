'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, User, Camera, MapPin } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { CANADIAN_PROVINCES, CITIES_BY_PROVINCE, LANGUAGES, HOUSEHOLD_SITUATIONS } from '@/lib/utils'

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  age: z.number().min(18, 'Must be at least 18').max(120).optional().nullable(),
  gender: z.enum(['male', 'female', 'non_binary', 'other', 'prefer_not_to_say']).optional().nullable(),
  occupation: z.string().max(100).optional(),
  phone: z.string().optional(),
  languages: z.array(z.string()).optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  household_situation: z.enum(['alone', 'couple', 'single_parent', 'couple_with_children', 'with_roommate']).optional().nullable(),
  number_of_children: z.number().min(1).max(10).optional().nullable(),
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function ProfileEditPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  })

  const selectedProvince = watch('province')
  const selectedHousehold = watch('household_situation')

  // Get cities for selected province
  const availableCities = selectedProvince ? CITIES_BY_PROVINCE[selectedProvince] || [] : []

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single() as { data: any }

      if (profile) {
        reset({
          name: profile.name || '',
          bio: profile.bio || '',
          age: profile.age,
          gender: profile.gender,
          occupation: profile.occupation || '',
          phone: profile.phone || '',
          languages: profile.languages || [],
          city: profile.city || '',
          province: profile.province || '',
          household_situation: profile.household_situation,
          number_of_children: profile.number_of_children,
        })
        setProfilePhoto(profile.profile_photo)
      }

      setIsLoading(false)
    }

    loadProfile()
  }, [reset, router])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.')
      return
    }

    // Validate file size (max 10MB for profile photos)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 10MB.')
      return
    }

    setIsUploadingPhoto(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('You must be logged in')
      }

      // Generate unique filename
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 8)
      const extension = file.name.split('.').pop() || 'jpg'
      const filename = `${user.id}/profile-${timestamp}-${randomString}.${extension}`

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filename, file, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        throw new Error(uploadError.message || 'Failed to upload file')
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(data.path)

      setProfilePhoto(urlData.publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    setIsSaving(true)
    setError(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('You must be logged in')
      setIsSaving(false)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        name: data.name,
        bio: data.bio || null,
        age: data.age || null,
        gender: data.gender || null,
        occupation: data.occupation || null,
        phone: data.phone || null,
        languages: data.languages || [],
        city: data.city || null,
        province: data.province || null,
        profile_photo: profilePhoto,
        household_situation: data.household_situation || null,
        number_of_children: data.number_of_children || null,
      })
      .eq('user_id', user.id)

    if (error) {
      setError(error.message)
      toast.error('Failed to update profile')
      setIsSaving(false)
      return
    }

    toast.success('Profile updated successfully')
    router.push('/profile')
    router.refresh()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/profile"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to profile
        </Link>
      </div>

      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Profile Photo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Profile Photo
              </label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                    {profilePhoto ? (
                      <img
                        src={profilePhoto}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-12 w-12 text-blue-600" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isUploadingPhoto ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="text-sm text-gray-500">
                  <p>Click the camera icon to upload a photo</p>
                  <p>JPEG, PNG, WebP, GIF up to 10MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
            </div>

            <Input
              {...register('name')}
              label="Full Name"
              placeholder="Your full name"
              error={errors.name?.message}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                {...register('bio')}
                rows={4}
                placeholder="Tell potential roommates about yourself..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              {errors.bio && (
                <p className="mt-1 text-sm text-red-600">{errors.bio.message}</p>
              )}
            </div>

            {/* Location */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <MapPin className="h-4 w-4" />
                Location
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Province
                  </label>
                  <select
                    {...register('province')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select province</option>
                    {CANADIAN_PROVINCES.map((province) => (
                      <option key={province.value} value={province.value}>
                        {province.label}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!selectedProvince}
                  >
                    <option value="">{selectedProvince ? 'Select city' : 'Select province first'}</option>
                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Or type a custom city below
                  </p>
                </div>
              </div>
              <Input
                {...register('city')}
                label="Or enter your city"
                placeholder="Enter your city if not in the list"
              />
            </div>

            {/* Household Situation */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Household Situation (Optional)
                </label>
                <select
                  {...register('household_situation')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Prefer not to say</option>
                  {HOUSEHOLD_SITUATIONS.map((situation) => (
                    <option key={situation.value} value={situation.value}>
                      {situation.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  This helps hosts know who will be moving in
                </p>
              </div>

              {(selectedHousehold === 'single_parent' || selectedHousehold === 'couple_with_children') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Children
                  </label>
                  <input
                    type="number"
                    {...register('number_of_children', {
                      setValueAs: (v) => v === '' ? null : parseInt(v, 10)
                    })}
                    min="1"
                    max="10"
                    placeholder="How many children?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age
                </label>
                <input
                  type="number"
                  {...register('age', {
                    setValueAs: (v) => v === '' ? null : parseInt(v, 10)
                  })}
                  placeholder="Your age"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.age && (
                  <p className="mt-1 text-sm text-red-600">{errors.age.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  {...register('gender')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non_binary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <Input
              {...register('occupation')}
              label="Occupation"
              placeholder="What do you do?"
              error={errors.occupation?.message}
            />

            <Input
              {...register('phone')}
              label="Phone Number"
              placeholder="+1 (555) 000-0000"
              error={errors.phone?.message}
              helperText="Used for verification. Never shared publicly."
            />

            {/* Languages */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Languages You Speak
              </label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {LANGUAGES.map((language) => {
                  const currentLanguages = watch('languages') || []
                  const isSelected = currentLanguages.includes(language)
                  return (
                    <label
                      key={language}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const current = watch('languages') || []
                          if (e.target.checked) {
                            setValue('languages', [...current, language])
                          } else {
                            setValue('languages', current.filter((l: string) => l !== language))
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{language}</span>
                    </label>
                  )
                })}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Select all languages you're comfortable communicating in
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" isLoading={isSaving} className="flex-1">
                Save Changes
              </Button>
              <Link href="/profile" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

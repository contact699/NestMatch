'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Loader2,
  User,
  Camera,
  UserCircle,
  FileText,
  MapPin,
  Home,
  Minus,
  Plus,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  CANADIAN_PROVINCES,
  CITIES_BY_PROVINCE,
  LANGUAGES,
  HOUSEHOLD_SITUATIONS,
} from '@/lib/utils'

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  age: z
    .number()
    .min(18, 'Must be at least 18')
    .max(120)
    .optional()
    .nullable(),
  gender: z
    .enum(['male', 'female', 'non_binary', 'other', 'prefer_not_to_say'])
    .optional()
    .nullable(),
  occupation: z.string().max(100).optional(),
  phone: z.string().optional(),
  languages: z.array(z.string()).optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  household_situation: z
    .enum([
      'alone',
      'couple',
      'single_parent',
      'couple_with_children',
      'with_roommate',
    ])
    .optional()
    .nullable(),
  number_of_children: z.number().min(0).max(10).optional().nullable(),
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
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  })

  const selectedProvince = watch('province')
  const selectedHousehold = watch('household_situation')
  const bioValue = watch('bio') || ''
  const childrenCount = watch('number_of_children') || 0

  // Get cities for selected province
  const availableCities = selectedProvince
    ? CITIES_BY_PROVINCE[selectedProvince] || []
    : []

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

      const { data: profile } = (await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()) as { data: any }

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
          number_of_children: profile.number_of_children || 0,
        })
        setProfilePhoto(profile.profile_photo)
      }

      setIsLoading(false)
    }

    loadProfile()
  }, [reset, router])

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      setError(
        'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'
      )
      return
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 10MB.')
      return
    }

    setIsUploadingPhoto(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('You must be logged in')
      }

      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 8)
      const extension = file.name.split('.').pop() || 'jpg'
      const filename = `${user.id}/profile-${timestamp}-${randomString}.${extension}`

      const { data, error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filename, file, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        throw new Error(uploadError.message || 'Failed to upload file')
      }

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
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    )
  }

  const currentLanguages = watch('languages') || []

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-on-surface">
          Edit Profile
        </h1>
        <p className="text-on-surface-variant mt-2">
          Manage your personal sanctuary and housing preferences.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {error && (
          <div className="p-4 bg-error-container rounded-xl text-error text-sm">
            {error}
          </div>
        )}

        {/* Profile Photo */}
        <Card variant="bordered">
          <CardContent className="py-6">
            <div className="flex items-center gap-5">
              <div className="relative flex-shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-surface-container flex items-center justify-center">
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12 text-on-surface-variant" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="absolute bottom-0 right-0 p-2 bg-secondary text-on-secondary rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div>
                <h3 className="font-display font-semibold text-on-surface">
                  Profile Photo
                </h3>
                <p className="text-sm text-on-surface-variant mt-1">
                  Clear photos help build trust within the NestMatch community.
                  JPG or PNG, max 5MB.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="mt-3 px-4 py-2 text-sm font-medium text-on-surface bg-surface-container-lowest rounded-lg ghost-border hover:bg-surface-container-low transition-colors disabled:opacity-50"
                >
                  Change Photo
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <div>
          <h2 className="text-lg font-display font-semibold text-on-surface flex items-center gap-2 mb-5">
            <UserCircle className="h-5 w-5 text-on-surface-variant" />
            Basic Information
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                {...register('name')}
                label="Full Name"
                placeholder="Your full name"
                error={errors.name?.message}
              />
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Age
                </label>
                <input
                  type="number"
                  {...register('age', {
                    setValueAs: (v) => (v === '' ? null : parseInt(v, 10)),
                  })}
                  placeholder="Your age"
                  className="w-full px-3 py-2 rounded-lg text-on-surface placeholder-on-surface-variant/50 bg-surface-container-low border-0 focus:outline-none focus:ring-2 focus:ring-surface-tint/20 focus:bg-surface-container-lowest"
                />
                {errors.age && (
                  <p className="mt-1 text-sm text-error">
                    {errors.age.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Gender
                </label>
                <select
                  {...register('gender')}
                  className="w-full px-3 py-2 rounded-lg text-on-surface bg-surface-container-low border-0 focus:outline-none focus:ring-2 focus:ring-surface-tint/20 focus:bg-surface-container-lowest appearance-none"
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non_binary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <Input
                {...register('phone')}
                label="Phone"
                placeholder="+1 (555) 012-3456"
                error={errors.phone?.message}
              />

              <Input
                {...register('occupation')}
                label="Occupation"
                placeholder="UI Designer"
                error={errors.occupation?.message}
              />
            </div>
          </div>
        </div>

        {/* About You */}
        <div>
          <h2 className="text-lg font-display font-semibold text-on-surface flex items-center gap-2 mb-5">
            <FileText className="h-5 w-5 text-on-surface-variant" />
            About You
          </h2>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              Bio
            </label>
            <textarea
              {...register('bio')}
              rows={4}
              placeholder="Tell potential roommates about yourself..."
              className="w-full px-4 py-3 rounded-xl text-on-surface placeholder-on-surface-variant/50 bg-surface-container-low border-0 focus:outline-none focus:ring-2 focus:ring-surface-tint/20 focus:bg-surface-container-lowest resize-none"
            />
            <div className="flex justify-end mt-1">
              <span
                className={`text-xs ${
                  bioValue.length > 450
                    ? 'text-error'
                    : 'text-on-surface-variant'
                }`}
              >
                {bioValue.length} / 500 characters
              </span>
            </div>
            {errors.bio && (
              <p className="mt-1 text-sm text-error">{errors.bio.message}</p>
            )}
          </div>
        </div>

        {/* Location & Language */}
        <div className="grid sm:grid-cols-2 gap-6">
          <Card variant="bordered">
            <CardContent className="py-5">
              <h3 className="text-base font-display font-semibold text-on-surface flex items-center gap-2 mb-4">
                <MapPin className="h-4 w-4 text-on-surface-variant" />
                Location & Language
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-1.5">
                    City / Province
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      {...register('province')}
                      className="w-full px-3 py-2 rounded-lg text-on-surface text-sm bg-surface-container-low border-0 focus:outline-none focus:ring-2 focus:ring-surface-tint/20 focus:bg-surface-container-lowest appearance-none"
                    >
                      <option value="">Province</option>
                      {CANADIAN_PROVINCES.map((province) => (
                        <option key={province.value} value={province.value}>
                          {province.label}
                        </option>
                      ))}
                    </select>
                    <select
                      {...register('city')}
                      className="w-full px-3 py-2 rounded-lg text-on-surface text-sm bg-surface-container-low border-0 focus:outline-none focus:ring-2 focus:ring-surface-tint/20 focus:bg-surface-container-lowest appearance-none"
                      disabled={!selectedProvince}
                    >
                      <option value="">
                        {selectedProvince ? 'City' : 'Select province'}
                      </option>
                      {availableCities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-1.5">
                    Languages Spoken
                  </label>
                  {/* Selected language tags */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {currentLanguages.map((lang: string) => (
                      <span
                        key={lang}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-secondary text-xs font-medium"
                      >
                        {lang}
                        <button
                          type="button"
                          onClick={() =>
                            setValue(
                              'languages',
                              currentLanguages.filter(
                                (l: string) => l !== lang
                              )
                            )
                          }
                          className="hover:text-error transition-colors ml-0.5"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                  <select
                    onChange={(e) => {
                      const lang = e.target.value
                      if (lang && !currentLanguages.includes(lang)) {
                        setValue('languages', [...currentLanguages, lang])
                      }
                      e.target.value = ''
                    }}
                    className="w-full px-3 py-2 rounded-lg text-on-surface-variant/50 text-sm bg-surface-container-low border-0 focus:outline-none focus:ring-2 focus:ring-surface-tint/20 focus:bg-surface-container-lowest appearance-none"
                  >
                    <option value="">Add language...</option>
                    {LANGUAGES.filter(
                      (l) => !currentLanguages.includes(l)
                    ).map((language) => (
                      <option key={language} value={language}>
                        {language}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Household Situation */}
          <Card variant="bordered">
            <CardContent className="py-5">
              <h3 className="text-base font-display font-semibold text-on-surface flex items-center gap-2 mb-4">
                <Home className="h-4 w-4 text-on-surface-variant" />
                Household Situation
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-1.5">
                    Current Situation
                  </label>
                  <select
                    {...register('household_situation')}
                    className="w-full px-3 py-2 rounded-lg text-on-surface text-sm bg-surface-container-low border-0 focus:outline-none focus:ring-2 focus:ring-surface-tint/20 focus:bg-surface-container-lowest appearance-none"
                  >
                    <option value="">Prefer not to say</option>
                    {HOUSEHOLD_SITUATIONS.map((situation) => (
                      <option key={situation.value} value={situation.value}>
                        {situation.label}
                      </option>
                    ))}
                  </select>
                </div>

                {(selectedHousehold === 'single_parent' ||
                  selectedHousehold === 'couple_with_children') && (
                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-on-surface-variant uppercase mb-1.5">
                      Children Count
                    </label>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() =>
                          setValue(
                            'number_of_children',
                            Math.max(0, childrenCount - 1)
                          )
                        }
                        className="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="text-xl font-semibold text-on-surface w-8 text-center">
                        {childrenCount}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setValue(
                            'number_of_children',
                            Math.min(10, childrenCount + 1)
                          )
                        }
                        className="w-10 h-10 rounded-full bg-secondary text-on-secondary hover:opacity-90 flex items-center justify-center transition-opacity"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <Link href="/profile">
            <button
              type="button"
              className="px-5 py-2.5 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Discard Changes
            </button>
          </Link>
          <Button type="submit" isLoading={isSaving} variant="primary">
            Save Profile
          </Button>
        </div>
      </form>
    </div>
  )
}

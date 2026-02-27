'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, DollarSign, MapPin, Calendar } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const seekingSchema = z
  .object({
    budget_min: z.number().min(0, 'Minimum budget cannot be negative'),
    budget_max: z.number().min(0, 'Maximum budget cannot be negative'),
    move_in_date: z.string().min(1, 'Move-in date is required'),
    preferred_cities: z.string().min(1, 'At least one preferred city is required'),
    preferred_areas: z.string().optional(),
    description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  })
  .refine((data) => data.budget_min <= data.budget_max, {
    message: 'Minimum budget must be less than or equal to maximum budget',
    path: ['budget_min'],
  })

type SeekingFormData = z.infer<typeof seekingSchema>

export default function SeekingPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SeekingFormData>({
    resolver: zodResolver(seekingSchema),
  })

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
        .from('seeking_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profile) {
        reset({
          budget_min: profile.budget_min,
          budget_max: profile.budget_max,
          move_in_date: profile.move_in_date,
          preferred_cities: Array.isArray(profile.preferred_cities)
            ? profile.preferred_cities.join(', ')
            : '',
          preferred_areas: Array.isArray(profile.preferred_areas)
            ? profile.preferred_areas.join(', ')
            : '',
          description: profile.description || '',
        })
      }

      setIsLoading(false)
    }

    loadProfile()
  }, [reset, router])

  const onSubmit = async (data: SeekingFormData) => {
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

    const citiesArray = data.preferred_cities
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)

    const areasArray = data.preferred_areas
      ? data.preferred_areas
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean)
      : null

    const { error } = await supabase
      .from('seeking_profiles')
      .upsert(
        {
          user_id: user.id,
          budget_min: data.budget_min,
          budget_max: data.budget_max,
          move_in_date: data.move_in_date,
          preferred_cities: citiesArray,
          preferred_areas: areasArray,
          description: data.description || null,
        },
        { onConflict: 'user_id' }
      )

    if (error) {
      setError(error.message)
      toast.error('Failed to save seeking preferences')
      setIsSaving(false)
      return
    }

    toast.success('Seeking preferences saved successfully')
    router.push('/discover')
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
          href="/discover"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to discover
        </Link>
      </div>

      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Seeking Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Budget */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <DollarSign className="h-4 w-4" />
                Budget Range
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  {...register('budget_min', {
                    setValueAs: (v) => (v === '' ? undefined : Number(v)),
                  })}
                  label="Minimum ($)"
                  placeholder="e.g. 500"
                  error={errors.budget_min?.message}
                  required
                />
                <Input
                  type="number"
                  {...register('budget_max', {
                    setValueAs: (v) => (v === '' ? undefined : Number(v)),
                  })}
                  label="Maximum ($)"
                  placeholder="e.g. 1500"
                  error={errors.budget_max?.message}
                  required
                />
              </div>
            </div>

            {/* Move-in Date */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar className="h-4 w-4" />
                Move-in Date
              </div>
              <Input
                type="date"
                {...register('move_in_date')}
                label="Desired move-in date"
                error={errors.move_in_date?.message}
                required
              />
            </div>

            {/* Preferred Cities */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <MapPin className="h-4 w-4" />
                Location Preferences
              </div>
              <Input
                {...register('preferred_cities')}
                label="Preferred Cities"
                placeholder="e.g. Montreal, Toronto, Vancouver"
                error={errors.preferred_cities?.message}
                helperText="Separate multiple cities with commas"
                required
              />
              <Input
                {...register('preferred_areas')}
                label="Preferred Areas (Optional)"
                placeholder="e.g. Downtown, Plateau, Mile End"
                error={errors.preferred_areas?.message}
                helperText="Separate multiple areas with commas"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                {...register('description')}
                rows={4}
                placeholder="Describe what you're looking for in a home..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" isLoading={isSaving} className="flex-1">
                Save Preferences
              </Button>
              <Link href="/discover" className="flex-1">
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

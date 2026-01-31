'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Home,
  MapPin,
  DollarSign,
  Calendar,
  Camera,
  Users,
  Check,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { listingSchema, ListingFormData } from './types'
import {
  StepType,
  StepLocation,
  StepDetails,
  StepAmenities,
  StepPhotos,
  StepPreferences,
  StepReview,
} from './steps'

const STEPS = [
  { id: 1, title: 'Type', icon: Home },
  { id: 2, title: 'Location', icon: MapPin },
  { id: 3, title: 'Details', icon: DollarSign },
  { id: 4, title: 'Amenities', icon: Calendar },
  { id: 5, title: 'Photos', icon: Camera },
  { id: 6, title: 'Preferences', icon: Users },
  { id: 7, title: 'Review', icon: Check },
]

export default function NewListingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      type: 'room',
      utilities_included: false,
      minimum_stay: 1,
      photos: [],
      amenities: [],
      bathroom_type: 'shared',
      newcomer_friendly: false,
      no_credit_history_ok: false,
      help_needed: false,
      help_tasks: [],
    },
  })

  const validateStep = async () => {
    let fieldsToValidate: (keyof ListingFormData)[] = []

    switch (currentStep) {
      case 1:
        fieldsToValidate = ['type']
        break
      case 2:
        fieldsToValidate = ['city', 'province']
        break
      case 3:
        fieldsToValidate = ['title', 'price', 'available_date', 'minimum_stay', 'bathroom_type']
        break
      case 4:
        fieldsToValidate = ['amenities']
        break
      case 5:
        fieldsToValidate = ['photos']
        break
      case 6:
        fieldsToValidate = ['newcomer_friendly', 'no_credit_history_ok']
        break
    }

    const isValid = await trigger(fieldsToValidate)
    return isValid
  }

  const nextStep = async () => {
    const isValid = await validateStep()
    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const onSubmit = async (data: ListingFormData) => {
    console.log('Form submitted with data:', data)
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const text = await response.text()
      console.log('API response:', text)

      let result
      try {
        result = JSON.parse(text)
      } catch {
        throw new Error('Server returned invalid response')
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create listing')
      }

      router.push(`/listings/${result.listing.id}`)
    } catch (err) {
      console.error('Submit error:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsSubmitting(false)
    }
  }

  // Handle validation errors on submit
  const onError = (validationErrors: any) => {
    console.log('Validation errors:', validationErrors)
    const errorMessages = Object.entries(validationErrors)
      .map(([field, error]: [string, any]) => `${field}: ${error.message}`)
      .join(', ')
    setError(`Please fix the following: ${errorMessages}`)
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepType register={register} watch={watch} />
      case 2:
        return <StepLocation register={register} errors={errors} watch={watch} />
      case 3:
        return <StepDetails register={register} errors={errors} watch={watch} setValue={setValue} />
      case 4:
        return <StepAmenities watch={watch} setValue={setValue} />
      case 5:
        return <StepPhotos watch={watch} setValue={setValue} />
      case 6:
        return <StepPreferences register={register} />
      case 7:
        return <StepReview watch={watch} />
      default:
        return null
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to dashboard
        </Link>
      </div>

      <Card variant="bordered">
        <CardHeader>
          <CardTitle>Post a Room</CardTitle>
          <CardDescription>
            Create a listing to find compatible roommates
          </CardDescription>
        </CardHeader>

        {/* Progress indicator */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                    ${
                      currentStep > step.id
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : currentStep === step.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-gray-200 text-gray-400'
                    }
                  `}
                >
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-1 ${
                      currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-600 mt-2">
            Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}
          </p>
        </div>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit, onError)}>
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                {error}
              </div>
            )}

            {renderStep()}

            {/* Navigation buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              {currentStep < STEPS.length ? (
                <Button type="button" onClick={nextStep}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Publish Listing
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

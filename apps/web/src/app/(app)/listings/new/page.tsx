'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { clientLogger } from '@/lib/client-logger'
import { useForm, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
// Card components removed - using sidebar layout instead
import { toast } from 'sonner'
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
  X,
  ShieldCheck,
} from 'lucide-react'
import Link from 'next/link'
import { listingSchema, ListingFormData, WIZARD_STEP } from './types'
import { useFormDraft } from '@/lib/hooks/use-form-draft'
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
  { id: WIZARD_STEP.TYPE, title: 'Type', icon: Home },
  { id: WIZARD_STEP.LOCATION, title: 'Location', icon: MapPin },
  { id: WIZARD_STEP.DETAILS, title: 'Details', icon: DollarSign },
  { id: WIZARD_STEP.AMENITIES, title: 'Amenities', icon: Calendar },
  { id: WIZARD_STEP.PHOTOS, title: 'Photos', icon: Camera },
  { id: WIZARD_STEP.PREFERENCES, title: 'Preferences', icon: Users },
  { id: WIZARD_STEP.REVIEW, title: 'Review', icon: Check },
]

const LISTING_DEFAULTS: Partial<ListingFormData> = {
  type: 'room',
  utilities_included: false,
  minimum_stay: 1,
  photos: [],
  amenities: [],
  bathroom_type: 'shared',
  newcomer_friendly: false,
  no_credit_history_ok: false,
  ideal_for_students: false,
  pets_allowed: false,
  smoking_allowed: false,
  parking_included: false,
  help_needed: false,
  help_tasks: [],
}

export default function NewListingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft, clearDraft] = useFormDraft<Partial<ListingFormData>>(
    'new-listing',
    LISTING_DEFAULTS
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
    defaultValues: draft as ListingFormData,
  })

  // Persist form values to draft on change (using subscription to avoid re-render loops)
  const draftTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    const subscription = watch((values) => {
      if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current)
      draftTimeoutRef.current = setTimeout(() => {
        setDraft(values as Partial<ListingFormData>)
      }, 500)
    })
    return () => {
      subscription.unsubscribe()
      if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current)
    }
  }, [watch, setDraft])

  // Each step is a full screen of its own: land at the top of it, otherwise a step change
  // from the bottom of a long step (e.g. Preferences -> Review) looks like nothing happened
  // except the button label changing to "Publish Listing".
  useEffect(() => {
    setError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentStep])

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
    // Belt-and-braces: publishing is only ever allowed from the final Review step.
    if (currentStep !== STEPS.length) return

    clientLogger.info('Form submitted with data')
    setIsSubmitting(true)
    setError(null)

    try {
      // Clean optional fields that may be empty strings from HTML selects
      const cleanData = {
        ...data,
        bathroom_size: data.bathroom_size || null,
        roommate_gender_preference: data.roommate_gender_preference || undefined,
      }

      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData),
      })

      const text = await response.text()
      clientLogger.info('API response received')

      let result
      try {
        result = JSON.parse(text)
      } catch {
        throw new Error('Server returned invalid response')
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create listing')
      }

      clearDraft()
      toast.success('Listing published successfully!')
      router.push(`/listings/${result.listing.id}`)
    } catch (err) {
      clientLogger.error('Submit error', err)
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
      toast.error(message)
      setIsSubmitting(false)
    }
  }

  // Handle validation errors on submit
  const onError = (validationErrors: FieldErrors<ListingFormData>) => {
    clientLogger.info('Validation errors encountered')
    const errorMessages = Object.entries(validationErrors)
      .map(([field, fieldError]) => {
        const message = (fieldError as { message?: string } | undefined)?.message
        return `${field}: ${message ?? 'is invalid'}`
      })
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
        return <StepPhotos watch={watch} setValue={setValue} errors={errors} />
      case 6:
        return <StepPreferences register={register} />
      case 7:
        return <StepReview watch={watch} onEdit={setCurrentStep} />
      default:
        return null
    }
  }

  const progressPercent = Math.round((currentStep / STEPS.length) * 100)
  const isReviewStep = currentStep === STEPS.length

  return (
    // The wizard lives inside the app shell (sticky 4rem navbar + padded <main>), so it sizes
    // itself to the space left over rather than a full 100vh — a full-height box here forces a
    // scrollbar on every step and pushes the wizard chrome under the translucent navbar.
    <div className="flex min-h-[calc(100vh-7rem)] lg:min-h-[calc(100vh-8rem)]">
      {/* Left panel - Dark navy sidebar */}
      <div className="hidden lg:flex lg:w-[340px] bg-primary text-white flex-col justify-between p-10 flex-shrink-0">
        <div>
          <Link href="/dashboard" className="text-white/70 hover:text-white text-sm font-medium transition-colors">
            NestMatch
          </Link>
          <h1 className="text-4xl font-display font-bold mt-12 leading-tight italic">
            Let&apos;s build<br />your listing.
          </h1>
          <p className="text-white/60 mt-6 text-sm leading-relaxed">
            Our curated matchmaking starts with the basics. Tell us where your sanctuary is located.
          </p>
        </div>

        {/* Trust & safety badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">Built for Trust</p>
            <p className="text-xs text-white/50">Hosts can verify their ID to earn a trust badge.</p>
          </div>
        </div>
      </div>

      {/* Right panel - Form content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar — branding is already provided by the app navbar directly above */}
        <div className="flex items-center justify-between px-6 py-4 lg:px-10">
          <div className="flex-1" />
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Exit
            <X className="h-4 w-4" />
          </Link>
        </div>

        {/* Form area */}
        <div className="flex-1 px-6 lg:px-10 pb-8 max-w-2xl mx-auto w-full">
          {/* Step indicator — docks just below the app navbar (h-16 / z-50) instead of
              scrolling underneath it */}
          <div className="sticky top-16 z-30 bg-background -mx-6 px-6 lg:-mx-10 lg:px-10 pt-4 pb-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-secondary uppercase tracking-wider">
                STEP {currentStep} OF {STEPS.length}
              </p>
              <p className="text-sm text-on-surface-variant">{progressPercent}% Complete</p>
            </div>
            <h2 className="text-2xl font-display font-bold text-on-surface mb-3">
              {STEPS[currentStep - 1].title}
            </h2>
            {/* Progress bar */}
            <div className="h-1 bg-surface-container-low rounded-full overflow-hidden">
              <div
                className="h-full bg-secondary rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <form
            onSubmit={(event) => {
              // Only the Review step may publish — this also swallows implicit (Enter key)
              // submissions from the input fields on the earlier steps.
              if (!isReviewStep) {
                event.preventDefault()
                return
              }
              void handleSubmit(onSubmit, onError)(event)
            }}
          >
            {error && (
              <div className="mb-6 p-4 bg-error-container rounded-xl flex items-center gap-2 text-error">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                {error}
              </div>
            )}

            {renderStep()}

            {/* Navigation buttons */}
            <div className="flex justify-between mt-8 pt-6 ghost-border-t">
              <button
                type="button"
                onClick={currentStep === 1 ? () => router.push('/dashboard') : prevStep}
                className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                {currentStep === 1 ? 'Cancel' : 'Back'}
              </button>

              {!isReviewStep ? (
                <Button type="button" onClick={nextStep} size="lg">
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting} size="lg">
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
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  ArrowRight,
  Scale,
  FileText,
  DollarSign,
  Moon,
  Sparkles,
  Check,
  Download,
  Accessibility,
  X,
  Shield,
  BookOpen,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LegalDisclaimer } from '@/components/resources'
import { PROVINCES } from '@/components/resources'
import { agreementSchema, AgreementFormData, defaultValues } from './types'
import { useFormDraft } from '@/lib/hooks/use-form-draft'
import {
  StepBasics,
  StepFinancial,
  StepLifestyle,
  StepResponsibilities,
  StepAccommodations,
  StepReview,
  StepDownload,
} from './steps'

const STEPS = [
  { id: 1, title: 'Basics', shortTitle: 'BASICS', icon: FileText, description: 'Names and address' },
  { id: 2, title: 'Financials', shortTitle: 'FINANCIALS', icon: DollarSign, description: 'Rent and utilities' },
  { id: 3, title: 'House Rules', shortTitle: 'HOUSE RULES', icon: Moon, description: 'Lifestyle rules' },
  { id: 4, title: 'Responsibilities', shortTitle: 'RESPONSIBILITIES', icon: Sparkles, description: 'Cleaning and supplies' },
  { id: 5, title: 'Accommodations', shortTitle: 'ACCOMMODATIONS', icon: Accessibility, description: 'Parking & accessibility' },
  { id: 6, title: 'Review', shortTitle: 'REVIEW', icon: Check, description: 'Check details' },
  { id: 7, title: 'Download', shortTitle: 'DOWNLOAD', icon: Download, description: 'Get your agreement' },
]

const formatTime = (time: string | undefined) => {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function generateClausesFromFormData(data: AgreementFormData): { title: string; content: string }[] {
  const clauses: { title: string; content: string }[] = []
  const roommates = data.roommateNames.filter(Boolean)

  // Financial Terms
  const rentContent = data.rentSplitMethod === 'equal'
    ? `Total Monthly Rent: $${data.totalRent.toLocaleString()}. Rent will be split equally among all roommates ($${Math.round(data.totalRent / roommates.length).toLocaleString()} per person). Payment is due on the ${ordinal(data.rentDueDate)} of each month via ${data.paymentMethod.replace('_', ' ')}.`
    : `Total Monthly Rent: $${data.totalRent.toLocaleString()}. Rent splits: ${data.rentSplits.map(split => `${split.name}: $${split.amount.toLocaleString()}`).join(', ')}. Payment is due on the ${ordinal(data.rentDueDate)} of each month via ${data.paymentMethod.replace('_', ' ')}.`

  clauses.push({
    title: 'Rent and Payment',
    content: rentContent,
  })

  // Utilities
  if (!data.utilitiesIncluded) {
    const utilitiesContent = data.utilitiesSplit === 'equal'
      ? 'Utilities are not included in rent and will be split equally among all roommates.'
      : data.utilitiesSplit === 'usage'
      ? 'Utilities are not included in rent and will be divided based on individual usage where measurable.'
      : 'Utilities are not included in rent and will be paid on a rotating basis each month.'
    clauses.push({
      title: 'Utilities',
      content: utilitiesContent,
    })
  }

  // Quiet Hours
  if (data.quietHoursStart && data.quietHoursEnd) {
    clauses.push({
      title: 'Quiet Hours',
      content: `Quiet hours are from ${formatTime(data.quietHoursStart)} to ${formatTime(data.quietHoursEnd)}. During these hours, all roommates agree to keep noise to a minimum.`,
    })
  }

  // Guest Policy
  const guestContent = {
    notify: 'Roommates should notify each other when having guests over, especially for extended visits.',
    limit: `Overnight guests are limited to ${data.overnightGuestLimit || 3} nights per week per roommate. Guests staying longer should be discussed with all roommates.`,
    approval: 'Overnight guests require advance notice and approval from other roommates.',
    flexible: 'No specific guest restrictions are in place. Roommates agree to be considerate and communicate when hosting guests.',
  }[data.guestPolicy]

  clauses.push({
    title: 'Guest Policy',
    content: guestContent,
  })

  // Smoking Policy
  const smokingContent = {
    no_smoking: 'Smoking is not permitted anywhere on the premises.',
    outside_only: 'Smoking is only permitted outside the unit, at least 3 meters from windows and doors.',
    designated_area: 'Smoking is only permitted in designated areas agreed upon by all roommates.',
  }[data.smokingPolicy]

  clauses.push({
    title: 'Smoking Policy',
    content: smokingContent,
  })

  // Cannabis Policy (only if different from smoking)
  if (data.cannabisPolicy !== 'same_as_smoking') {
    const cannabisContent = {
      no_cannabis: 'Cannabis use is not permitted on the premises.',
      outside_only: 'Cannabis use is only permitted outside the unit.',
      designated_area: 'Cannabis use is only permitted in designated areas agreed upon by all roommates.',
      same_as_smoking: '',
    }[data.cannabisPolicy]

    if (cannabisContent) {
      clauses.push({
        title: 'Cannabis Policy',
        content: cannabisContent,
      })
    }
  }

  // Pets
  clauses.push({
    title: 'Pet Policy',
    content: data.petsAllowed
      ? `Pets are allowed in this residence.${data.petDetails ? ` Details: ${data.petDetails}` : ''} Pet owners are responsible for their pets' behavior, cleaning, and any damage caused.`
      : 'No pets are allowed in this residence without the written consent of all roommates.',
  })

  // Cleaning
  const cleaningContent = {
    rotating: 'Cleaning duties will rotate weekly among all roommates. A schedule will be posted in a common area.',
    assigned: 'Each roommate is responsible for specific cleaning areas as agreed upon.',
    as_needed: 'Roommates will clean common areas as needed, with the expectation that everyone contributes fairly.',
    hired: 'Professional cleaning services will be hired and the cost split equally among all roommates.',
  }[data.cleaningSchedule]

  clauses.push({
    title: 'Cleaning Responsibilities',
    content: cleaningContent,
  })

  // Shared Supplies
  const suppliesContent = {
    split: 'Costs for shared household supplies (toilet paper, cleaning products, etc.) will be split equally. Roommates agree to track these expenses and settle monthly.',
    rotate: 'Roommates will take turns purchasing shared household supplies on a rotating basis.',
    individual: 'Each roommate is responsible for purchasing their own supplies. Any shared items must be agreed upon separately.',
  }[data.sharedSuppliesApproach]

  clauses.push({
    title: 'Shared Supplies',
    content: suppliesContent,
  })

  // Parking
  if (data.parkingIncluded) {
    let parkingContent = `Parking is included with this property.`
    if (data.parkingSpots && data.parkingSpots > 0) {
      parkingContent += ` There are ${data.parkingSpots} parking spot${data.parkingSpots > 1 ? 's' : ''} available.`
    }
    if (data.parkingMonthlyCost && data.parkingMonthlyCost > 0) {
      parkingContent += ` Parking costs $${data.parkingMonthlyCost.toLocaleString()} per month.`
    }
    if (data.parkingAssignments && data.parkingAssignments.length > 0) {
      const assignedSpots = data.parkingAssignments.filter(a => a.roommate)
      if (assignedSpots.length > 0) {
        parkingContent += ` Spot assignments: ${assignedSpots.map(a => `${a.spotNumber} - ${a.roommate}`).join(', ')}.`
      }
    }
    if (data.parkingRotation) {
      parkingContent += ` Parking spots will rotate among roommates periodically.`
    }
    const visitorPolicyText = {
      available: 'Visitor parking is available on-site.',
      limited: 'Visitor parking is limited - please notify roommates in advance.',
      none: 'No visitor parking is available on the premises.',
      street_only: 'Visitors must park on the street.',
    }[data.visitorParkingPolicy || 'available']
    parkingContent += ` ${visitorPolicyText}`
    if (data.parkingHoursRestriction && data.parkingHoursDetails) {
      parkingContent += ` Parking hours restriction: ${data.parkingHoursDetails}.`
    }
    const snowRemovalText = {
      landlord: 'Snow removal is handled by the landlord.',
      tenants_rotate: 'Tenants will take turns clearing snow from the parking area.',
      tenants_own_spot: 'Each tenant is responsible for clearing snow from their own parking spot.',
      not_applicable: '',
    }[data.parkingSnowRemoval || 'not_applicable']
    if (snowRemovalText) {
      parkingContent += ` ${snowRemovalText}`
    }
    if (data.parkingEvCharging) {
      parkingContent += ` EV charging is available on premises.`
      if (data.parkingEvDetails) {
        parkingContent += ` ${data.parkingEvDetails}.`
      }
    }
    if (data.parkingTowingPolicy) {
      parkingContent += ` Unauthorized vehicles parked in assigned spots may be towed at the vehicle owner's expense.`
    }
    if (data.vehicleRestrictions) {
      parkingContent += ` Vehicle restrictions: ${data.vehicleRestrictions}`
    }

    clauses.push({
      title: 'Parking',
      content: parkingContent,
    })
  }

  // Accessibility & Care Needs
  const accessibilityNeeds: string[] = []
  if (data.accessibilityWheelchair) accessibilityNeeds.push('wheelchair accessible entrance')
  if (data.accessibilityMobilityStorage) accessibilityNeeds.push('mobility aid storage')
  if (data.accessibilityServiceAnimal) accessibilityNeeds.push('service animal accommodation')

  const careNeeds: string[] = []
  if (data.careScheduledVisits) careNeeds.push('scheduled support worker visits')
  if (data.careQuietHoursMedical) careNeeds.push('quiet hours for medical needs')
  if (data.careAccessibilityMods) careNeeds.push('specific accessibility modifications')

  if (accessibilityNeeds.length > 0 || careNeeds.length > 0) {
    let accessContent = 'The following accessibility and care accommodations are agreed upon by all roommates:'
    if (accessibilityNeeds.length > 0) {
      accessContent += ` Accessibility needs include: ${accessibilityNeeds.join(', ')}.`
    }
    if (careNeeds.length > 0) {
      accessContent += ` Care/support needs include: ${careNeeds.join(', ')}.`
    }
    if (data.careAdditionalDetails) {
      accessContent += ` Additional details: ${data.careAdditionalDetails}`
    }
    accessContent += ' All roommates agree to respect and accommodate these needs.'

    clauses.push({
      title: 'Accessibility & Care Accommodations',
      content: accessContent,
    })
  }

  // Assistance Required
  if (data.helpExchangeEnabled) {
    const helpTasks = data.helpExchangeTasks || []
    const compensationLabels: Record<string, string> = {
      reduced_rent: 'reduced rent',
      free_rent: 'free rent',
      utilities_covered: 'utilities covered',
      other: 'an alternative arrangement',
    }
    let helpContent = `An assistance required arrangement is in place.`
    if (data.helpExchangeProvider) {
      helpContent += ` ${data.helpExchangeProvider} will provide assistance`
    }
    if (helpTasks.length > 0) {
      helpContent += ` including: ${helpTasks.join(', ')}`
    }
    helpContent += '.'
    if (data.helpExchangeCompensation) {
      helpContent += ` In exchange, the assisting roommate receives ${compensationLabels[data.helpExchangeCompensation] || data.helpExchangeCompensation}.`
    }
    if (data.helpExchangeHoursPerWeek && data.helpExchangeHoursPerWeek > 0) {
      helpContent += ` The expected commitment is approximately ${data.helpExchangeHoursPerWeek} hours per week.`
    }
    if (data.helpExchangeSchedule) {
      helpContent += ` Schedule: ${data.helpExchangeSchedule}.`
    }
    if (data.helpExchangeTrialPeriod && data.helpExchangeTrialPeriod > 0) {
      helpContent += ` A trial period of ${data.helpExchangeTrialPeriod} days is agreed upon to evaluate if the arrangement works for both parties.`
    }
    if (data.helpExchangeDetails) {
      helpContent += ` Details: ${data.helpExchangeDetails}`
    }
    helpContent += ' Both parties agree to discuss and renegotiate terms if circumstances change.'

    clauses.push({
      title: 'Assistance Required',
      content: helpContent,
    })
  }

  // Notice to Leave
  clauses.push({
    title: 'Notice to Leave',
    content: `Any roommate wishing to leave must provide at least ${data.noticeToLeave} days written notice to all other roommates.`,
  })

  // Dispute Resolution
  const disputeContent = {
    direct: 'Disputes should first be addressed through direct, respectful conversation between the parties involved.',
    written: 'Disputes should be communicated in writing to allow all parties time to consider responses.',
    mediation: 'If direct resolution fails, roommates agree to seek third-party mediation before taking further action.',
  }[data.disputeResolution]

  clauses.push({
    title: 'Dispute Resolution',
    content: disputeContent,
  })

  return clauses
}

export default function AgreementGeneratorPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [draft, setDraft, clearDraft] = useFormDraft<Partial<AgreementFormData>>(
    'agreement-generator',
    defaultValues as AgreementFormData
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
    trigger,
  } = useForm<AgreementFormData>({
    resolver: zodResolver(agreementSchema),
    defaultValues: draft as AgreementFormData,
    mode: 'onBlur',
  })

  const province = watch('province')
  const provinceName = PROVINCES.find(p => p.code === province)?.name || province

  // Persist form values to draft on change (subscription-based to avoid infinite re-render)
  const draftTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    const subscription = watch((values) => {
      if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current)
      draftTimeoutRef.current = setTimeout(() => {
        setDraft(values as Partial<AgreementFormData>)
      }, 500)
    })
    return () => {
      subscription.unsubscribe()
      if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current)
    }
  }, [watch, setDraft])

  const validateStep = async () => {
    let fieldsToValidate: (keyof AgreementFormData)[] = []

    switch (currentStep) {
      case 1:
        fieldsToValidate = ['province', 'address', 'moveInDate', 'roommateNames']
        break
      case 2:
        fieldsToValidate = ['totalRent', 'rentDueDate', 'paymentMethod']
        break
      case 3:
        fieldsToValidate = ['guestPolicy', 'smokingPolicy', 'cannabisPolicy']
        break
      case 4:
        fieldsToValidate = ['cleaningSchedule', 'sharedSuppliesApproach']
        break
      case 5:
        fieldsToValidate = ['parkingIncluded', 'accessibilityWheelchair', 'accessibilityMobilityStorage', 'accessibilityServiceAnimal', 'careScheduledVisits', 'careQuietHoursMedical', 'careAccessibilityMods', 'helpExchangeEnabled']
        break
      case 6:
        fieldsToValidate = ['noticeToLeave', 'disputeResolution', 'agreementDuration']
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

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepBasics register={register} watch={watch} setValue={setValue} errors={errors} />
      case 2:
        return <StepFinancial register={register} watch={watch} setValue={setValue} errors={errors} />
      case 3:
        return <StepLifestyle register={register} watch={watch} setValue={setValue} errors={errors} />
      case 4:
        return <StepResponsibilities register={register} watch={watch} setValue={setValue} errors={errors} />
      case 5:
        return <StepAccommodations register={register} watch={watch} setValue={setValue} errors={errors} />
      case 6:
        return <StepReview watch={watch} />
      case 7:
        const formData = watch()
        const pdfProvinceName = {
          ON: 'Ontario',
          BC: 'British Columbia',
          QC: 'Quebec',
          AB: 'Alberta',
        }[formData.province] || formData.province

        // Transform form data to PDF-compatible format
        const pdfData = {
          title: `Roommate Agreement - ${formData.address.split(',')[0] || formData.address}`,
          address: formData.address,
          province: pdfProvinceName,
          moveInDate: new Date(formData.moveInDate).toLocaleDateString('en-CA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          roommates: formData.roommateNames.filter(Boolean),
          clauses: generateClausesFromFormData(formData),
        }
        return <StepDownload data={pdfData} onBack={prevStep} />
      default:
        return null
    }
  }

  // Tab navigation for steps 1-4 + review
  const tabSteps = STEPS.slice(0, 4).concat(STEPS[5]) // BASICS, FINANCIALS, HOUSE RULES, RESPONSIBILITIES, REVIEW

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/resources"
          className="inline-flex items-center text-sm text-on-surface-variant hover:text-on-surface"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Resources
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-on-surface">
            Create Agreement
          </h1>
          <p className="text-on-surface-variant mt-1">
            Step {currentStep}: {STEPS[currentStep - 1].title}
          </p>
        </div>
        {province && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-secondary-container text-secondary rounded-full">
            <Shield className="h-4 w-4" />
            Legally Vetted for {provinceName}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
          <div
            className="h-full bg-secondary transition-all duration-300"
            style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Tab navigation */}
      {currentStep <= 6 && (
        <div className="flex items-center gap-0 mb-6 overflow-x-auto pb-2">
          {['BASICS', 'FINANCIALS', 'HOUSE RULES', 'REVIEW'].map((tab, idx) => {
            const stepNum = idx === 3 ? 6 : idx + 1
            const isActive = currentStep === stepNum
            const isPast = currentStep > stepNum
            return (
              <button
                key={tab}
                onClick={() => {
                  if (isPast || isActive) setCurrentStep(stepNum)
                }}
                className={`
                  px-4 py-2 text-xs font-semibold tracking-widest whitespace-nowrap transition-colors
                  ${isActive
                    ? 'text-secondary border-b-2 border-secondary'
                    : isPast
                    ? 'text-on-surface-variant hover:text-on-surface'
                    : 'text-on-surface-variant/50'}
                `}
              >
                {tab}
              </button>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          <div className="bg-surface-container-lowest ghost-border rounded-xl p-6">
            {currentStep === 1 && (
              <div className="mb-6">
                <LegalDisclaimer variant="banner" />
              </div>
            )}

            {renderStep()}

            {/* Navigation buttons */}
            {currentStep < 7 && (
              <div className="flex justify-between mt-8 pt-6 ghost-border-t">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="text-sm text-on-surface-variant hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Save as Draft
                </button>

                <Button type="button" onClick={nextStep}>
                  {currentStep === 6 ? (
                    <>
                      Generate Agreement
                      <Download className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Continue to {STEPS[currentStep]?.title || 'Next'}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {currentStep === 7 && (
              <div className="flex justify-between mt-8 pt-6 ghost-border-t">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(6)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Edit Agreement
                </Button>
                <Link href="/resources" onClick={() => clearDraft()}>
                  <Button>
                    <Check className="h-4 w-4 mr-2" />
                    Done
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Legal Insights card */}
          {currentStep <= 2 && (
            <div className="bg-secondary-container rounded-xl p-5">
              <h3 className="font-display font-semibold text-on-surface mb-2 flex items-center gap-2">
                <Scale className="h-4 w-4 text-secondary" />
                Legal Insights
              </h3>
              <p className="text-sm text-on-surface-variant mb-3">
                In most jurisdictions, a written roommate agreement is a legally binding contract that protects your security deposit and clarifies utility sharing.
              </p>
              <ul className="space-y-2 text-sm text-on-surface-variant">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-secondary flex-shrink-0 mt-0.5" />
                  Prevents disputes over common area usage.
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-secondary flex-shrink-0 mt-0.5" />
                  Establishes &ldquo;joint and several liability.&rdquo;
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-secondary flex-shrink-0 mt-0.5" />
                  Safeguards your credit score.
                </li>
              </ul>
            </div>
          )}

          {/* NEED HELP? card - REMOVED "Live Concierge", replaced with View Example + Help Center */}
          <div className="bg-surface-container-lowest ghost-border rounded-xl p-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
              Need Help?
            </h3>
            <div className="space-y-3">
              <Link
                href="/resources/guides?category=legal"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-container transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-4 w-4 text-on-surface-variant" />
                </div>
                <div>
                  <p className="text-sm font-medium text-on-surface">View Example</p>
                  <p className="text-xs text-on-surface-variant">Standard 2-bedroom agreement</p>
                </div>
              </Link>
              <Link
                href="/resources/faq"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-container transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="h-4 w-4 text-on-surface-variant" />
                </div>
                <div>
                  <p className="text-sm font-medium text-on-surface">Help Center</p>
                  <p className="text-xs text-on-surface-variant">Browse FAQs and guides</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

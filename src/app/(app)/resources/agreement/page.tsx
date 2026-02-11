'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LegalDisclaimer } from '@/components/resources'
import { agreementSchema, AgreementFormData, defaultValues } from './types'
import {
  StepBasics,
  StepFinancial,
  StepLifestyle,
  StepResponsibilities,
  StepAccommodations,
  StepReview,
  StepDownload,
} from './steps'
import { generateAgreementContent } from './generate-content'

const STEPS = [
  { id: 1, title: 'Basics', icon: FileText, description: 'Names and address' },
  { id: 2, title: 'Financial', icon: DollarSign, description: 'Rent and utilities' },
  { id: 3, title: 'Lifestyle', icon: Moon, description: 'House rules' },
  { id: 4, title: 'Responsibilities', icon: Sparkles, description: 'Cleaning and supplies' },
  { id: 5, title: 'Accommodations', icon: Accessibility, description: 'Parking & accessibility' },
  { id: 6, title: 'Review', icon: Check, description: 'Check details' },
  { id: 7, title: 'Download', icon: Download, description: 'Get your agreement' },
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

  // Help/Assistance Exchange
  if (data.helpExchangeEnabled) {
    const helpTasks = data.helpExchangeTasks || []
    const compensationLabels: Record<string, string> = {
      reduced_rent: 'reduced rent',
      free_rent: 'free rent',
      utilities_covered: 'utilities covered',
      other: 'an alternative arrangement',
    }
    let helpContent = `A help/assistance exchange arrangement is in place.`
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
      title: 'Help/Assistance Exchange',
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
  const [generatedContent, setGeneratedContent] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm<AgreementFormData>({
    resolver: zodResolver(agreementSchema),
    defaultValues: defaultValues as AgreementFormData,
    mode: 'onBlur',
  })

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
      if (currentStep === 6) {
        // Generate content before moving to download
        const formData = watch()
        const content = generateAgreementContent(formData)
        setGeneratedContent(content)
      }
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
        const provinceName = {
          ON: 'Ontario',
          BC: 'British Columbia',
          QC: 'Quebec',
          AB: 'Alberta',
        }[formData.province] || formData.province

        // Transform form data to PDF-compatible format
        const pdfData = {
          title: `Roommate Agreement - ${formData.address.split(',')[0] || formData.address}`,
          address: formData.address,
          province: provinceName,
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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/resources"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Resources
        </Link>
      </div>

      <Card variant="bordered">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Scale className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle>Roommate Agreement Generator</CardTitle>
              <CardDescription>
                Create a customized agreement for your living situation
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {/* Progress indicator */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between overflow-x-auto pb-2">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                      ${currentStep > step.id
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : currentStep === step.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-gray-200 text-gray-400'}
                    `}
                  >
                    {currentStep > step.id ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className="text-xs text-gray-500 mt-1 hidden sm:block">{step.title}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-8 sm:w-12 h-0.5 mx-1 ${
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
          {currentStep === 1 && (
            <div className="mb-6">
              <LegalDisclaimer variant="banner" />
            </div>
          )}

          {renderStep()}

          {/* Navigation buttons */}
          {currentStep < 7 && (
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

              <Button type="button" onClick={nextStep}>
                {currentStep === 6 ? (
                  <>
                    Generate Agreement
                    <Download className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}

          {currentStep === 7 && (
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(6)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Edit Agreement
              </Button>
              <Link href="/resources">
                <Button>
                  <Check className="h-4 w-4 mr-2" />
                  Done
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

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
  StepReview,
  StepDownload,
} from './steps'
import { generateAgreementContent } from './generate-content'

const STEPS = [
  { id: 1, title: 'Basics', icon: FileText, description: 'Names and address' },
  { id: 2, title: 'Financial', icon: DollarSign, description: 'Rent and utilities' },
  { id: 3, title: 'Lifestyle', icon: Moon, description: 'House rules' },
  { id: 4, title: 'Responsibilities', icon: Sparkles, description: 'Cleaning and supplies' },
  { id: 5, title: 'Review', icon: Check, description: 'Check details' },
  { id: 6, title: 'Download', icon: Download, description: 'Get your agreement' },
]

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
        fieldsToValidate = ['noticeToLeave', 'disputeResolution', 'agreementDuration']
        break
    }

    const isValid = await trigger(fieldsToValidate)
    return isValid
  }

  const nextStep = async () => {
    const isValid = await validateStep()
    if (isValid && currentStep < STEPS.length) {
      if (currentStep === 5) {
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
        return <StepReview watch={watch} />
      case 6:
        return <StepDownload formData={watch()} generatedContent={generatedContent} />
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
          {currentStep < 6 && (
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
                {currentStep === 5 ? (
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

          {currentStep === 6 && (
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => setCurrentStep(5)}>
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

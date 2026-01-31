'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'

interface QuizQuestion {
  id: string
  question: string
  description?: string
  options: { value: string; label: string; description?: string }[]
}

const quizQuestions: QuizQuestion[] = [
  {
    id: 'work_schedule',
    question: 'What is your typical schedule?',
    options: [
      { value: 'nine_to_five', label: '9-5 Office', description: 'Regular business hours' },
      { value: 'shift_work', label: 'Shift Work', description: 'Rotating or irregular hours' },
      { value: 'remote', label: 'Remote/WFH', description: 'Work from home most days' },
      { value: 'flexible', label: 'Flexible', description: 'Varies day to day' },
      { value: 'student', label: 'Student', description: 'Class schedule varies' },
      { value: 'retired', label: 'Retired', description: 'No fixed work schedule' },
      { value: 'not_working', label: 'Not Currently Working', description: 'Home most of the day' },
      { value: 'job_seeking', label: 'Job Seeking', description: 'Schedule may change soon' },
    ],
  },
  {
    id: 'sleep_schedule',
    question: 'What is your sleep schedule like?',
    options: [
      { value: 'early_bird', label: 'Early Bird', description: 'In bed by 10pm, up early' },
      { value: 'night_owl', label: 'Night Owl', description: 'Stay up late, sleep in' },
      { value: 'flexible', label: 'Flexible', description: 'Adapts to circumstances' },
    ],
  },
  {
    id: 'noise_tolerance',
    question: 'How do you feel about noise in shared spaces?',
    options: [
      { value: 'quiet', label: 'Quiet Please', description: 'I prefer a peaceful environment' },
      { value: 'moderate', label: 'Moderate', description: 'Some noise is fine' },
      { value: 'loud_ok', label: 'Noise Friendly', description: 'Music and activity are welcome' },
    ],
  },
  {
    id: 'cleanliness_level',
    question: 'How would you describe your cleanliness standards?',
    options: [
      { value: 'spotless', label: 'Spotless', description: 'Everything in its place, always clean' },
      { value: 'tidy', label: 'Tidy', description: 'Generally clean, occasional mess OK' },
      { value: 'relaxed', label: 'Relaxed', description: 'Lived-in look is fine' },
      { value: 'messy', label: 'Flexible', description: 'Cleaning when needed' },
    ],
  },
  {
    id: 'guest_frequency',
    question: 'How often do you have guests over?',
    options: [
      { value: 'never', label: 'Rarely/Never', description: 'I keep to myself' },
      { value: 'rarely', label: 'Occasionally', description: 'A few times a month' },
      { value: 'sometimes', label: 'Regularly', description: 'Weekly visitors' },
      { value: 'often', label: 'Frequently', description: 'Very social, often have people over' },
    ],
  },
  {
    id: 'overnight_guests',
    question: 'How do you feel about overnight guests?',
    options: [
      { value: 'never', label: 'Prefer None', description: 'Not comfortable with overnight guests' },
      { value: 'rarely', label: 'Occasionally OK', description: 'With advance notice' },
      { value: 'sometimes', label: 'Generally Fine', description: 'Partners/friends welcome' },
      { value: 'often', label: 'Totally Fine', description: 'No restrictions needed' },
    ],
  },
  {
    id: 'smoking',
    question: 'What is your stance on smoking?',
    options: [
      { value: 'never', label: 'No Smoking', description: 'Non-smoker, prefer smoke-free home' },
      { value: 'outside_only', label: 'Outside Only', description: 'OK if done outside' },
      { value: 'yes', label: 'Smoker', description: 'I smoke or am fine with smoking' },
    ],
  },
  {
    id: 'cannabis',
    question: 'How about cannabis use?',
    options: [
      { value: 'never', label: 'No Cannabis', description: 'Prefer cannabis-free home' },
      { value: 'outside_only', label: 'Outside/Edibles', description: 'Not inside the home' },
      { value: 'yes', label: 'Cannabis Friendly', description: 'Comfortable with cannabis use' },
    ],
  },
  {
    id: 'pets_preference',
    question: 'What are your pet preferences?',
    options: [
      { value: 'no_pets', label: 'No Pets', description: 'Prefer pet-free environment' },
      { value: 'cats_ok', label: 'Cats OK', description: 'Cats are welcome' },
      { value: 'dogs_ok', label: 'Dogs OK', description: 'Dogs are welcome' },
      { value: 'all_pets_ok', label: 'Pet Lover', description: 'All pets welcome' },
      { value: 'have_pets', label: 'I Have Pets', description: 'Looking for pet-friendly roommate' },
    ],
  },
  {
    id: 'communication_style',
    question: 'How do you prefer to communicate about household matters?',
    options: [
      { value: 'minimal', label: 'Minimal', description: 'Keep to ourselves mostly' },
      { value: 'occasional', label: 'As Needed', description: 'Check in when necessary' },
      { value: 'frequent', label: 'Regular', description: 'Weekly house meetings/chats' },
      { value: 'very_social', label: 'Very Social', description: 'Daily interaction, close friends' },
    ],
  },
  {
    id: 'remote_work_frequency',
    question: 'How often do you work from home?',
    options: [
      { value: 'never', label: 'Never', description: 'Always out of the house' },
      { value: 'sometimes', label: 'Sometimes', description: '1-2 days a week' },
      { value: 'mostly', label: 'Mostly', description: '3-4 days a week' },
      { value: 'always', label: 'Always', description: 'Full-time remote' },
    ],
  },
  {
    id: 'temperature_preference',
    question: 'What temperature do you prefer at home?',
    options: [
      { value: 'cold', label: 'Cool', description: 'Keep it cool, open windows' },
      { value: 'moderate', label: 'Moderate', description: 'Average temperature' },
      { value: 'warm', label: 'Warm', description: 'Keep it cozy and warm' },
    ],
  },
]

export default function QuizPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadExistingResponses() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('lifestyle_responses')
        .select('*')
        .eq('user_id', user.id)
        .single() as { data: any }

      if (data) {
        const existingAnswers: Record<string, string> = {}
        quizQuestions.forEach((q) => {
          const value = data[q.id as keyof typeof data]
          if (value) {
            existingAnswers[q.id] = value as string
          }
        })
        setAnswers(existingAnswers)
      }

      setIsLoading(false)
    }

    loadExistingResponses()
  }, [router])

  const currentQuestion = quizQuestions[currentStep]
  const progress = ((currentStep + 1) / quizQuestions.length) * 100

  const handleAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }))
  }

  const handleNext = () => {
    if (currentStep < quizQuestions.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleSubmit = async () => {
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

    const { error } = await (supabase as any).from('lifestyle_responses').upsert(
      {
        user_id: user.id,
        ...answers,
      },
      { onConflict: 'user_id' }
    )

    if (error) {
      setError(error.message)
      setIsSaving(false)
      return
    }

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
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>
            Question {currentStep + 1} of {quizQuestions.length}
          </span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <Card variant="bordered">
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {currentQuestion.question}
          </h2>

          <div className="space-y-3">
            {currentQuestion.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAnswer(option.value)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  answers[currentQuestion.id] === option.value
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{option.label}</p>
                    {option.description && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {option.description}
                      </p>
                    )}
                  </div>
                  {answers[currentQuestion.id] === option.value && (
                    <Check className="h-5 w-5 text-blue-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {currentStep < quizQuestions.length - 1 ? (
          <Button
            onClick={handleNext}
            disabled={!answers[currentQuestion.id]}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!answers[currentQuestion.id]}
            isLoading={isSaving}
          >
            Complete Quiz
            <Check className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}

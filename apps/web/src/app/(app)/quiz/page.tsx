'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Bookmark,
  Sun,
  Moon,
  Shuffle,
  Volume2,
  Sparkles,
} from 'lucide-react'

interface QuizQuestion {
  id: string
  question: string
  subtitle?: string
  description?: string
  options: { value: string; label: string; description?: string; icon?: React.ReactNode }[]
  sidebarTitle?: string
  sidebarContent?: string
}

const quizQuestions: QuizQuestion[] = [
  {
    id: 'sleep_schedule',
    question: 'What does your daily rhythm look like?',
    subtitle: 'Select the option that best describes your typical work/life schedule.',
    options: [
      {
        value: 'early_bird',
        label: 'Early Riser',
        description: 'Up before the sun, usually asleep by 10 PM. Value a quiet morning coffee routine.',
        icon: <Sun className="h-5 w-5" />,
      },
      {
        value: 'night_owl',
        label: 'Night Owl',
        description: 'Most productive in the evenings. Prefer late dinners and slow, quiet mornings.',
        icon: <Moon className="h-5 w-5" />,
      },
      {
        value: 'flexible',
        label: 'Flexible/Hybrid',
        description: 'No set in stone times. Schedule varies day-to-day. Adaptable to roommate routines.',
        icon: <Shuffle className="h-5 w-5" />,
      },
    ],
  },
  {
    id: 'work_schedule',
    question: 'What is your typical work schedule?',
    subtitle: 'This helps us match you with roommates who have compatible routines.',
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
    id: 'noise_tolerance',
    question: 'Noise & Social Vibes',
    subtitle: 'How do you prefer the atmosphere of your home?',
    options: [
      {
        value: 'quiet',
        label: 'Zen Sanctuary',
        description: 'Quiet is essential — no guests after 8 PM.',
      },
      {
        value: 'moderate',
        label: 'Balanced Living',
        description: 'Occasional social gatherings, but respect each other\'s space.',
      },
      {
        value: 'loud_ok',
        label: 'The Social Hub',
        description: 'Love hosting and having noise. TV & hosting are daily activities.',
      },
    ],
  },
  {
    id: 'cleanliness_level',
    question: 'Cleanliness Standards',
    subtitle: 'How would you describe your cleanliness expectations?',
    sidebarTitle: 'Cleanliness Standards',
    sidebarContent: 'Be honest -- it\'s the #1 cause of roommate friction. A conflict around a score is almost entirely preventable!',
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
    subtitle: 'Setting clear expectations about guests prevents future conflicts.',
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
    subtitle: 'Partners, friends, and family staying over.',
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
    subtitle: 'Non-negotiable for most roommates.',
    options: [
      { value: 'never', label: 'No Smoking', description: 'Non-smoker, prefer smoke-free home' },
      { value: 'outside_only', label: 'Outside Only', description: 'OK if done outside' },
      { value: 'yes', label: 'Smoker', description: 'I smoke or am fine with smoking' },
    ],
  },
  {
    id: 'cannabis',
    question: 'How about cannabis use?',
    subtitle: 'Legal in Canada, but preferences vary.',
    options: [
      { value: 'never', label: 'No Cannabis', description: 'Prefer cannabis-free home' },
      { value: 'outside_only', label: 'Outside/Edibles', description: 'Not inside the home' },
      { value: 'yes', label: 'Cannabis Friendly', description: 'Comfortable with cannabis use' },
    ],
  },
  {
    id: 'pets_preference',
    question: 'What are your pet preferences?',
    subtitle: 'Pets can be a dealbreaker -- be upfront.',
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
    subtitle: 'Setting communication expectations early.',
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
    subtitle: 'This affects noise, space usage, and daily routines.',
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
    subtitle: 'Thermostat wars are real. Let\'s settle this upfront.',
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
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
    }
  }, [])

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

      const { data } = (await supabase
        .from('lifestyle_responses')
        .select('*')
        .eq('user_id', user.id)
        .single()) as { data: any }

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

    // Auto-advance to the next question after a short delay so the user sees
    // their selection register before the screen changes. Skip on the last
    // step — Complete Quiz stays an explicit action.
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    if (currentStep < quizQuestions.length - 1) {
      advanceTimer.current = setTimeout(() => {
        setCurrentStep((prev) =>
          prev < quizQuestions.length - 1 ? prev + 1 : prev,
        )
      }, 450)
    }
  }

  const handleNext = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    if (currentStep < quizQuestions.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleSaveForLater = async () => {
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

    const { error } = await supabase.from('lifestyle_responses').upsert(
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

    const { error } = await supabase.from('lifestyle_responses').upsert(
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
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    )
  }

  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === quizQuestions.length - 1

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Badge variant="info" className="mb-3">
          <Sparkles className="h-3 w-3 mr-1" />
          LIFESTYLE ALIGNMENT
        </Badge>
        <h1 className="text-3xl font-display font-bold text-on-surface">
          Discover Your Perfect Sanctuary
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-xl">
          Let's refine your search by understanding how you live. We'll match you
          with roommates who share your rhythm and respect your boundaries.
        </p>
      </div>

      {/* Step Progress */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex gap-1">
            {quizQuestions.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i <= currentStep ? 'w-6 bg-primary' : 'w-3 bg-surface-container-high'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-on-surface-variant ml-auto">
            STEP {currentStep + 1} of {quizQuestions.length}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error-container rounded-xl text-error text-sm">
          {error}
        </div>
      )}

      {/* Question Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={currentQuestion.sidebarContent ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <div className="mb-6">
            <h2 className="text-xl font-display font-semibold text-on-surface">
              {currentQuestion.question}
            </h2>
            {currentQuestion.subtitle && (
              <p className="text-sm text-on-surface-variant mt-2">
                {currentQuestion.subtitle}
              </p>
            )}
          </div>

          {/* Option Cards */}
          <div className="space-y-3">
            {currentQuestion.options.map((option) => {
              const isSelected = answers[currentQuestion.id] === option.value
              return (
                <button
                  key={option.value}
                  onClick={() => handleAnswer(option.value)}
                  className={`w-full p-4 rounded-xl text-left transition-all duration-200 ${
                    isSelected
                      ? 'bg-primary-fixed ghost-border ring-2 ring-primary/30'
                      : 'bg-surface-container-lowest ghost-border hover:bg-surface-container-low'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {option.icon && (
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isSelected
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {option.icon}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                        {option.label}
                      </p>
                      {option.description && (
                        <p className="text-sm text-on-surface-variant mt-0.5">
                          {option.description}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center flex-shrink-0">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Sidebar explainer (only for certain questions) */}
        {currentQuestion.sidebarContent && (
          <div className="lg:col-span-1">
            <Card className="bg-primary text-on-primary rounded-xl">
              <CardContent className="py-5">
                <h4 className="font-display font-semibold text-sm mb-2">
                  {currentQuestion.sidebarTitle}
                </h4>
                <p className="text-sm text-on-primary/80 leading-relaxed">
                  {currentQuestion.sidebarContent}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-surface-container">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={isFirstStep}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous Step
        </Button>

        <button
          onClick={handleSaveForLater}
          disabled={isSaving}
          className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-50"
        >
          <Bookmark className="h-4 w-4 inline mr-1" />
          Save for later
        </button>

        {isLastStep ? (
          <Button
            onClick={handleSubmit}
            disabled={!answers[currentQuestion.id] || isSaving}
            isLoading={isSaving}
            variant="primary"
          >
            Complete Quiz
            <Check className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!answers[currentQuestion.id]}
            variant="primary"
          >
            Next: {quizQuestions[currentStep + 1]?.question.split(' ').slice(0, 3).join(' ')}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}

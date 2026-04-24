'use client'

import { useState } from 'react'
import { LogoMark } from '@/components/ui/logo-mark'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }

      // Always show success to avoid revealing if email exists
      setSuccess(true)
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 no-underline">
            <LogoMark size={32} />
            <span className="font-logo text-xl font-semibold text-primary tracking-[-0.02em] leading-none">
              NestMatch
            </span>
          </Link>
        </div>

        {success ? (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-secondary-container/30 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-secondary" />
              </div>
              <h2 className="font-display text-3xl font-extrabold text-primary tracking-tight">
                Check your email
              </h2>
              <p className="text-on-surface-variant font-medium">
                If an account with that email exists, we&apos;ve sent a password
                reset link. Please check your inbox and spam folder.
              </p>
            </div>

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Header */}
            <div className="text-center lg:text-left space-y-2">
              <h2 className="font-display text-3xl font-extrabold text-primary tracking-tight">
                Reset your password
              </h2>
              <p className="text-on-surface-variant font-medium">
                Enter the email address associated with your account and
                we&apos;ll send you a link to reset your password.
              </p>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-6"
              aria-label="Reset password"
            >
              {error && (
                <div
                  role="alert"
                  className="flex items-center gap-2 p-3 bg-error-container/30 rounded-xl text-error text-sm"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label
                  className="block text-sm font-semibold text-primary ml-1"
                  htmlFor="forgot-email"
                >
                  Email Address
                </label>
                <Input
                  {...register('email')}
                  id="forgot-email"
                  type="email"
                  placeholder="name@nestmatch.ca"
                  className="px-4 py-3.5 rounded-xl"
                  error={errors.email?.message}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />
                    Sending...
                  </span>
                ) : (
                  'Send reset link'
                )}
              </button>
            </form>

            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

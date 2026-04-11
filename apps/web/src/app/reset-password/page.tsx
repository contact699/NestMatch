'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { AlertCircle, CheckCircle, ArrowLeft, Lock } from 'lucide-react'

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  useEffect(() => {
    const supabase = createClient()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })

    // Also check if we already have a session (e.g. page was refreshed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const redirectToDashboard = useCallback(() => {
    router.push('/dashboard')
  }, [router])

  useEffect(() => {
    if (!success) return

    const timer = setTimeout(redirectToDashboard, 3000)
    return () => clearTimeout(timer)
  }, [success, redirectToDashboard])

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }

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
          <Link href="/">
            <span className="font-display text-2xl font-extrabold text-primary tracking-tighter">
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
                Password updated
              </h2>
              <p className="text-on-surface-variant font-medium">
                Your password has been successfully reset. You&apos;ll be
                redirected to your dashboard in a few seconds.
              </p>
            </div>

            <button
              onClick={redirectToDashboard}
              className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Go to dashboard
            </button>
          </div>
        ) : !sessionReady ? (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-on-primary/30 border-t-primary" />
              </div>
              <h2 className="font-display text-3xl font-extrabold text-primary tracking-tight">
                Verifying reset link...
              </h2>
              <p className="text-on-surface-variant font-medium">
                Please wait while we verify your password reset link.
              </p>
            </div>

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
        ) : (
          <div className="space-y-8">
            {/* Header */}
            <div className="text-center lg:text-left space-y-2">
              <h2 className="font-display text-3xl font-extrabold text-primary tracking-tight">
                Set new password
              </h2>
              <p className="text-on-surface-variant font-medium">
                Choose a strong password to secure your account.
              </p>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-6"
              aria-label="Set new password"
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

              <div className="space-y-4">
                <div className="space-y-1">
                  <label
                    className="block text-sm font-semibold text-primary ml-1"
                    htmlFor="reset-password"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
                    <Input
                      {...register('password')}
                      id="reset-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10 px-4 py-3.5 rounded-xl"
                      error={errors.password?.message}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    className="block text-sm font-semibold text-primary ml-1"
                    htmlFor="reset-confirm-password"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline" />
                    <Input
                      {...register('confirmPassword')}
                      id="reset-confirm-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10 px-4 py-3.5 rounded-xl"
                      error={errors.confirmPassword?.message}
                    />
                  </div>
                </div>
              </div>

              <p className="text-xs text-on-surface-variant">
                Password must be at least 8 characters with uppercase,
                lowercase, and number.
              </p>

              <button
                type="submit"
                disabled={isLoading || !sessionReady}
                className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />
                    Updating password...
                  </span>
                ) : (
                  'Reset password'
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

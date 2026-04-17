'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { AlertCircle } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

// Only allow same-origin relative paths. Rejects `//evil.com`, `http://evil.com`,
// or any value containing `:` / `\` / newlines that could smuggle an absolute URL.
function safeRedirect(path: string | null | undefined): string {
  if (!path) return '/dashboard'
  if (!path.startsWith('/')) return '/dashboard'
  if (path.startsWith('//') || path.startsWith('/\\')) return '/dashboard'
  if (/[\r\n\t]/.test(path)) return '/dashboard'
  return path
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = safeRedirect(searchParams.get('redirect'))
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  const handleGoogleLogin = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      },
    })
  }

  return (
    <div className="space-y-8">
      {/* Form Header */}
      <div className="text-center lg:text-left space-y-2">
        <h2 className="font-display text-3xl font-bold text-primary tracking-tight">
          Welcome back
        </h2>
        <p className="text-on-surface-variant font-medium">
          Access your sanctuary and connect with matches.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-surface-container rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab('login')}
          className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === 'login'
              ? 'bg-surface-container-lowest text-primary shadow-sm'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('signup')
            router.push('/signup')
          }}
          className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === 'signup'
              ? 'bg-surface-container-lowest text-primary shadow-sm'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          Sign Up
        </button>
      </div>

      {/* Form Fields */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
        aria-label="Sign in"
      >
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 p-3 bg-error-container rounded-xl text-error text-sm"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1">
            <label
              className="block text-sm font-semibold text-primary ml-1"
              htmlFor="login-email"
            >
              Email Address
            </label>
            <Input
              {...register('email')}
              id="login-email"
              type="email"
              placeholder="name@nestmatch.ca"
              className="px-4 py-3.5 rounded-xl"
              error={errors.email?.message}
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center px-1">
              <label
                className="block text-sm font-semibold text-primary"
                htmlFor="login-password"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              {...register('password')}
              id="login-password"
              type="password"
              placeholder="••••••••"
              className="px-4 py-3.5 rounded-xl"
              error={errors.password?.message}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />
              Signing in...
            </span>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-outline-variant/30" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-surface px-4 text-on-surface-variant font-medium uppercase tracking-widest">
            or continue with
          </span>
        </div>
      </div>

      {/* Social Logins */}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex items-center justify-center gap-3 py-3 px-4 border border-outline-variant/20 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low transition-colors active:scale-95 duration-200"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span className="text-sm font-semibold text-primary">Google</span>
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-3 py-3 px-4 border border-outline-variant/20 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low transition-colors active:scale-95 duration-200"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M17.05 20.28c-.96.95-2.04 1.72-3.32 1.72-1.25 0-1.63-.78-3.15-.78-1.53 0-1.95.76-3.14.78-1.29.02-2.31-.83-3.29-1.78C2.16 18.25 1 15.11 1 12.18c0-2.86 1.48-4.38 2.85-4.38 1.43 0 2.22.84 3.31.84.97 0 1.57-.84 3.2-.84 1.16 0 2.29.49 3 1.3-2.31 1.14-1.94 4.51.44 5.48-.9 2.06-2.09 4.04-3.75 5.7M12.03 7.25c-.02-2.23 1.51-4.07 3.5-4.25.19 2.4-2.09 4.43-3.5 4.25"
              fill="currentColor"
            />
          </svg>
          <span className="text-sm font-semibold text-primary">Apple</span>
        </button>
      </div>
    </div>
  )
}

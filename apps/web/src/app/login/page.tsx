import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

export const metadata = {
  title: 'Sign In - NestMatch',
  description: 'Sign in to your NestMatch account',
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen">
      {/* Left Side: Aspirational Imagery */}
      <section className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-primary-container/20 z-10" />
        {/* Background image placeholder using gradient */}
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary via-primary-container to-primary" />

        <div className="relative z-20 flex flex-col justify-end p-16 w-full bg-gradient-to-t from-primary/80 to-transparent">
          <div className="max-w-md">
            <h1 className="font-display text-5xl font-extrabold text-on-primary tracking-tighter mb-6 leading-tight">
              Find your peaceful <br />
              place to call home.
            </h1>
            <p className="text-on-primary/80 text-lg font-medium leading-relaxed mb-8">
              Experience the gold standard of Canadian hospitality with curated
              roommate matches and secure housing agreements.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {['bg-secondary', 'bg-primary-fixed-dim', 'bg-secondary-container'].map((bg, i) => (
                  <div
                    key={i}
                    className={`w-10 h-10 rounded-full border-2 border-primary-container ${bg} flex items-center justify-center text-primary text-xs font-bold`}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              <span className="text-on-primary text-sm font-semibold">
                Trust-verified community
              </span>
            </div>
          </div>
        </div>

        {/* Logo overlay */}
        <div className="absolute top-12 left-16 z-20">
          <Link href="/">
            <span className="font-display text-3xl font-extrabold text-on-primary tracking-tighter">
              NestMatch
            </span>
          </Link>
        </div>
      </section>

      {/* Right Side: Authentication Form */}
      <section className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-surface px-6 md:px-12 py-12">
        <div className="w-full max-w-md space-y-10">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/">
              <span className="font-display text-2xl font-extrabold text-primary tracking-tighter">
                NestMatch
              </span>
            </Link>
          </div>

          <Suspense
            fallback={
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-surface-container-high border-t-primary" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>

          {/* Trust badge + footer */}
          <div className="pt-6 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-container text-primary rounded-full text-xs font-bold tracking-tight">
              <ShieldCheck className="h-4 w-4" />
              TRUST VERIFIED COMMUNITY
            </div>
            <p className="mt-4 text-[10px] text-on-surface-variant text-center uppercase tracking-widest leading-relaxed">
              Securely processed in Canada
              <br />
              &copy; {new Date().getFullYear()} NestMatch Hospitality
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

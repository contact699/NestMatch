import { SignupForm } from '@/components/auth/signup-form'
import Link from 'next/link'

export const metadata = {
  title: 'Sign Up - NestMatch',
  description: 'Create your NestMatch account and find your perfect roommate',
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-container-low px-4">
      <Link href="/" className="mb-8">
        <h1 className="text-3xl font-bold font-display text-primary">NestMatch</h1>
      </Link>
      <SignupForm />
    </div>
  )
}

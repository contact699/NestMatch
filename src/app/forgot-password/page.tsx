import { Suspense } from 'react'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import Link from 'next/link'

export const metadata = {
  title: 'Forgot Password - NestMatch',
  description: 'Reset your NestMatch account password',
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <Link href="/" className="mb-8">
        <h1 className="text-3xl font-bold text-blue-600">NestMatch</h1>
      </Link>
      <Suspense fallback={<div>Loading...</div>}>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  )
}

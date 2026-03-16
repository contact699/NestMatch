import { Suspense } from 'react'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import Link from 'next/link'

export const metadata = {
  title: 'Reset Password - NestMatch',
  description: 'Set a new password for your NestMatch account',
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <Link href="/" className="mb-8">
        <h1 className="text-3xl font-bold text-blue-600">NestMatch</h1>
      </Link>
      <Suspense fallback={<div>Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}

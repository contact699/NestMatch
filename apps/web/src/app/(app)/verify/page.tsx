'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Phone,
  Shield,
  Mail,
  Check,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react'

interface VerificationStatus {
  profile: {
    email_verified: boolean
    phone_verified: boolean
    verification_level: 'basic' | 'verified' | 'trusted'
    verified_at: string | null
  }
  verifications: Array<{
    id: string
    type: 'id' | 'credit' | 'criminal' | 'reference'
    status: 'pending' | 'completed' | 'failed'
    created_at: string
    completed_at: string | null
    expires_at: string | null
  }>
}

export default function VerifyPage() {
  const router = useRouter()
  const [status, setStatus] = useState<VerificationStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Phone verification state
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [phoneStep, setPhoneStep] = useState<'input' | 'verify'>('input')
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  // ID verification state
  const [isInitiatingId, setIsInitiatingId] = useState(false)
  const [idError, setIdError] = useState<string | null>(null)

  const loadStatus = async () => {
    const response = await fetch('/api/verify/status')
    const data = await response.json()

    if (response.ok) {
      setStatus(data)
    }

    setIsLoading(false)
  }

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?redirect=/verify')
        return
      }

      loadStatus()
    }

    checkAuth()
  }, [router])

  const handleSendCode = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setPhoneError('Please enter a valid phone number')
      return
    }

    setIsSendingCode(true)
    setPhoneError(null)

    try {
      const response = await fetch('/api/verify/phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send code')
      }

      setPhoneStep('verify')
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : 'Failed to send code')
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setPhoneError('Please enter the 6-digit code')
      return
    }

    setIsVerifyingCode(true)
    setPhoneError(null)

    try {
      const response = await fetch('/api/verify/phone/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber, code: verificationCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify code')
      }

      // Refresh status
      await loadStatus()
      setPhoneStep('input')
      setPhoneNumber('')
      setVerificationCode('')
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : 'Failed to verify code')
    } finally {
      setIsVerifyingCode(false)
    }
  }

  const handleInitiateIdVerification = async () => {
    setIsInitiatingId(true)
    setIdError(null)

    try {
      const response = await fetch('/api/verify/id/initiate', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate verification')
      }

      // Refresh status
      await loadStatus()
    } catch (err) {
      setIdError(err instanceof Error ? err.message : 'Failed to initiate verification')
    } finally {
      setIsInitiatingId(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const idVerification = status?.verifications.find((v) => v.type === 'id')

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'trusted':
        return <Badge variant="success">Trusted</Badge>
      case 'verified':
        return <Badge variant="info">Verified</Badge>
      default:
        return <Badge variant="default">Basic</Badge>
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/profile"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to profile
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Verification</h1>
          {status && getLevelBadge(status.profile.verification_level)}
        </div>
        <p className="text-gray-600 mt-1">
          Verify your identity to build trust with potential roommates
        </p>
      </div>

      <div className="space-y-6">
        {/* Email Verification */}
        <Card variant="bordered">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                status?.profile.email_verified ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Mail className={`h-5 w-5 ${
                  status?.profile.email_verified ? 'text-green-600' : 'text-gray-400'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Email Verification</h3>
                  {status?.profile.email_verified ? (
                    <span className="flex items-center gap-1 text-green-600 text-sm">
                      <Check className="h-4 w-4" />
                      Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-400 text-sm">
                      <Clock className="h-4 w-4" />
                      Pending
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {status?.profile.email_verified
                    ? 'Your email address has been verified'
                    : 'Check your inbox for a verification email'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Phone Verification */}
        <Card variant="bordered">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                status?.profile.phone_verified ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Phone className={`h-5 w-5 ${
                  status?.profile.phone_verified ? 'text-green-600' : 'text-gray-400'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">Phone Verification</h3>
                  {status?.profile.phone_verified ? (
                    <span className="flex items-center gap-1 text-green-600 text-sm">
                      <Check className="h-4 w-4" />
                      Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-400 text-sm">
                      <Clock className="h-4 w-4" />
                      Not verified
                    </span>
                  )}
                </div>

                {status?.profile.phone_verified ? (
                  <p className="text-sm text-gray-500">
                    Your phone number has been verified
                  </p>
                ) : (
                  <div className="space-y-3">
                    {phoneError && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        {phoneError}
                      </div>
                    )}

                    {phoneStep === 'input' ? (
                      <div className="flex gap-2">
                        <Input
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+1 (555) 000-0000"
                          className="flex-1"
                        />
                        <Button
                          onClick={handleSendCode}
                          disabled={isSendingCode}
                          size="sm"
                        >
                          {isSendingCode ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Send Code'
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-500">
                          Enter the 6-digit code sent to {phoneNumber}
                        </p>
                        <div className="flex gap-2">
                          <Input
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            maxLength={6}
                            className="flex-1"
                          />
                          <Button
                            onClick={handleVerifyCode}
                            disabled={isVerifyingCode}
                            size="sm"
                          >
                            {isVerifyingCode ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Verify'
                            )}
                          </Button>
                        </div>
                        <button
                          onClick={() => setPhoneStep('input')}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Change phone number
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ID Verification */}
        <Card variant="bordered">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                idVerification?.status === 'completed' ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Shield className={`h-5 w-5 ${
                  idVerification?.status === 'completed' ? 'text-green-600' : 'text-gray-400'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">ID Verification</h3>
                  {idVerification?.status === 'completed' ? (
                    <span className="flex items-center gap-1 text-green-600 text-sm">
                      <Check className="h-4 w-4" />
                      Verified
                    </span>
                  ) : idVerification?.status === 'pending' ? (
                    <span className="flex items-center gap-1 text-yellow-600 text-sm">
                      <Clock className="h-4 w-4" />
                      In Progress
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-400 text-sm">
                      <Clock className="h-4 w-4" />
                      Not verified
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-500 mb-3">
                  {idVerification?.status === 'completed'
                    ? 'Your identity has been verified. This helps build trust with potential roommates.'
                    : idVerification?.status === 'pending'
                    ? 'Your ID verification is in progress. Check your email for instructions from Certn.'
                    : 'Verify your government-issued ID to earn the Trusted badge and build trust with others.'}
                </p>

                {idError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm mb-3">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {idError}
                  </div>
                )}

                {!idVerification || idVerification.status === 'failed' ? (
                  <Button
                    onClick={handleInitiateIdVerification}
                    disabled={isInitiatingId}
                    variant="outline"
                    size="sm"
                  >
                    {isInitiatingId ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Initiating...
                      </>
                    ) : (
                      'Start ID Verification'
                    )}
                  </Button>
                ) : idVerification.status === 'pending' ? (
                  <Button
                    onClick={loadStatus}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Check Status
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Levels Explanation */}
        <Card variant="bordered" className="bg-gray-50">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Verification Levels</CardTitle>
          </CardHeader>
          <CardContent className="py-3">
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Badge variant="default">Basic</Badge>
                <p className="text-gray-600">Email verified only</p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="info">Verified</Badge>
                <p className="text-gray-600">Email + Phone verified</p>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="success">Trusted</Badge>
                <p className="text-gray-600">Email + Phone + ID verified</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

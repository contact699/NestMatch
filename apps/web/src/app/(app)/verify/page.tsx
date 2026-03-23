'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Phone,
  Shield,
  ShieldCheck,
  Check,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  User,
  MapPin,
  Briefcase,
  FileCheck,
  Smartphone,
  Scale,
  UserPlus,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'

interface VerificationStatus {
  profile: {
    name: string
    profile_photo: string | null
    city: string | null
    province: string | null
    occupation: string | null
    email_verified: boolean
    phone: string | null
    phone_verified: boolean
    verification_level: 'basic' | 'verified' | 'trusted'
    verified_at: string | null
    created_at: string
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
      setPhoneError(
        err instanceof Error ? err.message : 'Failed to send code'
      )
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
        body: JSON.stringify({
          phone: phoneNumber,
          code: verificationCode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify code')
      }

      await loadStatus()
      setPhoneStep('input')
      setPhoneNumber('')
      setVerificationCode('')
    } catch (err) {
      setPhoneError(
        err instanceof Error ? err.message : 'Failed to verify code'
      )
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

      await loadStatus()
    } catch (err) {
      setIdError(
        err instanceof Error
          ? err.message
          : 'Failed to initiate verification'
      )
    } finally {
      setIsInitiatingId(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    )
  }

  const idVerification = status?.verifications.find((v) => v.type === 'id')
  const creditVerification = status?.verifications.find(
    (v) => v.type === 'credit'
  )
  const criminalVerification = status?.verifications.find(
    (v) => v.type === 'criminal'
  )

  // Calculate trust quotient
  const trustFactors = [
    status?.profile.email_verified,
    status?.profile.phone_verified,
    idVerification?.status === 'completed',
    creditVerification?.status === 'completed',
    criminalVerification?.status === 'completed',
  ]
  const trustQuotient = Math.round(
    (trustFactors.filter(Boolean).length / trustFactors.length) * 100
  )

  // Masked phone
  const maskedPhone = status?.profile.phone
    ? status.profile.phone.replace(/(\d{1,3})(\d+)(\d{2})/, (_, a, b, c) => {
        return `${a} ${'*'.repeat(b.length)} ${c}`
      })
    : null

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/profile"
          className="inline-flex items-center text-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to profile
        </Link>
      </div>

      {/* Page Header */}
      <div className="mb-8">
        <Badge variant="info" className="mb-3">
          <Shield className="h-3 w-3 mr-1" />
          SECURE PROFILE
        </Badge>
        <h1 className="text-3xl font-display font-bold text-on-surface">
          Trust Center
        </h1>
        <p className="text-on-surface-variant mt-2">
          Verification is the cornerstone of safe, trusted co-living. Build your
          digital trust anchors.
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Left Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* User Card */}
          <Card variant="bordered">
            <CardContent className="py-6 text-center">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-surface-container mx-auto mb-3 flex items-center justify-center">
                {status?.profile.profile_photo ? (
                  <img
                    src={status.profile.profile_photo}
                    alt={status.profile.name || 'Profile'}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-10 w-10 text-on-surface-variant" />
                )}
              </div>
              <h3 className="font-display font-semibold text-on-surface">
                {status?.profile.name || 'User'}
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Member since{' '}
                {status?.profile.created_at
                  ? new Date(status.profile.created_at).getFullYear()
                  : 'N/A'}
              </p>

              {(status?.profile.city || status?.profile.province) && (
                <div className="flex items-center justify-center gap-1.5 mt-3 text-sm text-on-surface-variant">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>
                    {[status?.profile.city, status?.profile.province]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}
              {status?.profile.occupation && (
                <div className="flex items-center justify-center gap-1.5 mt-1.5 text-sm text-on-surface-variant">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>{status.profile.occupation}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trust Quotient */}
          <Card className="bg-primary text-on-primary rounded-xl">
            <CardContent className="py-6">
              <p className="text-xs font-semibold tracking-wider uppercase text-on-primary/70 mb-1">
                Trust Quotient
              </p>
              <p className="text-5xl font-display font-bold">{trustQuotient}%</p>
              <p className="text-sm text-on-primary/70 mt-2">
                Your identity is{' '}
                {trustQuotient >= 80
                  ? 'fully established'
                  : trustQuotient >= 40
                    ? 'partially verified'
                    : 'just getting started'}{' '}
                within the NestMatch ecosystem.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Verification Cards Grid */}
        <div className="lg:col-span-3">
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Government ID */}
            <TrustCard
              icon={<FileCheck className="h-6 w-6 text-primary" />}
              title="Government ID"
              verified={idVerification?.status === 'completed'}
              pending={idVerification?.status === 'pending'}
              description={
                idVerification?.status === 'completed'
                  ? 'Passport or Driver\'s License successfully scanned and matched via biometric link.'
                  : idVerification?.status === 'pending'
                    ? 'Your ID verification is in progress. Check your email for instructions.'
                    : 'Verify your government-issued ID to earn the Trusted badge.'
              }
              footer={
                idVerification?.status === 'completed' ? (
                  <div className="flex items-center gap-1.5 text-secondary text-xs font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    MATCHED TO BIOMETRICS
                  </div>
                ) : idVerification?.status === 'pending' ? (
                  <Button
                    onClick={loadStatus}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-1.5" />
                    Check Status
                  </Button>
                ) : (
                  <>
                    {idError && (
                      <div className="p-2 bg-error-container rounded-lg flex items-center gap-2 text-error text-xs mb-2">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        {idError}
                      </div>
                    )}
                    <Button
                      onClick={handleInitiateIdVerification}
                      disabled={isInitiatingId}
                      variant="outline"
                      size="sm"
                    >
                      {isInitiatingId ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          Initiating...
                        </>
                      ) : (
                        'Start Verification'
                      )}
                    </Button>
                  </>
                )
              }
            />

            {/* Credit Standing */}
            <TrustCard
              icon={<TrendingUp className="h-6 w-6 text-primary" />}
              title="Credit Standing"
              verified={creditVerification?.status === 'completed'}
              description={
                creditVerification?.status === 'completed'
                  ? 'Direct integration with Equifax. Financial reliability score shared with matched hosts.'
                  : 'Verify your credit standing through our Equifax integration.'
              }
              footer={
                creditVerification?.status === 'completed' ? (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5 text-secondary text-xs font-semibold">
                      <TrendingUp className="h-3.5 w-3.5" />
                      EXCELLENT RANGE
                    </div>
                    <span className="text-xs text-on-surface-variant">
                      Updated{' '}
                      {creditVerification.completed_at
                        ? `${Math.floor((Date.now() - new Date(creditVerification.completed_at).getTime()) / 86400000)}d ago`
                        : 'recently'}
                    </span>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Coming Soon
                  </Button>
                )
              }
            />

            {/* Phone Number */}
            <TrustCard
              icon={<Smartphone className="h-6 w-6 text-primary" />}
              title="Phone Number"
              verified={!!status?.profile.phone_verified}
              description={
                status?.profile.phone_verified
                  ? 'Device ownership confirmed via secure SMS handshake and carrier validation.'
                  : 'Verify your phone number to prove device ownership.'
              }
              footer={
                status?.profile.phone_verified ? (
                  <p className="text-sm font-mono text-on-surface-variant tracking-wider">
                    {maskedPhone}
                  </p>
                ) : (
                  <div className="space-y-3 w-full">
                    {phoneError && (
                      <div className="p-2 bg-error-container rounded-lg flex items-center gap-2 text-error text-xs">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
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
                            'Send'
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-on-surface-variant">
                          Enter the 6-digit code sent to {phoneNumber}
                        </p>
                        <div className="flex gap-2">
                          <Input
                            value={verificationCode}
                            onChange={(e) =>
                              setVerificationCode(
                                e.target.value.replace(/\D/g, '').slice(0, 6)
                              )
                            }
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
                          className="text-xs text-secondary hover:underline"
                        >
                          Change phone number
                        </button>
                      </div>
                    )}
                  </div>
                )
              }
            />

            {/* Criminal History */}
            <TrustCard
              icon={<Scale className="h-6 w-6 text-primary" />}
              title="Criminal History"
              verified={criminalVerification?.status === 'completed'}
              description={
                criminalVerification?.status === 'completed'
                  ? 'Enhanced background check completed. No records found in national databases.'
                  : 'Complete a criminal background check to boost trust.'
              }
              footer={
                criminalVerification?.status === 'completed' ? (
                  <button className="text-xs font-semibold text-secondary hover:underline inline-flex items-center gap-1">
                    VIEW CERTIFICATE
                    <ChevronRight className="h-3 w-3" />
                  </button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Coming Soon
                  </Button>
                )
              }
            />
          </div>

          {/* Need more trust? CTA */}
          <Card variant="bordered" className="mt-6">
            <CardContent className="py-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <UserPlus className="h-6 w-6 text-on-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-on-surface">
                    Need more trust?
                  </h3>
                  <p className="text-sm text-on-surface-variant">
                    Request a peer-reference verification to boost your score.
                  </p>
                </div>
                <Button variant="primary" size="sm">
                  Add Reference
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────────── */

function TrustCard({
  icon,
  title,
  verified,
  pending,
  description,
  footer,
}: {
  icon: React.ReactNode
  title: string
  verified: boolean
  pending?: boolean
  description: string
  footer?: React.ReactNode
}) {
  return (
    <Card variant="bordered" className="flex flex-col">
      <CardContent className="py-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          {icon}
          {verified ? (
            <Badge variant="success">
              <Check className="h-3 w-3 mr-0.5" />
              VERIFIED
            </Badge>
          ) : pending ? (
            <Badge variant="warning">
              <Clock className="h-3 w-3 mr-0.5" />
              PENDING
            </Badge>
          ) : null}
        </div>
        <h3 className="font-display font-semibold text-on-surface mb-1.5">
          {title}
        </h3>
        <p className="text-sm text-on-surface-variant mb-4 flex-1">
          {description}
        </p>
        {footer && <div className="mt-auto">{footer}</div>}
      </CardContent>
    </Card>
  )
}

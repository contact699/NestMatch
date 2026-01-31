'use client'

import { UseFormWatch } from 'react-hook-form'
import {
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Clock,
  Moon,
  Cigarette,
  PawPrint,
  Sparkles,
  Package,
  AlertTriangle,
} from 'lucide-react'
import { PROVINCES } from '@/components/resources'
import { AgreementFormData } from '../types'

interface StepReviewProps {
  watch: UseFormWatch<AgreementFormData>
}

export function StepReview({ watch }: StepReviewProps) {
  const formData = watch()
  const provinceName = PROVINCES.find((p) => p.code === formData.province)?.name || formData.province

  const formatCurrency = (amount: number | undefined) => {
    return amount ? `$${amount.toLocaleString()}` : '$0'
  }

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'Not specified'
    return new Date(dateStr).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (time: string | undefined) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const sections = [
    {
      title: 'Basic Information',
      icon: MapPin,
      items: [
        { label: 'Province', value: provinceName },
        { label: 'Address', value: formData.address || 'Not specified' },
        { label: 'Move-in Date', value: formatDate(formData.moveInDate) },
        { label: 'Roommates', value: formData.roommateNames?.filter(Boolean).join(', ') || 'None listed' },
      ],
    },
    {
      title: 'Financial Terms',
      icon: DollarSign,
      items: [
        { label: 'Total Rent', value: formatCurrency(formData.totalRent) },
        { label: 'Split Method', value: formData.rentSplitMethod === 'equal' ? 'Equal' : 'Custom' },
        { label: 'Due Date', value: `${formData.rentDueDate || 1}${['st', 'nd', 'rd'][((formData.rentDueDate || 1) - 1) % 10] || 'th'} of each month` },
        { label: 'Payment Method', value: formData.paymentMethod?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'E-Transfer' },
        { label: 'Security Deposit', value: formData.securityDeposit ? formatCurrency(formData.securityDeposit) : 'None' },
        { label: 'Utilities', value: formData.utilitiesIncluded ? 'Included in rent' : `Split ${formData.utilitiesSplit || 'equally'}` },
      ],
    },
    {
      title: 'Lifestyle Rules',
      icon: Moon,
      items: [
        {
          label: 'Quiet Hours',
          value: formData.quietHoursStart && formData.quietHoursEnd
            ? `${formatTime(formData.quietHoursStart)} - ${formatTime(formData.quietHoursEnd)}`
            : 'Not specified',
        },
        {
          label: 'Guest Policy',
          value: {
            notify: 'Notify roommates',
            limit: `Max ${formData.overnightGuestLimit || 3} overnight nights/week`,
            approval: 'Get approval for overnight guests',
            flexible: 'Flexible - no specific rules',
          }[formData.guestPolicy || 'notify'],
        },
        {
          label: 'Smoking',
          value: {
            no_smoking: 'No smoking',
            outside_only: 'Outside only',
            designated_area: 'Designated area only',
          }[formData.smokingPolicy || 'no_smoking'],
        },
        {
          label: 'Cannabis',
          value: {
            no_cannabis: 'Not allowed',
            outside_only: 'Outside only',
            designated_area: 'Designated area only',
            same_as_smoking: 'Same as smoking policy',
          }[formData.cannabisPolicy || 'same_as_smoking'],
        },
        { label: 'Pets', value: formData.petsAllowed ? (formData.petDetails || 'Allowed') : 'Not allowed' },
      ],
    },
    {
      title: 'Responsibilities',
      icon: Sparkles,
      items: [
        {
          label: 'Cleaning',
          value: {
            rotating: 'Rotating schedule',
            assigned: 'Assigned areas',
            as_needed: 'As needed',
            hired: 'Hired cleaner (split cost)',
          }[formData.cleaningSchedule || 'rotating'],
        },
        {
          label: 'Shared Supplies',
          value: {
            split: 'Split costs equally',
            rotate: 'Rotate buying',
            individual: 'Buy individually',
          }[formData.sharedSuppliesApproach || 'split'],
        },
      ],
    },
    {
      title: 'Agreement Terms',
      icon: AlertTriangle,
      items: [
        { label: 'Notice to Leave', value: `${formData.noticeToLeave || 30} days` },
        {
          label: 'Dispute Resolution',
          value: {
            direct: 'Direct conversation first',
            written: 'Written communication',
            mediation: 'Third-party mediation',
          }[formData.disputeResolution || 'direct'],
        },
        {
          label: 'Duration',
          value: formData.agreementDuration === 'fixed_term'
            ? `Fixed term until ${formatDate(formData.fixedTermEndDate)}`
            : 'Month-to-month',
        },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Review Your Agreement</h3>
        <p className="text-sm text-gray-500">
          Check all the details before generating your agreement
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.title} className="p-4 bg-gray-50 rounded-lg">
            <h4 className="flex items-center gap-2 font-medium text-gray-900 mb-3">
              <section.icon className="h-4 w-4 text-gray-500" />
              {section.title}
            </h4>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {section.items.map((item) => (
                <div key={item.label} className="flex justify-between sm:flex-col">
                  <dt className="text-gray-500">{item.label}</dt>
                  <dd className="text-gray-900 font-medium sm:mt-0.5">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {/* Rent Split Details */}
      {formData.rentSplitMethod === 'custom' && formData.rentSplits && formData.rentSplits.length > 0 && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Rent Split Breakdown</h4>
          <div className="space-y-1 text-sm">
            {formData.rentSplits.map((split, index) => (
              <div key={index} className="flex justify-between">
                <span className="text-blue-700">{split.name || `Roommate ${index + 1}`}</span>
                <span className="font-medium text-blue-900">{formatCurrency(split.amount)}/month</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

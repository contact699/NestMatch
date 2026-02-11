import { AgreementFormData } from './types'

const PROVINCES: Record<string, string> = {
  ON: 'Ontario',
  BC: 'British Columbia',
  QC: 'Quebec',
  AB: 'Alberta',
}

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '[DATE]'
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

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function generateAgreementContent(data: AgreementFormData): string {
  const provinceName = PROVINCES[data.province] || data.province
  const roommates = data.roommateNames.filter(Boolean)
  const roommateList = roommates.join(', ')

  const sections: string[] = []

  // Header
  sections.push(`
ROOMMATE AGREEMENT

This agreement is entered into on ${formatDate(new Date().toISOString().split('T')[0])}
by and between the following parties:

${roommates.map((name, i) => `${i + 1}. ${name}`).join('\n')}

Regarding the shared rental property located at:
${data.address}
${provinceName}, Canada

Move-in Date: ${formatDate(data.moveInDate)}
`)

  // Disclaimer
  sections.push(`
IMPORTANT NOTICE
This document is a roommate agreement between co-tenants and is not a substitute for a lease agreement with your landlord. This agreement does not create a landlord-tenant relationship. For legal advice regarding tenancy rights in ${provinceName}, please consult with a qualified legal professional or your provincial tenant rights organization.
`)

  // Financial Terms
  sections.push(`
1. FINANCIAL TERMS

1.1 Rent
Total Monthly Rent: $${data.totalRent.toLocaleString()}
Payment Due: ${ordinal(data.rentDueDate)} of each month
Payment Method: ${data.paymentMethod.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}

${data.rentSplitMethod === 'equal'
  ? `Rent will be split equally among all roommates ($${Math.round(data.totalRent / roommates.length).toLocaleString()} per person).`
  : `Rent will be split as follows:\n${data.rentSplits.map(split => `- ${split.name}: $${split.amount.toLocaleString()}`).join('\n')}`
}

1.2 Security Deposit
${data.securityDeposit
  ? `A security deposit of $${data.securityDeposit.toLocaleString()} has been collected.`
  : 'No additional security deposit is collected between roommates.'
}
Note: Security deposits are governed by ${provinceName} tenancy law. Please refer to our guides for province-specific rules.

1.3 Utilities
${data.utilitiesIncluded
  ? 'Utilities are included in the rent.'
  : `Utilities are NOT included in rent and will be ${
      data.utilitiesSplit === 'equal' ? 'split equally among all roommates' :
      data.utilitiesSplit === 'usage' ? 'divided based on individual usage where measurable' :
      'paid on a rotating basis each month'
    }.`
}
`)

  // Lifestyle Rules
  sections.push(`
2. LIFESTYLE RULES

2.1 Quiet Hours
${data.quietHoursStart && data.quietHoursEnd
  ? `Quiet hours are from ${formatTime(data.quietHoursStart)} to ${formatTime(data.quietHoursEnd)}. During these hours, all roommates agree to keep noise to a minimum to ensure everyone can rest.`
  : 'No specific quiet hours are established. Roommates agree to be considerate of each other regarding noise levels.'
}

2.2 Guests
${(() => {
  switch (data.guestPolicy) {
    case 'notify':
      return 'Roommates should notify each other when having guests over, especially for extended visits.'
    case 'limit':
      return `Overnight guests are limited to ${data.overnightGuestLimit || 3} nights per week per roommate. Guests staying longer should be discussed with all roommates.`
    case 'approval':
      return 'Overnight guests require advance notice and approval from other roommates.'
    case 'flexible':
      return 'No specific guest restrictions are in place. Roommates agree to be considerate and communicate when hosting guests.'
    default:
      return ''
  }
})()}

2.3 Smoking
${(() => {
  switch (data.smokingPolicy) {
    case 'no_smoking':
      return 'Smoking is not permitted anywhere on the premises.'
    case 'outside_only':
      return 'Smoking is only permitted outside the unit, at least 3 meters from windows and doors.'
    case 'designated_area':
      return 'Smoking is only permitted in designated areas agreed upon by all roommates.'
    default:
      return ''
  }
})()}

2.4 Cannabis
${(() => {
  switch (data.cannabisPolicy) {
    case 'no_cannabis':
      return 'Cannabis use is not permitted on the premises.'
    case 'outside_only':
      return 'Cannabis use is only permitted outside the unit.'
    case 'designated_area':
      return 'Cannabis use is only permitted in designated areas agreed upon by all roommates.'
    case 'same_as_smoking':
      return 'Cannabis use follows the same rules as smoking.'
    default:
      return ''
  }
})()}

2.5 Pets
${data.petsAllowed
  ? `Pets are allowed in this residence.${data.petDetails ? ` Details: ${data.petDetails}` : ''} Pet owners are responsible for their pets' behavior, cleaning, and any damage caused.`
  : 'No pets are allowed in this residence without the written consent of all roommates.'
}
`)

  // Responsibilities
  sections.push(`
3. RESPONSIBILITIES

3.1 Cleaning
${(() => {
  switch (data.cleaningSchedule) {
    case 'rotating':
      return 'Cleaning duties will rotate weekly among all roommates. A schedule will be posted in a common area.'
    case 'assigned':
      return 'Each roommate is responsible for specific cleaning areas as agreed upon.'
    case 'as_needed':
      return 'Roommates will clean common areas as needed, with the expectation that everyone contributes fairly.'
    case 'hired':
      return 'Professional cleaning services will be hired and the cost split equally among all roommates.'
    default:
      return ''
  }
})()}

3.2 Shared Supplies
${(() => {
  switch (data.sharedSuppliesApproach) {
    case 'split':
      return 'Costs for shared household supplies (toilet paper, cleaning products, etc.) will be split equally. Roommates agree to track these expenses and settle monthly.'
    case 'rotate':
      return 'Roommates will take turns purchasing shared household supplies on a rotating basis.'
    case 'individual':
      return 'Each roommate is responsible for purchasing their own supplies. Any shared items must be agreed upon separately.'
    default:
      return ''
  }
})()}

3.3 Maintenance
${data.maintenanceReporting
  ? data.maintenanceReporting
  : 'All roommates should report maintenance issues promptly. One roommate should be designated as the primary contact for communicating with the landlord.'
}
`)

  // Accommodations
  sections.push(`
4. ACCOMMODATIONS

4.1 Parking
${data.parkingIncluded
  ? (() => {
      let content = 'Parking is included with this property.'
      if (data.parkingSpots && data.parkingSpots > 0) {
        content += ` There are ${data.parkingSpots} parking spot${data.parkingSpots > 1 ? 's' : ''} available.`
      }
      if (data.parkingMonthlyCost && data.parkingMonthlyCost > 0) {
        content += ` Parking costs $${data.parkingMonthlyCost.toLocaleString()} per month.`
      }
      if (data.parkingAssignments && data.parkingAssignments.length > 0) {
        const assignedSpots = data.parkingAssignments.filter(a => a.roommate)
        if (assignedSpots.length > 0) {
          content += `\nSpot assignments:\n${assignedSpots.map(a => `- ${a.spotNumber}: ${a.roommate}`).join('\n')}`
        }
      }
      if (data.parkingRotation) {
        content += '\nParking spots will rotate among roommates periodically.'
      }
      const visitorPolicy = {
        available: 'Visitor parking is available on-site.',
        limited: 'Visitor parking is limited - please notify roommates in advance.',
        none: 'No visitor parking is available on the premises.',
        street_only: 'Visitors must park on the street.',
      }[data.visitorParkingPolicy || 'available']
      content += `\n${visitorPolicy}`
      if (data.parkingHoursRestriction && data.parkingHoursDetails) {
        content += `\nParking hours restriction: ${data.parkingHoursDetails}.`
      }
      const snowText = {
        landlord: '\nSnow removal is handled by the landlord.',
        tenants_rotate: '\nTenants will take turns clearing snow from the parking area.',
        tenants_own_spot: '\nEach tenant is responsible for clearing snow from their own parking spot.',
        not_applicable: '',
      }[data.parkingSnowRemoval || 'not_applicable']
      if (snowText) content += snowText
      if (data.parkingEvCharging) {
        content += `\nEV charging is available on premises.`
        if (data.parkingEvDetails) content += ` ${data.parkingEvDetails}.`
      }
      if (data.parkingTowingPolicy) {
        content += `\nUnauthorized vehicles parked in assigned spots may be towed at the vehicle owner's expense.`
      }
      if (data.vehicleRestrictions) {
        content += `\nVehicle restrictions: ${data.vehicleRestrictions}`
      }
      return content
    })()
  : 'Parking is not included with this property.'
}

4.2 Accessibility Needs
${(() => {
  const needs: string[] = []
  if (data.accessibilityWheelchair) needs.push('- Wheelchair accessible entrance required')
  if (data.accessibilityMobilityStorage) needs.push('- Mobility aid storage needed')
  if (data.accessibilityServiceAnimal) needs.push('- Service animal accommodation')
  return needs.length > 0
    ? needs.join('\n')
    : 'No specific accessibility requirements noted.'
})()}

4.3 Care/Support Needs
${(() => {
  const needs: string[] = []
  if (data.careScheduledVisits) needs.push('- Scheduled support worker visits expected')
  if (data.careQuietHoursMedical) needs.push('- Quiet hours required for medical needs')
  if (data.careAccessibilityMods) needs.push('- Specific accessibility modifications needed')
  if (needs.length > 0 && data.careAdditionalDetails) {
    needs.push(`\nAdditional details: ${data.careAdditionalDetails}`)
  }
  return needs.length > 0
    ? `${needs.join('\n')}\n\nAll roommates agree to respect and accommodate these care needs.`
    : 'No specific care or support needs noted.'
})()}

4.4 Assistance Required
${(() => {
  if (!data.helpExchangeEnabled) return 'No assistance exchange arrangement is in place.'
  let content = 'An assistance exchange arrangement is in place.'
  if (data.helpExchangeProvider) {
    content += ` ${data.helpExchangeProvider} will provide assistance`
  }
  const tasks = data.helpExchangeTasks || []
  if (tasks.length > 0) {
    content += ` including: ${tasks.join(', ')}`
  }
  content += '.'
  const compensationLabels: Record<string, string> = {
    reduced_rent: 'reduced rent',
    free_rent: 'free rent',
    utilities_covered: 'utilities covered',
    other: 'an alternative arrangement',
  }
  if (data.helpExchangeCompensation) {
    content += ` In exchange, the assisting roommate receives ${compensationLabels[data.helpExchangeCompensation] || data.helpExchangeCompensation}.`
  }
  if (data.helpExchangeHoursPerWeek && data.helpExchangeHoursPerWeek > 0) {
    content += ` The expected commitment is approximately ${data.helpExchangeHoursPerWeek} hours per week.`
  }
  if (data.helpExchangeSchedule) {
    content += `\nSchedule: ${data.helpExchangeSchedule}.`
  }
  if (data.helpExchangeTrialPeriod && data.helpExchangeTrialPeriod > 0) {
    content += `\nA trial period of ${data.helpExchangeTrialPeriod} days is agreed upon to evaluate if the arrangement works for both parties.`
  }
  if (data.helpExchangeDetails) {
    content += `\nAdditional details: ${data.helpExchangeDetails}`
  }
  content += '\n\nBoth parties agree to discuss and renegotiate terms if circumstances change.'
  return content
})()}
`)

  // Agreement Terms
  sections.push(`
5. AGREEMENT TERMS

5.1 Duration
${data.agreementDuration === 'fixed_term' && data.fixedTermEndDate
  ? `This agreement is for a fixed term ending on ${formatDate(data.fixedTermEndDate)}.`
  : 'This agreement is month-to-month and will continue until terminated by any party.'
}

5.2 Notice to Leave
Any roommate wishing to leave must provide at least ${data.noticeToLeave} days written notice to all other roommates.

5.3 Dispute Resolution
${(() => {
  switch (data.disputeResolution) {
    case 'direct':
      return 'Disputes should first be addressed through direct, respectful conversation between the parties involved.'
    case 'written':
      return 'Disputes should be communicated in writing to allow all parties time to consider responses.'
    case 'mediation':
      return 'If direct resolution fails, roommates agree to seek third-party mediation before taking further action.'
    default:
      return ''
  }
})()}

5.4 Termination
This agreement may be terminated by mutual written consent of all parties, or by any party giving the required notice as specified above.
`)

  // Signatures
  sections.push(`
6. SIGNATURES

By signing below, all parties agree to abide by the terms of this Roommate Agreement.

${roommates.map(name => `
${name}
Signature: _________________________ Date: _____________
`).join('\n')}

---
Document generated on ${formatDate(new Date().toISOString().split('T')[0])}
This document was created using NestMatch Agreement Generator
`)

  return sections.join('\n').trim()
}

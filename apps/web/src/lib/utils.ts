import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function getRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return formatDate(date)
}

export function getCompatibilityColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  if (score >= 40) return 'text-orange-600'
  return 'text-red-600'
}

export function getCompatibilityLabel(score: number): string {
  if (score >= 80) return 'Great Match'
  if (score >= 60) return 'Good Match'
  if (score >= 40) return 'Fair Match'
  return 'Low Match'
}

export function getVerificationBadgeColor(level: 'basic' | 'verified' | 'trusted'): string {
  switch (level) {
    case 'trusted':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'verified':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

export const CANADIAN_PROVINCES = [
  { value: 'AB', label: 'Alberta' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NU', label: 'Nunavut' },
  { value: 'ON', label: 'Ontario' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'QC', label: 'Quebec' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'YT', label: 'Yukon' },
]

export const CITIES_BY_PROVINCE: Record<string, string[]> = {
  AB: ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge', 'Medicine Hat', 'Grande Prairie', 'Airdrie', 'Fort McMurray', 'Spruce Grove', 'St. Albert'],
  BC: ['Vancouver', 'Victoria', 'Kelowna', 'Kamloops', 'Nanaimo', 'Prince George', 'Abbotsford', 'Surrey', 'Burnaby', 'Richmond', 'Coquitlam', 'Langley', 'Delta', 'Chilliwack'],
  MB: ['Winnipeg', 'Brandon', 'Steinbach', 'Thompson', 'Portage la Prairie', 'Selkirk'],
  NB: ['Moncton', 'Saint John', 'Fredericton', 'Dieppe', 'Miramichi', 'Bathurst'],
  NL: ["St. John's", 'Mount Pearl', 'Corner Brook', 'Conception Bay South', 'Paradise', 'Grand Falls-Windsor'],
  NS: ['Halifax', 'Dartmouth', 'Sydney', 'Truro', 'New Glasgow', 'Glace Bay'],
  NT: ['Yellowknife', 'Hay River', 'Inuvik', 'Fort Smith'],
  NU: ['Iqaluit', 'Rankin Inlet', 'Arviat', 'Baker Lake'],
  ON: ['Toronto', 'Ottawa', 'Mississauga', 'Brampton', 'Hamilton', 'London', 'Markham', 'Vaughan', 'Kitchener', 'Windsor', 'Richmond Hill', 'Oakville', 'Burlington', 'Oshawa', 'Barrie', 'St. Catharines', 'Cambridge', 'Kingston', 'Guelph', 'Thunder Bay', 'Waterloo', 'Brantford', 'Sudbury', 'Peterborough'],
  PE: ['Charlottetown', 'Summerside', 'Stratford', 'Cornwall'],
  QC: ['Montreal', 'Quebec City', 'Laval', 'Gatineau', 'Longueuil', 'Sherbrooke', 'Levis', 'Trois-Rivieres', 'Terrebonne', 'Saint-Jean-sur-Richelieu'],
  SK: ['Saskatoon', 'Regina', 'Prince Albert', 'Moose Jaw', 'Swift Current', 'Yorkton'],
  YT: ['Whitehorse', 'Dawson City', 'Watson Lake', 'Haines Junction'],
}

// Flat list of all cities for backwards compatibility
export const MAJOR_CITIES = Object.values(CITIES_BY_PROVINCE).flat()

export const LANGUAGES = [
  'English',
  'French',
  'Mandarin',
  'Cantonese',
  'Punjabi',
  'Spanish',
  'Tagalog',
  'Arabic',
  'Hindi',
  'Italian',
  'Portuguese',
  'German',
  'Vietnamese',
  'Korean',
  'Tamil',
  'Urdu',
  'Farsi',
  'Polish',
  'Russian',
  'Ukrainian',
  'Greek',
  'Dutch',
  'Japanese',
  'Bengali',
  'Gujarati',
]

export const HOUSEHOLD_SITUATIONS = [
  { value: 'alone', label: 'Living alone' },
  { value: 'couple', label: 'Couple (no children)' },
  { value: 'single_parent', label: 'Single parent with children' },
  { value: 'couple_with_children', label: 'Couple with children' },
  { value: 'with_roommate', label: 'Looking with friend/roommate' },
]

export const BATHROOM_TYPES = [
  { value: 'ensuite', label: 'Ensuite (attached to room)', description: 'Private bathroom connected to your bedroom' },
  { value: 'private', label: 'Private (not attached)', description: 'Private bathroom for your use only, not connected to room' },
  { value: 'shared', label: 'Shared', description: 'Bathroom shared with other household members' },
]

export const BATHROOM_SIZES = [
  { value: 'full', label: 'Full bathroom', description: 'Toilet, sink, shower/tub' },
  { value: 'three_quarter', label: '3/4 bathroom', description: 'Toilet, sink, shower (no tub)' },
  { value: 'half', label: 'Half bathroom', description: 'Toilet and sink only' },
]

export const HELP_TASKS = [
  { value: 'garbage', label: 'Take out garbage/recycling' },
  { value: 'yard_work', label: 'Yard work/snow removal' },
  { value: 'groceries', label: 'Grocery shopping' },
  { value: 'cooking', label: 'Help with cooking/meals' },
  { value: 'cleaning', label: 'Light cleaning/tidying' },
  { value: 'errands', label: 'Running errands' },
  { value: 'companionship', label: 'Companionship/check-ins' },
  { value: 'pet_care', label: 'Pet care (walking/feeding)' },
  { value: 'tech_help', label: 'Tech support/computer help' },
  { value: 'transportation', label: 'Driving/transportation' },
]

export const AMENITIES = [
  'WiFi',
  'Laundry (In-unit)',
  'Laundry (Building)',
  'Parking',
  'Gym',
  'Balcony',
  'Air Conditioning',
  'Heating',
  'Dishwasher',
  'Furnished',
  'Unfurnished',
  'Pet Friendly',
  'Wheelchair Accessible',
  'Storage',
  'Elevator',
  'Security',
  'Pool',
  'Rooftop',
]

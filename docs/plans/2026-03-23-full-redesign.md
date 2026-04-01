# Full UI Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign all ~45 pages to match the new "Curated Sanctuary" design system from Google Stitch, with honest data, standardized navigation, and consistent branding.

**Architecture:** Update the design foundation (colors, fonts, CSS tokens) first, then core UI components, then the shared layout (sidebar + top nav), then each page module-by-module. Each page should reference its corresponding `Design/stitch (9)/stitch/<page>/code.html` for exact markup and `screen.png` for visual reference.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Manrope + Inter fonts, Lucide React icons, custom UI component library (not shadcn).

**Design Reference Directory:** `Design/stitch (9)/stitch/`
**Design System Spec:** `Design/stitch (9)/stitch/civic_nest/DESIGN.md`

---

## Key Design Decisions (Agreed With User)

1. **Landing page:** Use `new_landing_page` design (not original)
2. **Verification page:** Use "Trust Center" design and naming
3. **"Premium Member"** = fully verified user (not a paid tier)
4. **Remove fake features:** Live Concierge, Verified Rent Guarantee escrow, AI biometric integration, Marketplace nav item
5. **Fix "ALS-256"** to "AES-256" on payment methods page
6. **Fix inbox** `{{DATA:TEXT:TEXT_7}}` template bug — should show "NestMatch" or "Messages"
7. **All stats must be dynamic** — query DB counts, never hardcode fake numbers
8. **Standardized navigation:**
   - **Sidebar:** Dashboard, Discover, Messages, My Listings, Saved, Settings
   - **Top nav:** Discover, Listings, Messages, Resources (with contextual sub-navs for Groups/Expenses/Payments module)

---

## Phase 1: Design Foundation

### Task 1.1: Add Manrope Font

**Files:**
- Modify: `apps/web/src/app/layout.tsx`

**Steps:**

1. Import Manrope from `next/font/google` alongside Inter
2. Add `--font-manrope` CSS variable
3. Apply both font variables to `<body>`

```tsx
import { Inter, Manrope } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
});

// In body:
<body className={`${inter.variable} ${manrope.variable} font-sans antialiased`}>
```

4. Commit: `feat: add Manrope display font`

---

### Task 1.2: Update Design Tokens in globals.css

**Files:**
- Modify: `apps/web/src/app/globals.css`

**Steps:**

1. Replace the `:root` color variables with the new Sanctuary design system tokens:

```css
:root {
  /* === Sanctuary Design System === */

  /* Primary - Navy */
  --primary: #002045;
  --on-primary: #ffffff;
  --primary-container: #1a365d;
  --primary-fixed: #d6e3ff;
  --primary-fixed-dim: #adc7f7;

  /* Secondary - Teal */
  --secondary: #006a60;
  --on-secondary: #ffffff;
  --secondary-container: #8cf5e4;
  --secondary-fixed: #b0f0e4;

  /* Tertiary - Warm */
  --tertiary: #371800;
  --tertiary-container: #562a00;
  --tertiary-fixed: #ffdcc4;

  /* Surfaces (No-Line Rule: use these instead of borders) */
  --background: #f8f9fa;
  --surface: #f8f9fa;
  --surface-container-lowest: #ffffff;
  --surface-container-low: #f3f4f5;
  --surface-container: #edeeef;
  --surface-container-high: #e7e8e9;
  --surface-container-highest: #e1e3e4;
  --surface-variant: #e1e3e4;
  --surface-tint: #455f88;

  /* Text */
  --on-surface: #191c1d;
  --on-surface-variant: #43474e;
  --outline: #74777f;
  --outline-variant: #c4c6cf;

  /* Error */
  --error: #ba1a1a;
  --error-container: #ffdad6;
  --on-error: #ffffff;

  /* Gradients */
  --gradient-primary: linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%);
  --gradient-hero: linear-gradient(135deg, #f8f9fa 0%, #edf2f7 50%, #f0f4f8 100%);
  --gradient-card: linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%);

  /* Shadows - Ambient (tinted with on-surface, NOT pure black) */
  --shadow-sm: 0 1px 2px 0 rgba(25, 28, 29, 0.04);
  --shadow-md: 0 4px 6px -1px rgba(25, 28, 29, 0.06), 0 2px 4px -2px rgba(25, 28, 29, 0.04);
  --shadow-lg: 0 10px 24px -4px rgba(25, 28, 29, 0.06);
  --shadow-xl: 0 20px 40px -8px rgba(25, 28, 29, 0.06);

  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.5rem;
  --radius-full: 9999px;

  /* Keep animation timings as-is */
}
```

2. Update the `@theme inline` block to register new Tailwind tokens:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--on-surface);
  --color-primary: var(--primary);
  --color-on-primary: var(--on-primary);
  --color-primary-container: var(--primary-container);
  --color-primary-fixed: var(--primary-fixed);
  --color-secondary: var(--secondary);
  --color-on-secondary: var(--on-secondary);
  --color-secondary-container: var(--secondary-container);
  --color-surface: var(--surface);
  --color-surface-container: var(--surface-container);
  --color-surface-container-low: var(--surface-container-low);
  --color-surface-container-high: var(--surface-container-high);
  --color-surface-container-highest: var(--surface-container-highest);
  --color-surface-container-lowest: var(--surface-container-lowest);
  --color-on-surface: var(--on-surface);
  --color-on-surface-variant: var(--on-surface-variant);
  --color-outline: var(--outline);
  --color-outline-variant: var(--outline-variant);
  --color-error: var(--error);
  --color-error-container: var(--error-container);
  --font-sans: var(--font-inter);
  --font-display: var(--font-manrope);
}
```

3. Update `::selection` to use new primary:
```css
::selection {
  background: var(--primary-fixed);
  color: var(--primary);
}
```

4. Update `.glass` class for new design system:
```css
.glass-nav {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
```

5. Add new utility classes:
```css
/* Tonal transition for surface changes */
.tonal-transition {
  transition: background-color 0.3s ease;
}

/* Editorial grid */
.editorial-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
}

/* Ghost border (accessibility fallback - 15% opacity max) */
.ghost-border {
  border: 1px solid rgba(196, 198, 207, 0.15);
}
```

6. Update focus-visible ring to use new primary:
```css
:focus-visible {
  outline: 2px solid var(--surface-tint);
  outline-offset: 2px;
}
```

7. Commit: `feat: update design tokens to Sanctuary design system`

---

### Task 1.3: Update App Layout Background

**Files:**
- Modify: `apps/web/src/app/(app)/layout.tsx`

**Steps:**

1. Change `bg-gray-50` to `bg-background` (which maps to `#f8f9fa`)

```tsx
<div className="min-h-screen bg-background">
```

2. Commit: `feat: update app layout background to design system token`

---

## Phase 2: Core UI Components

### Task 2.1: Update Button Component

**Files:**
- Modify: `apps/web/src/components/ui/button.tsx`

**Steps:**

1. Update variant colors to use new design system:

```tsx
const variants = {
  primary: `
    bg-primary text-on-primary
    hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5
    focus-visible:ring-primary
  `,
  secondary: `
    bg-surface-container-high text-on-surface
    hover:bg-surface-container-highest hover:shadow-md hover:-translate-y-0.5
    focus-visible:ring-outline
  `,
  outline: `
    border border-outline-variant/30 bg-surface-container-lowest text-on-surface
    hover:bg-surface-container-low hover:shadow-md hover:-translate-y-0.5
    focus-visible:ring-primary
  `,
  ghost: `
    text-on-surface-variant
    hover:bg-surface-container-low
    focus-visible:ring-outline
  `,
  danger: `
    bg-error text-on-error
    hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5
    focus-visible:ring-error
  `,
  glow: `
    bg-gradient-to-r from-primary to-primary-container text-on-primary
    hover:shadow-lg hover:opacity-95
    focus-visible:ring-primary
  `,
}
```

2. Update border-radius from `rounded-xl` to `rounded-lg` (0.75rem = `--radius-lg` per design spec)
3. Commit: `feat: update Button component to Sanctuary design system`

---

### Task 2.2: Update Card Component

**Files:**
- Modify: `apps/web/src/components/ui/card.tsx`

**Steps:**

1. Update variants to use new surface hierarchy (NO borders per "No-Line Rule"):

```tsx
const variants = {
  default: 'bg-surface-container-lowest rounded-xl',
  bordered: 'bg-surface-container-lowest rounded-xl ghost-border',
  elevated: 'bg-surface-container-lowest rounded-xl shadow-lg',
  feature: 'feature-card',
  glass: 'glass-nav rounded-xl',
}
```

2. Update CardHeader, CardTitle, CardDescription, CardFooter to use design tokens:
   - CardHeader: remove `border-b border-gray-100`, use spacing instead (per "No Dividers" rule)
   - CardTitle: `text-on-surface` instead of `text-gray-900`
   - CardDescription: `text-on-surface-variant` instead of `text-gray-500`
   - CardFooter: remove `border-t border-gray-100`, use `pt-4` spacing

3. Commit: `feat: update Card component to Sanctuary design system`

---

### Task 2.3: Update Input Component

**Files:**
- Modify: `apps/web/src/components/ui/input.tsx`

**Steps:**

1. Default state: use `bg-surface-container-low` fill (no outline)
2. Focus state: shift to `bg-surface-container-lowest` with `ring-2 ring-surface-tint/20`
3. Text: `text-on-surface`, placeholder: `text-on-surface-variant`
4. Border-radius: `rounded-lg`
5. Remove any 1px borders — use background color shift for structure

6. Commit: `feat: update Input component to Sanctuary design system`

---

### Task 2.4: Update Badge Component

**Files:**
- Modify: `apps/web/src/components/ui/badge.tsx`

**Steps:**

1. Trust/verification badges: use `bg-secondary text-on-secondary` with soft-edged icons
2. "Premium Member" badge should indicate "Fully Verified" — rename if displayed as "Premium"
3. Use `rounded-full` for pill shape
4. Commit: `feat: update Badge component to Sanctuary design system`

---

## Phase 3: Navigation & Layout

### Task 3.1: Create Sidebar Component

**Files:**
- Create: `apps/web/src/components/layout/sidebar.tsx`

**Steps:**

1. Create a new sidebar component with the standardized nav items:
   - Dashboard (`/dashboard`)
   - Discover (`/search` or `/roommates`)
   - Messages (`/messages`)
   - My Listings (`/my-listings`)
   - Saved (`/saved`)
   - Settings (`/settings`)
2. Bottom section: "Post a Listing" CTA button, Help Center link, Support link
3. Use `bg-surface-container-lowest` background
4. Active state: filled background with `text-secondary` (teal)
5. Icons: Lucide React
6. Collapsible on mobile
7. Show current user's name and avatar at bottom left (like the chat design)
8. Reference: `Design/stitch (9)/stitch/dashboard/screen.png` for layout, but use STANDARDIZED items

```tsx
// Key nav items:
const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/search', label: 'Discover', icon: Search },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/my-listings', label: 'My Listings', icon: Home },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/verify', label: 'Trust Center', icon: ShieldCheck },
]
```

9. Commit: `feat: add Sidebar component with standardized navigation`

---

### Task 3.2: Update Top Navbar

**Files:**
- Modify: `apps/web/src/components/layout/navbar.tsx`

**Steps:**

1. Apply glass-morphism: `glass-nav` class with sticky positioning
2. Left: NestMatch logo + "Premium Housing Concierge" subtitle
3. Center: Top nav links — `Discover`, `Listings`, `Messages`, `Resources`
4. Right: Quick search input, notification bell, user avatar/dropdown
5. Use `font-display` (Manrope) for the logo text
6. Active nav link: underline with teal accent
7. Remove the old sidebar-style nav items from navbar — those now live in Sidebar
8. Mobile: hamburger opens sidebar overlay

9. Commit: `feat: update Navbar to Sanctuary design with glass-morphism`

---

### Task 3.3: Update App Layout to Include Sidebar

**Files:**
- Modify: `apps/web/src/app/(app)/layout.tsx`

**Steps:**

1. Add sidebar to the layout alongside the existing navbar:

```tsx
export default async function AppLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      <div className="flex">
        <Sidebar user={user} />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
```

2. Sidebar should be hidden on mobile (shown via hamburger menu)
3. Main content area gets left margin to account for sidebar width
4. Commit: `feat: add sidebar to app layout`

---

## Phase 4: Landing & Auth Pages

### Task 4.1: Redesign Landing Page (new_landing_page design)

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/components/landing/hero-section.tsx`
- Modify: `apps/web/src/components/landing/landing-nav.tsx`
- Modify: `apps/web/src/components/landing/cta-section.tsx`
- Modify: `apps/web/src/components/landing/footer.tsx`
- Modify other landing components as needed

**Design ref:** `Design/stitch (9)/stitch/new_landing_page/code.html` + `screen.png`

**Steps:**

1. **Hero section:**
   - Headline: "Find roommates you can actually trust." (Manrope display font, `text-primary`)
   - Subtitle: "Canada's first trust-centric housing platform. We combine rigorous verification with lifestyle matching to create living situations that actually work."
   - CTAs: "Get Started" (primary) + "Find a Roommate" (outline)
   - Social proof: "2,300+ users" — **MAKE DYNAMIC**: query actual user count from DB, or use text like "Verified in Toronto, Vancouver & Montreal" without a number
   - Verification badge card floating on right

2. **Top Matches section:**
   - "RECOMMENDED FOR YOU" label
   - "Top Matches" heading
   - 3 profile cards with compatibility scores — these should come from real data or be hidden when no user is logged in
   - "View all candidates" link

3. **Top Verified Listings section:**
   - "Curated condos and shared units in Canada's most vibrant neighborhoods."
   - Show real listings from DB or placeholder "No listings yet" state

4. **CTA section:**
   - "Ready to find your perfect sanctuary?"
   - "Join thousands of verified Canadians who have redefined communal living through trust and compatibility."
   - **HONESTY FIX:** Change "thousands" to match actual user count, or say "Join verified Canadians who..."
   - CTAs: "Create Free Profile" + "Browse Listings"

5. **Footer:** Standard footer with Privacy Policy, Terms of Service, Trust & Safety links

6. **Typography:** All headlines use `font-display` (Manrope), body uses `font-sans` (Inter)

7. Commit: `feat: redesign landing page to Sanctuary design`

---

### Task 4.2: Redesign Login/Signup Page

**Files:**
- Modify: `apps/web/src/app/login/page.tsx`
- Modify: `apps/web/src/components/auth/login-form.tsx`

**Design ref:** `Design/stitch (9)/stitch/login_signup/code.html` + `screen.png`

**Steps:**

1. Split layout: Left = hero image with overlay text, Right = auth form
2. Left side: "Find your peaceful place to call home." with subtitle
3. **HONESTY FIX:** Remove "Joined by 2,000+ Canadians this month" — replace with "Trust-verified community" or similar non-numeric claim
4. Right side: Login/Signup toggle tabs, email/password fields, social auth (Google, Apple)
5. "TRUST VERIFIED COMMUNITY" badge
6. "Securely processed in Canada" footer text
7. Apply new input styling (surface-container-low fill)

8. Commit: `feat: redesign login page to Sanctuary design`

---

## Phase 5: Dashboard

### Task 5.1: Redesign Dashboard

**Files:**
- Modify: `apps/web/src/app/(app)/dashboard/page.tsx`

**Design ref:** `Design/stitch (9)/stitch/dashboard/code.html` + `screen.png`

**Steps:**

1. **Hero card** (dark navy gradient):
   - "WELCOME BACK, {NAME}"
   - "Find your next Sanctuary."
   - "You have {N} new matches in {city} tailored to your lifestyle preferences." — **DYNAMIC from DB**
   - CTAs: "View Matches" + "Post Listing"

2. **Profile Strength sidebar card:**
   - Show profile completion percentage — **DYNAMIC from DB**
   - Status badge (IMPROVING / COMPLETE / etc.)
   - Action items: "Verify Identity", "Add Profile Video"

3. **Quick action cards (4):**
   - Find a Room: "Browse {N} verified shared listings." — **DYNAMIC count**
   - Post a Listing
   - My Matches: "See who you've synced with based on vibes."
   - Saved: "Access your collection of curated homes."

4. **Recent Activity feed** — from DB (messages, listing updates, verification events)

5. **Performance card:**
   - Profile Views: **DYNAMIC**
   - Matches count: **DYNAMIC**

6. Apply Manrope for headings, new surface colors for cards

7. Commit: `feat: redesign dashboard to Sanctuary design`

---

## Phase 6: Discovery & Listings

### Task 6.1: Redesign Search Listings Page

**Files:**
- Modify: `apps/web/src/app/(app)/search/page.tsx`
- Modify: `apps/web/src/components/search/search-filters.tsx`
- Modify: `apps/web/src/components/search/search-results-list.tsx`

**Design ref:** `Design/stitch (9)/stitch/search_listings/code.html` + `screen.png`

**Steps:**

1. Left sidebar filters: Price Range slider, Property Type pills (Apartment/House/Condo/Shared), Amenities checkboxes, Student Friendly toggle, Min Trust Score slider
2. Center: Listing cards with featured card style — "The Yorkville Sanctuary" etc.
3. Right: Expandable map view
4. "{N} Results in {City}" — **DYNAMIC**
5. Listing cards show: photo, title, beds/baths/sqft, trust score badge, price
6. "Apply Filters" CTA button at bottom of filter sidebar

7. Commit: `feat: redesign search listings page`

---

### Task 6.2: Redesign Find Roommates Page

**Files:**
- Modify: `apps/web/src/app/(app)/roommates/page.tsx`

**Design ref:** `Design/stitch (9)/stitch/find_roommates_2/code.html` + `screen.png` (the version with filters)

**Steps:**

1. Header: "Find your sanctuary." with subtitle
2. Search bar + filters: Province, City, Profile type
3. Roommate cards: Photo, name, age, match %, budget, location, bio excerpt, lifestyle tags
4. "View Profile" CTA on each card
5. "Don't see your perfect match?" CTA card: "Create your profile and let our AI-driven matchmaking find candidates for you." — **HONESTY FIX:** Change "AI-driven" to "compatibility-based matchmaking" (unless you have actual AI matching)
6. Budget display per person

7. Commit: `feat: redesign find roommates page`

---

### Task 6.3: Redesign Listing Detail Page

**Files:**
- Modify: `apps/web/src/app/(app)/listings/[id]/page.tsx`

**Design ref:** `Design/stitch (9)/stitch/listing_detail_1/code.html` + `listing_detail_2/code.html` + screenshots

**Steps:**

1. Photo gallery at top (grid layout)
2. "A Perfect Match for Your Lifestyle" compatibility card with score
3. "Meet Your Host" section with host info and verification badges
4. Shared Lifestyle comparison
5. Neighbourhood section with map
6. Apartment Features list
7. Compatibility Check highlights
8. Express Booking section with date picker
9. "Contact Host" + "Message Sarah" buttons
10. "TRUST VERIFIED" badge section

11. Commit: `feat: redesign listing detail page`

---

### Task 6.4: Redesign Create Listing Wizard (7 steps)

**Files:**
- Modify: `apps/web/src/app/(app)/listings/new/page.tsx`
- Modify: `apps/web/src/app/(app)/listings/new/steps/step-type.tsx` (and all step files)

**Design ref:** `Design/stitch (9)/stitch/create_listing_step_1/` through `create_listing_review/`

**Steps:**

1. Left panel: Dark navy sidebar with "Let's build your listing." headline + step context
2. Right panel: Step form content
3. Progress bar at top: "STEP X OF 7" with percentage
4. Step 1 (Type & Location): Property type cards (Apartment/House/Townhouse/Other), City + Neighborhood inputs, "Confirm on Map"
5. Professional tip callouts
6. "Verified Listings — We verify 100% of hosts for safety" badge
7. Navigation: "Cancel" + "Continue" buttons
8. Apply new input styles and card styles throughout

9. Commit: `feat: redesign create listing wizard`

---

### Task 6.5: Redesign My Listings Page

**Files:**
- Modify: `apps/web/src/app/(app)/my-listings/page.tsx`

**Design ref:** `Design/stitch (9)/stitch/my_listings/code.html` + `screen.png`

**Steps:**

1. Header: "My Listings" with subtitle
2. Stats row: Total Exposure (DYNAMIC), Active Status count (DYNAMIC), Pending Reviews count (DYNAMIC)
3. Tabs: All Listings, Drafts, Archived
4. "Create New Listing" CTA
5. Listing rows: Photo, title, address, stats (views/messages/last active/match rate), edit/hide/remove actions
6. "Promote Listing" button on active listings

7. Commit: `feat: redesign my listings page`

---

### Task 6.6: Redesign Saved Listings Page

**Files:**
- Modify: `apps/web/src/app/(app)/saved/page.tsx`

**Design ref:** `Design/stitch (9)/stitch/saved_listings/code.html` + `screen.png`

**Steps:**

1. Header: "Your Sanctuary" with subtitle "A curated collection of your potential homes and companions. Managed with intention."
2. Tabs: All Items, Properties, Roommates
3. Mixed grid: Saved listings (with match % badge, price) + Saved roommate profiles
4. "Continue Exploring" card with "Go to Search" link when list is short

5. Commit: `feat: redesign saved listings page`

---

## Phase 7: Profiles & Verification

### Task 7.1: Redesign My Profile Page

**Files:**
- Modify: `apps/web/src/app/(app)/profile/page.tsx`

**Design ref:** `Design/stitch (9)/stitch/my_profile/code.html` + `screen.png`

**Steps:**

1. Profile header: Photo with edit overlay, name, occupation, "PREMIUM MEMBER" badge (= fully verified), location + move date
2. Verification sidebar: Phone/Identity/Credit Score status with green checkmarks
3. Bio section
4. "Lifestyle Compatibility" section: Cleanliness (Tidy Minimalist), Social Battery (Selective Introvert), Noise Tolerance (Deep Focus Only), Daily Routine (Morning Bird) — shown as cards with progress bars
5. "Retake Quiz" link
6. "Living Preferences" section: Pet Friendly, Smoking, Guests, Cooking Style
7. "Employment & Trust" section: Current Employer (verified via LinkedIn), Budget Range (proof of funds submitted)

8. Commit: `feat: redesign my profile page`

---

### Task 7.2: Redesign Public Profile Page

**Files:**
- Modify: `apps/web/src/app/(app)/profile/[userId]/page.tsx`

**Design ref:** `Design/stitch (9)/stitch/public_profile/code.html` + `screen.png`

**Steps:**

1. Profile card: Photo, name, occupation, star rating, review count
2. "Message {Name}" CTA button
3. Verifications list: Government ID, Phone Verified, Work Email status
4. Compatibility Score card (big %, with explanation)
5. Occupation & Languages info
6. "About {Name}" bio section
7. Lifestyle quiz results (Cleanliness, Social Level, Noise Level, Guests)
8. "Recent Reviews" section with reviewer cards

9. Commit: `feat: redesign public profile page`

---

### Task 7.3: Redesign Edit Profile Page

**Files:**
- Modify: `apps/web/src/app/(app)/profile/edit/page.tsx`

**Design ref:** `Design/stitch (9)/stitch/edit_profile/code.html` + `screen.png`

**Steps:**

1. Header: "Edit Profile" + "Manage your personal sanctuary and housing preferences."
2. Profile Photo section with "Change Photo" button
3. Basic Information: Full Name, Age, Gender dropdown, Phone, Occupation
4. About You: Bio textarea with character count (500 max)
5. Location & Language: City/Province, Languages (tag chips with add/remove)
6. Household Situation: Current situation dropdown, Children count +/- stepper
7. Actions: "Discard Changes" + "Save Profile" buttons

8. Commit: `feat: redesign edit profile page`

---

### Task 7.4: Redesign Trust Center (Verification) Page

**Files:**
- Modify: `apps/web/src/app/(app)/verify/page.tsx`

**Design ref:** `Design/stitch (9)/stitch/trust_center/code.html` + `screen.png`

**Steps:**

1. **Rename page title** from "Identity Verification" to "Trust Center"
2. Header with "SECURE PROFILE" badge
3. "Trust Center" heading with subtitle: "Verification is the cornerstone of the NestMatch sanctuary..."
4. Grid of verification cards:
   - Phone Verification (status + verified date)
   - Identity Verification (Government ID, with "VIEW SUBMISSION" link)
   - Credit Insight Check (with Equifax note)
   - Background & Criminal Record Check ("START FREE SCREENING" CTA)
5. "Why Verification Matters" section:
   - Authentic Community
   - Bank-Grade Privacy — **FIX: use "AES-256 encryption" not "ALS-256"**
   - High Trust Matchmaking

6. Commit: `feat: redesign verification as Trust Center`

---

### Task 7.5: Redesign Lifestyle Quiz Page

**Files:**
- Modify: `apps/web/src/app/(app)/quiz/page.tsx`

**Design ref:** `Design/stitch (9)/stitch/lifestyle_quiz/code.html` + `screen.png`

**Steps:**

1. Header: "LIFESTYLE ALIGNMENT" badge, "Discover Your Perfect Sanctuary" heading
2. Progress indicator: Step N of total, with pagination dots
3. Question sections shown simultaneously on page:
   - "What does your daily rhythm look like?" — Early Riser / Night Owl / Flexible/Hybrid cards
   - "Noise & Social Vibes" — Zen Sanctuary / Balanced Living / The Social Hub radio options
   - "Cleanliness Standards" — with explanatory sidebar card
4. Navigation: "Previous Step" + "Save for later" + "Next: Location & Budget"
5. Cards for each option with icons and descriptions

6. Commit: `feat: redesign lifestyle quiz page`

---

## Phase 8: Messaging & Social

### Task 8.1: Redesign Messages Inbox

**Files:**
- Modify: `apps/web/src/app/(app)/messages/page.tsx`

**Design ref:** `Design/stitch (9)/stitch/inbox/code.html` + `screen.png`

**Steps:**

1. **FIX:** Remove `{{DATA:TEXT:TEXT_7}}` — header should show "Messages" or "Inbox"
2. Header: "Inbox" with "You have {N} unread messages" — **DYNAMIC**
3. Filter + "New Message" button
4. Conversation list: Avatar, name, subject line, preview text, timestamp
5. Unread indicators (bold text, colored timestamp)
6. Search bar for filtering messages
7. Sidebar nav items should use standardized sidebar (from Task 3.1)

8. Commit: `feat: redesign messages inbox`

---

### Task 8.2: Redesign Chat Conversation

**Files:**
- Modify: `apps/web/src/app/(app)/messages/[id]/page.tsx`

**Design ref:** `Design/stitch (9)/stitch/chat_conversation/code.html` + `screen.png`

**Steps:**

1. Header: Recipient name + "Active now" + VERIFIED badge + video/call icons
2. Message bubbles: Incoming = light surface, Outgoing = dark navy
3. Timestamps below messages
4. File attachment cards (e.g., PDF with file name, size, type)
5. Typing indicator (three dots animation)
6. Message input: "Type a message..." with attach (+), emoji, send button
7. "Your conversation is encrypted and secure." footer text — **HONESTY CHECK:** Only say this if you actually use E2E encryption. If not, change to "Your messages are stored securely."
8. REPORT and BLOCK USER buttons at bottom
9. Current user shown at bottom-left of sidebar

10. Commit: `feat: redesign chat conversation page`

---

### Task 8.3: Redesign Reviews & Ratings Page

**Files:**
- Modify: `apps/web/src/app/(app)/reviews/page.tsx`

**Design ref:** `Design/stitch (9)/stitch/reviews_ratings/code.html` + `screen.png`

**Steps:**

1. Header: "Reviews & Ratings" with subtitle about community trust
2. Left sidebar: User avatar, member since date, overall rating, review count, stays count
3. "Community Verified" badge with background check count and response rate
4. "AWAITING YOUR FEEDBACK" section: Shows stays where user hasn't left a review yet, with "Leave a Review" CTA
5. "RECENT REVIEWS" section with filter tabs: All, Roommates, Hosts
6. Review cards: Reviewer avatar, name, star rating, date, text
7. "Trait Highlights" section: Cleanliness, Reliability, Communication, Noise Level scores — **DYNAMIC from DB**

8. Commit: `feat: redesign reviews page`

---

## Phase 9: Groups & Finance

### Task 9.1: Redesign Group Details Page

**Files:**
- Modify: `apps/web/src/app/(app)/groups/[id]/page.tsx`

**Design ref:** `Design/stitch (9)/stitch/group_details/code.html` + `screen.png`

**Steps:**

1. Top nav context: Groups | Expenses | Agreement | Payments
2. "VERIFIED GROUP" badge + "Est. {date}"
3. Group name as big heading + mission quote
4. "Edit Mission" + "Invite Member" buttons
5. Three-column layout: Neighborhood Focus (with walk score), Move-in Date (with countdown), Shared Budget breakdown
6. Group Members list: Avatars, names, roles (LEADER/MEMBER), verified status
7. Shared Goals Checklist: Checkable items (Finalize Budget, Verify Identities, Sign Agreement, Schedule Viewing)
8. Expense Summary: Total spend, admin fees vs background checks breakdown, user balance

9. Commit: `feat: redesign group details page`

---

### Task 9.2: Redesign Shared Expenses Page

**Files:**
- Modify: `apps/web/src/app/(app)/expenses/page.tsx`

**Design ref:** `Design/stitch (9)/stitch/shared_expenses/code.html` + `screen.png`

**Steps:**

1. Header: "House Expenses" with subtitle
2. "+ Add Expense" CTA
3. Left column: Your Balance (to receive/owe), Total group spent
4. Settlement Flow: Who owes whom with bar visualization
5. Recent Activity: Expense cards with icon, title, payer, split info, amount, status (Pending/Settled)
6. "Show all activity" link

7. Commit: `feat: redesign shared expenses page`

---

### Task 9.3: Redesign Payment History Page

**Files:**
- Modify: `apps/web/src/app/(app)/payments/page.tsx`

**Design ref:** `Design/stitch (9)/stitch/payment_history/code.html` + `screen.png`

**Steps:**

1. Header: "Payment History" with subtitle
2. "Fully Reconciled" status badge
3. Filters: Date Range picker, Transaction Type dropdown, Filter button
4. Total Monthly summary card (dark navy) — **DYNAMIC**
5. Transaction table: Icon, name, date, category, to/from, status badge, amount
6. "Load More Transactions" button

7. Commit: `feat: redesign payment history page`

---

### Task 9.4: Redesign Payment Methods Page

**Files:**
- Modify: `apps/web/src/app/(app)/settings/payments/page.tsx`

**Design ref:** `Design/stitch (9)/stitch/payment_methods/code.html` + `screen.png`

**Steps:**

1. Header: "SECURITY & BILLING" label, "Payment Methods" heading
2. "+ Add New Card" CTA
3. Stats row: Current Balance, Total Sent (YTD), Total Received (YTD), Active Split Groups
4. Withdraw + Top Up buttons
5. "Verified Payment Methods" section: Card display with Visa/Mastercard logos, last 4 digits, default badge, edit/delete icons
6. "Recent Activity" section with transaction list
7. **FIX:** Change "RANK-GRADE ALS-256 Encryption" to "Bank-Grade AES-256 Encryption"

8. Commit: `feat: redesign payment methods page`

---

## Phase 10: Resources & Tools

### Task 10.1: Redesign Resources Hub

**Files:**
- Modify: `apps/web/src/app/(app)/resources/page.tsx`

**Design ref:** `Design/stitch (9)/stitch/resources_hub/code.html` + `screen.png`

**Steps:**

1. Header: "Resources Hub" with subtitle
2. "Featured Tools" section: Affordability Calculator (prominent), Moving Checklist
3. "Expert Knowledge Base" grid: Legal Rights, Home Insurance, Roommate Contracts, Credit Building — cards with icons
4. "Common Questions" section with expandable FAQ items
5. "Need personalized help?" card — **HONESTY FIX:** Remove "24/7" and "concierge team". Change to "Need help? Email us at support@nestmatch.ca" or "Contact Support" linking to a form

6. Commit: `feat: redesign resources hub`

---

### Task 10.2: Redesign FAQ Page

**Files:**
- Modify: `apps/web/src/app/(app)/resources/faq/page.tsx`
- Modify: `apps/web/src/components/resources/faq-accordion.tsx`

**Design ref:** `Design/stitch (9)/stitch/faq/code.html` + `screen.png`

**Steps:**

1. Header: "Frequently Asked Questions" (Manrope display) with subtitle
2. Left sidebar: Categories (General, Privacy, Payments) + Province filter dropdown
3. "Still need help?" card — **HONESTY FIX:** Remove "24/7" claim
4. Search bar for filtering questions
5. Accordion-style FAQ items with expand/collapse
6. Bottom promotional cards:
   - **REMOVE** "Verified Rent Guarantee" card (escrow feature doesn't exist)
   - Keep "Security Standards" card — **FIX** to say "AES-256 encryption"

7. Commit: `feat: redesign FAQ page`

---

### Task 10.3: Redesign Guide Article Page

**Files:**
- Modify: `apps/web/src/app/(app)/resources/guides/[slug]/page.tsx`

**Design ref:** `Design/stitch (9)/stitch/guide_article/code.html` + `screen.png`

**Steps:**

1. Breadcrumb: NestMatch > Resources > Guides > {Province} Region
2. Article title (large Manrope display)
3. Author tag + Last Updated date
4. Hero image
5. Article content with numbered sections, callout boxes ("Pro Tip"), alert boxes
6. "In this Guide" sidebar table of contents
7. Related articles sidebar
8. "Need Legal Help?" CTA — honest wording only

9. Commit: `feat: redesign guide article page`

---

### Task 10.4: Redesign Rent Split Calculator

**Files:**
- Modify: `apps/web/src/app/(app)/resources/tools/rent-calculator/page.tsx`

**Design ref:** `Design/stitch (9)/stitch/rent_split_calculator/code.html` + `screen.png`

**Steps:**

1. Header: "Fair Share Calculator" with subtitle about the algorithm
2. Total Property Rent input
3. "Define the Sanctuary" section: Room cards with number, name, type, sqft input, bathroom toggle, amenity toggles (Private Balcony, Walk-in Closet, AC Unit)
4. "+ Add Another Room" button
5. "Split Breakdown" card (dark navy): Per-room cost with weight percentage
6. "Create Split Agreement" button with share icon
7. "Fairness Methodology" explanation card

8. Commit: `feat: redesign rent split calculator`

---

### Task 10.5: Redesign Move-In Checklist

**Files:**
- Modify: `apps/web/src/app/(app)/resources/tools/move-in-checklist/page.tsx`

**Design ref:** `Design/stitch (9)/stitch/move_in_checklist/code.html` + `screen.png`

**Steps:**

1. "YOUR SANCTUARY SETUP" badge
2. Header: "Move-In Checklist" with subtitle
3. Print + Export PDF buttons
4. Overall Progress: circular indicator with % complete
5. Inspirational quote
6. Phase sidebar nav: Before Moving, Move-In Day, First Week
7. Phase sections with item count:
   - PHASE 01: Before Moving (checkboxes with URGENT tags)
   - PHASE 02: Move-In Day (cards layout for key items like Photo Documentation, Key Exchange)
   - PHASE 03: First Week (with ADMIN / COMMUNITY tags)
8. Floating "+" button for adding custom items

9. Commit: `feat: redesign move-in checklist`

---

### Task 10.6: Redesign Agreement Generator (all steps)

**Files:**
- Modify: `apps/web/src/app/(app)/resources/agreement/page.tsx`
- Modify: `apps/web/src/app/(app)/resources/agreement/steps/step-basics.tsx`
- Modify: All other step files

**Design ref:** `Design/stitch (9)/stitch/agreement_generator_step_1/` through `agreement_review/`

**Steps:**

1. Step 1 (Basics): Roommates & Co-tenants names, Property Information, Term Dates. "Legal Insights" sidebar card. "Legally Vetted for {Province}" badge. **REMOVE** "Live Concierge" card — replace with "View Example" + "Help Center" links
2. Step 2 (Financials): Per agreement_financials design
3. Step 3 (Lifestyle Rules): Per agreement_lifestyle_rules design
4. Step 4 (Responsibilities): Per agreement_responsibilities design
5. Step 5 (Accommodations): Per agreement_accommodations design
6. Step 6 (Review): Per agreement_review design
7. Tab navigation: BASICS | FINANCIALS | HOUSE RULES | REVIEW
8. "Save as Draft" + "Continue to {Next}" navigation

9. Commit: `feat: redesign agreement generator`

---

## Phase 11: Admin Pages

### Task 11.1: Redesign Admin Dashboard

**Files:**
- Modify: `apps/web/src/app/(app)/admin/page.tsx`

**Design ref:** `Design/stitch (9)/stitch/admin_dashboard/code.html` + `screen.png`

**Steps:**

1. "Welcome back, Curator." greeting
2. Stats cards: Total Resources (DYNAMIC), Active FAQs (DYNAMIC), Uptime Status (DYNAMIC)
3. Pending Questions count with "Review Now" CTA — DYNAMIC
4. Trending Articles list with view counts — DYNAMIC
5. Recent Activity feed from DB
6. Audience Growth chart — DYNAMIC or show "Coming soon"
7. Platform Health: API Response time, Search Latency — DYNAMIC or remove
8. **REMOVE** "NestMatch Security Protocol v4.2" — replace with actual version or remove
9. Admin sidebar: Dashboard, Search, Applications, Messages, Admin Panel

10. Commit: `feat: redesign admin dashboard`

---

### Task 11.2: Redesign Platform Analytics

**Files:**
- Modify: `apps/web/src/app/(app)/admin/analytics/page.tsx`

**Design ref:** `Design/stitch (9)/stitch/platform_analytics_admin/code.html` + `screen.png`

**Steps:**

1. "SYSTEM ANALYTICS" label, "Performance Overview" heading
2. Time period tabs: Last 30 Days, Quarterly, Yearly
3. Stats: Monthly Active Users, Verification Success rate — **ALL DYNAMIC from DB**
4. "Market Liquidity Score" card — only show if you have real matching data
5. User Growth Trajectory chart — wire to real data or show placeholder
6. Popular Listing Types breakdown
7. Security & Trust section: KYC Success, Avg Time, Manual Review %, Rejection % — **ALL DYNAMIC or remove**
8. **REMOVE** "AI biometric integration" reference
9. Trust Score — DYNAMIC

10. Commit: `feat: redesign platform analytics`

---

### Task 11.3: Redesign Admin CRUD Pages

**Files:**
- Modify: Admin resources, FAQs, categories, clauses, questions pages

**Design ref:** `manage_resources_admin/`, `manage_faqs_admin/`, `manage_categories_admin/`, `manage_clauses_admin/`, `manage_questions_admin/`

**Steps:**

1. Apply consistent admin layout with sidebar
2. Data tables with new surface colors
3. Action buttons with new button styles
4. Search/filter bars with new input styles
5. Create/Edit forms with new form styling
6. Status badges with new badge styles

7. Commit: `feat: redesign admin CRUD pages`

---

## Phase 12: Remaining Pages

### Task 12.1: Redesign Groups List Page

**Files:**
- Modify: `apps/web/src/app/(app)/groups/page.tsx`

**Steps:**
1. Apply Sanctuary design tokens (no specific Stitch design for this page — derive from group_details design language)
2. Group cards with member avatars, budget, location, status
3. "Create Group" CTA

4. Commit: `feat: redesign groups list page`

---

### Task 12.2: Redesign Settings Page

**Files:**
- Modify: `apps/web/src/app/(app)/settings/page.tsx`

**Steps:**
1. Apply Sanctuary design tokens
2. Sections: Account, Notifications, Blocked Users, Delete Account
3. Use new surface hierarchy for sections

4. Commit: `feat: redesign settings page`

---

### Task 12.3: Redesign Discover Page

**Files:**
- Modify: `apps/web/src/app/(app)/discover/page.tsx`

**Steps:**
1. Apply Sanctuary design tokens
2. Combine listings + roommate discovery
3. Compatibility-based card layout

4. Commit: `feat: redesign discover page`

---

### Task 12.4: Redesign Calendar Page

**Files:**
- Modify: `apps/web/src/app/(app)/calendar/page.tsx`

**Steps:**
1. Apply Sanctuary design tokens
2. Calendar grid with event cards

3. Commit: `feat: redesign calendar page`

---

## Execution Order & Dependencies

```
Phase 1 (Foundation) → Phase 2 (Components) → Phase 3 (Navigation/Layout)
    ↓
Phase 4-12 can be parallelized after Phase 3 is complete
```

**Critical path:** Phase 1 → Phase 2 → Phase 3 must be sequential.
**After Phase 3:** All page redesigns (Phases 4-12) are independent and can run in parallel via subagents.

---

## Honesty Checklist (verify before marking complete)

- [ ] No hardcoded user counts — all stats query DB
- [ ] No "Live Concierge" or "24/7 support" claims
- [ ] No "Verified Rent Guarantee" or "escrow service" claims
- [ ] No "AI biometric" claims
- [ ] No "Marketplace" nav item
- [ ] "AES-256" not "ALS-256" everywhere
- [ ] "Premium Member" = fully verified, not a paid tier
- [ ] No `{{DATA:TEXT:TEXT_7}}` template artifacts
- [ ] No "NestMatch Security Protocol v4.2" fake branding
- [ ] Chat encryption claim matches reality
- [ ] "Thousands of Canadians" replaced with honest phrasing

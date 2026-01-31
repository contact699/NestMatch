# User Feedback Improvements Design

Based on feedback from Alex regarding profile creation, listings, and search functionality.

---

## Summary of Changes

1. **Province-City Filtering** - Cities filter based on selected province
2. **Household Situation** - New optional field for kids/couples
3. **Work Schedule Options** - Add retired, not working, job seeking
4. **Form Field Order** - Province before City consistently
5. **Bathroom Options** - Add bathroom type and size to listings
6. **Postal Code Privacy** - Hide from public display
7. **Age Filtering Removed** - Remove age-based search filters
8. **Language Preferences** - Soft filter showing matches first

---

## Data Model Changes

### Profiles Table

New fields (optional):
```sql
household_situation TEXT CHECK (household_situation IN (
  'alone',
  'couple',
  'single_parent',
  'couple_with_children',
  'with_roommate'
))

number_of_children INTEGER
```

### Listings Table

New fields:
```sql
bathroom_type TEXT NOT NULL DEFAULT 'shared' CHECK (bathroom_type IN (
  'ensuite',
  'private',
  'shared'
))

bathroom_size TEXT CHECK (bathroom_size IN (
  'full',
  'half',
  'three_quarter'
))
```

### Lifestyle Responses Table

Update `work_schedule` enum to include:
- `retired`
- `not_working`
- `job_seeking`

---

## Constants (src/lib/utils.ts)

### Replace MAJOR_CITIES with CITIES_BY_PROVINCE

```typescript
export const CITIES_BY_PROVINCE: Record<string, string[]> = {
  AB: ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge', 'Medicine Hat', 'Grande Prairie', 'Airdrie'],
  BC: ['Vancouver', 'Victoria', 'Kelowna', 'Kamloops', 'Nanaimo', 'Prince George', 'Abbotsford', 'Surrey', 'Burnaby'],
  MB: ['Winnipeg', 'Brandon', 'Steinbach', 'Thompson'],
  NB: ['Moncton', 'Saint John', 'Fredericton', 'Dieppe'],
  NL: ["St. John's", 'Mount Pearl', 'Corner Brook', 'Conception Bay South'],
  NS: ['Halifax', 'Dartmouth', 'Sydney', 'Truro'],
  NT: ['Yellowknife', 'Hay River', 'Inuvik'],
  NU: ['Iqaluit', 'Rankin Inlet', 'Arviat'],
  ON: ['Toronto', 'Ottawa', 'Mississauga', 'Brampton', 'Hamilton', 'London', 'Markham', 'Vaughan', 'Kitchener', 'Windsor', 'Richmond Hill', 'Oakville', 'Burlington', 'Oshawa', 'Barrie', 'St. Catharines', 'Cambridge', 'Kingston', 'Guelph', 'Thunder Bay'],
  PE: ['Charlottetown', 'Summerside', 'Stratford'],
  QC: ['Montreal', 'Quebec City', 'Laval', 'Gatineau', 'Longueuil', 'Sherbrooke', 'Levis', 'Trois-Rivieres'],
  SK: ['Saskatoon', 'Regina', 'Prince Albert', 'Moose Jaw'],
  YT: ['Whitehorse', 'Dawson City', 'Watson Lake'],
}
```

### Add LANGUAGES

```typescript
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
```

### Add HOUSEHOLD_SITUATIONS

```typescript
export const HOUSEHOLD_SITUATIONS = [
  { value: 'alone', label: 'Living alone' },
  { value: 'couple', label: 'Couple (no children)' },
  { value: 'single_parent', label: 'Single parent with children' },
  { value: 'couple_with_children', label: 'Couple with children' },
  { value: 'with_roommate', label: 'Looking with friend/roommate' },
]
```

### Add BATHROOM_TYPES and BATHROOM_SIZES

```typescript
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
```

---

## File Changes

### 1. src/lib/utils.ts
- Replace `MAJOR_CITIES` with `CITIES_BY_PROVINCE`
- Add `LANGUAGES` array
- Add `HOUSEHOLD_SITUATIONS` array
- Add `BATHROOM_TYPES` array
- Add `BATHROOM_SIZES` array

### 2. src/app/(app)/profile/edit/page.tsx
- Reorder: Province dropdown first, City dropdown second
- City dropdown filters based on selected province
- Add "Household Situation" dropdown (optional)
- Conditionally show "Number of children" field
- Expand language selection with full LANGUAGES list

### 3. src/app/(app)/profile/[userId]/page.tsx
- Display household situation if provided
- Ensure no postal code is displayed
- Display languages prominently

### 4. src/app/(app)/listings/new/steps/step-location.tsx
- Reorder: Province first, City second
- City filters by selected province
- Add helper text to postal code: "Used for search only, not displayed publicly"

### 5. src/app/(app)/listings/new/steps/step-details.tsx
- Add "Bathroom" section with:
  - Bathroom Type (required): radio or select
  - Bathroom Size (optional): radio or select

### 6. src/app/(app)/listings/[id]/page.tsx
- Display bathroom type and size
- Hide postal code from display

### 7. src/app/(app)/listings/[id]/edit/page.tsx
- Add bathroom type and size fields
- Province → City order with filtering

### 8. src/components/listings/listing-card.tsx
- Add bathroom type badge/indicator

### 9. src/components/listings/public-listing-card.tsx
- Add bathroom type badge/indicator

### 10. src/app/(app)/search/page.tsx
- Reorder: Province → City filters
- City filters by selected province
- Remove age range filter
- Add bathroom type filter

### 11. src/app/(app)/roommates/page.tsx
- Reorder: Province → City filters
- Remove age range filter
- Add language soft filter (shows matches first, doesn't exclude)

### 12. src/app/(app)/quiz/page.tsx
- Add work_schedule options:
  - `{ value: 'retired', label: 'Retired', description: 'No fixed work schedule' }`
  - `{ value: 'not_working', label: 'Not Currently Working', description: 'Home most of the day' }`
  - `{ value: 'job_seeking', label: 'Job Seeking', description: 'Schedule may change soon' }`

---

## Database Migration

```sql
-- Add household fields to profiles
ALTER TABLE profiles
ADD COLUMN household_situation TEXT CHECK (household_situation IN ('alone', 'couple', 'single_parent', 'couple_with_children', 'with_roommate')),
ADD COLUMN number_of_children INTEGER;

-- Add bathroom fields to listings
ALTER TABLE listings
ADD COLUMN bathroom_type TEXT NOT NULL DEFAULT 'shared' CHECK (bathroom_type IN ('ensuite', 'private', 'shared')),
ADD COLUMN bathroom_size TEXT CHECK (bathroom_size IN ('full', 'half', 'three_quarter'));
```

---

## Implementation Order

### Phase 1: Foundation
1. Update utils.ts with new constants
2. Run database migration

### Phase 2: Quiz Update
3. Add new work schedule options to quiz

### Phase 3: Profile Updates
4. Update profile edit form (province→city, household, languages)
5. Update profile display pages

### Phase 4: Listing Updates
6. Update listing creation (province→city, bathroom fields)
7. Update listing edit page
8. Update listing display and cards

### Phase 5: Search & Filter Updates
9. Update search page (province→city, remove age, add bathroom filter)
10. Update roommates page (province→city, remove age, add language soft filter)

---

## Verification

1. **Province-City filtering**: Select province, verify only relevant cities appear
2. **Household field**: Create profile with household info, verify displays correctly
3. **Quiz options**: Take quiz, verify retired/not working options available
4. **Bathroom in listings**: Create listing with bathroom info, verify displays on cards and detail page
5. **Postal code hidden**: Verify postal code not visible on any public pages
6. **No age filtering**: Verify age filter removed from search/roommates pages
7. **Language soft filter**: Filter by language, verify non-matches still appear (just lower)
8. **Build passes**: `npm run build` completes without errors

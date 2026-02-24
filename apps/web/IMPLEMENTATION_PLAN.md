# NestMatch Implementation Plan

## Executive Summary

NestMatch is a Canada-focused shared living platform connecting room seekers, room providers, and co-renters. The current codebase is approximately **30% complete** with a solid foundation including authentication, profile management, lifestyle quiz, and database schema. This plan outlines the path to MVP completion and Phase 2 features.

---

## Current State Analysis

### What's Already Built (Complete)
| Feature | Status | Location |
|---------|--------|----------|
| User Authentication | Complete | `src/app/(auth)/` |
| Email/Password Login | Complete | `src/components/auth/LoginForm.tsx` |
| Google OAuth | Complete | `src/components/auth/` |
| Profile Management | Complete | `src/app/(app)/profile/` |
| Lifestyle Quiz (12 questions) | Complete | `src/app/(app)/quiz/` |
| Database Schema (10 tables) | Complete | `supabase/migrations/` |
| Compatibility Algorithm | Complete | SQL function `calculate_compatibility()` |
| Search Page with Filters | Complete | `src/app/search/` |
| UI Component Library | Complete | `src/components/ui/` |
| RLS Security Policies | Complete | Database level |
| Responsive Design | Complete | Tailwind CSS |

### What's Scaffolded (Database Ready, No UI/API)
- Listing CRUD operations
- Messaging system
- Saved listings
- User blocking
- Report system
- Verification records

### What's Missing Entirely
- Listing creation flow
- Messages UI and real-time chat
- Co-renter group functionality
- Verification integrations (Certn, Twilio)
- Payments (Stripe)
- Maps (Mapbox)
- Insurance marketplace
- Moving services booking
- Admin dashboard
- Government info hub
- Settings page

---

## Phase 1: MVP Completion

### 1.1 Listing Management System

**Priority: Critical**

#### 1.1.1 Create Listing Flow
```
Pages needed:
- /listings/new - Multi-step listing creation wizard
- /listings/[id] - Listing detail page
- /listings/[id]/edit - Edit existing listing
- /my-listings - User's listings dashboard
```

**Implementation Steps:**
1. Create listing form with steps:
   - Step 1: Basic Info (type, title, description)
   - Step 2: Location (address, city, province, postal code)
   - Step 3: Details (price, utilities, available date, minimum stay)
   - Step 4: Amenities & Features (checkboxes)
   - Step 5: Photos (upload to Supabase Storage)
   - Step 6: Roommate Preferences (gender, age range, newcomer-friendly)
   - Step 7: Review & Publish

2. API Routes:
   ```
   POST   /api/listings          - Create listing
   GET    /api/listings          - List with filters
   GET    /api/listings/[id]     - Get single listing
   PUT    /api/listings/[id]     - Update listing
   DELETE /api/listings/[id]     - Delete listing
   POST   /api/listings/[id]/views - Increment view count
   ```

3. Image Upload:
   - Configure Supabase Storage bucket `listing-photos`
   - Implement client-side image compression
   - Support up to 10 photos per listing
   - Generate thumbnails for performance

**Database Changes Required:** None (schema exists)

**Components to Build:**
- `ListingForm.tsx` - Multi-step form component
- `ListingDetail.tsx` - Full listing view
- `ImageUploader.tsx` - Drag-and-drop photo upload
- `AmenitySelector.tsx` - Amenity checkbox grid
- `LocationPicker.tsx` - Address autocomplete (Mapbox)

---

#### 1.1.2 Seeking Profile System
```
Pages needed:
- /seeking/new - Create seeking profile
- /seeking/edit - Edit seeking profile
- /seekers - Browse room seekers (for providers)
```

**Implementation Steps:**
1. Seeking profile form:
   - Budget range (min/max)
   - Move-in date
   - Preferred cities (multi-select)
   - Preferred areas (neighborhoods)
   - Description

2. API Routes:
   ```
   POST   /api/seeking-profiles     - Create profile
   GET    /api/seeking-profiles     - List seekers
   GET    /api/seeking-profiles/me  - Get own profile
   PUT    /api/seeking-profiles/me  - Update profile
   DELETE /api/seeking-profiles/me  - Delete profile
   ```

---

### 1.2 Messaging System

**Priority: Critical**

#### 1.2.1 Core Messaging
```
Pages needed:
- /messages - Inbox with conversation list
- /messages/[conversationId] - Chat thread
```

**Implementation Steps:**

1. Conversation Initiation:
   - "Contact" button on listings/profiles
   - Create conversation if doesn't exist
   - Link conversation to listing (optional)

2. Message Thread:
   - Real-time updates via Supabase Realtime
   - Message status (sent, delivered, read)
   - Typing indicators (optional for MVP)
   - File attachments (Supabase Storage)

3. API Routes:
   ```
   GET    /api/conversations              - List user's conversations
   POST   /api/conversations              - Start new conversation
   GET    /api/conversations/[id]         - Get conversation details
   GET    /api/conversations/[id]/messages - Get messages
   POST   /api/conversations/[id]/messages - Send message
   PUT    /api/messages/[id]/read         - Mark as read
   ```

4. Real-time Subscription:
   ```typescript
   // Subscribe to new messages
   supabase
     .channel('messages')
     .on('postgres_changes', {
       event: 'INSERT',
       schema: 'public',
       table: 'messages',
       filter: `conversation_id=eq.${conversationId}`
     }, handleNewMessage)
     .subscribe()
   ```

**Components to Build:**
- `ConversationList.tsx` - Sidebar with conversations
- `ChatThread.tsx` - Message display
- `MessageInput.tsx` - Compose message with attachments
- `MessageBubble.tsx` - Individual message display
- `UnreadBadge.tsx` - Unread count indicator

---

### 1.3 Likes & Saves System

**Priority: High**

```
Pages needed:
- /saved - Saved listings grid
```

**Implementation Steps:**

1. Save/Unsave Actions:
   - Heart icon on listing cards
   - Optimistic UI updates
   - Persist to `saved_listings` table

2. API Routes:
   ```
   GET    /api/saved-listings           - Get saved listings
   POST   /api/saved-listings           - Save listing
   DELETE /api/saved-listings/[listingId] - Unsave
   ```

**Components to Build:**
- `SaveButton.tsx` - Animated heart button
- `SavedListingsGrid.tsx` - Grid of saved items

---

### 1.4 Basic ID Verification (Phase 1 Scope)

**Priority: High**

For MVP, implement a simplified verification flow:

1. **Email Verification** (Already implemented via Supabase)

2. **Phone Verification** (Twilio):
   ```
   Flow:
   1. User enters phone number
   2. Send SMS code via Twilio Verify
   3. User enters code
   4. Update profile.phone_verified = true
   ```

3. **ID Verification** (Certn - Basic):
   ```
   Flow:
   1. User initiates verification
   2. Redirect to Certn widget
   3. Certn calls webhook on completion
   4. Update verifications table
   5. Update profile.verification_level
   ```

**API Routes:**
```
POST /api/verify/phone/send    - Send SMS code
POST /api/verify/phone/confirm - Verify code
POST /api/verify/id/initiate   - Start Certn flow
POST /api/webhooks/certn       - Certn webhook
```

**Verification Levels:**
- `basic` - Email verified only
- `verified` - Email + Phone verified
- `trusted` - Email + Phone + ID verified

---

### 1.5 Property Listings (Business Users)

**Priority: Medium**

Extend listing system for business users:

1. **Business Account Flag:**
   - Add `is_business` boolean to profiles
   - Add `business_name`, `business_type` fields

2. **Featured Listings:**
   - Add `is_featured` boolean to listings
   - Featured listings appear first in search
   - Requires payment (Phase 2)

---

## Phase 2: Enhanced Features

### 2.1 Payments & Financial Features

**Priority: Critical for Phase 2**

#### 2.1.1 Stripe Integration

**Database Changes:**
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id UUID REFERENCES profiles(id),
  recipient_id UUID REFERENCES profiles(id),
  listing_id UUID REFERENCES listings(id),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'CAD',
  type VARCHAR(50) NOT NULL, -- 'rent', 'utility', 'service', 'featured_listing'
  status VARCHAR(50) NOT NULL, -- 'pending', 'completed', 'failed', 'refunded'
  stripe_payment_intent_id VARCHAR(255),
  stripe_transfer_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  stripe_payment_method_id VARCHAR(255),
  type VARCHAR(50), -- 'card', 'bank_account'
  last_four VARCHAR(4),
  brand VARCHAR(50),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payout_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  stripe_connect_account_id VARCHAR(255),
  status VARCHAR(50), -- 'pending', 'active', 'restricted'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Implementation:**
1. Stripe Connect for marketplace payments
2. Payment intents for secure transactions
3. Automatic payouts to providers
4. Receipt generation (PDF)
5. Transaction history

**API Routes:**
```
POST   /api/payments/intents          - Create payment intent
POST   /api/payments/confirm          - Confirm payment
GET    /api/payments/history          - Transaction history
POST   /api/payments/methods          - Add payment method
DELETE /api/payments/methods/[id]     - Remove payment method
POST   /api/connect/onboard           - Start Stripe Connect onboarding
GET    /api/connect/status            - Check Connect account status
```

#### 2.1.2 Bill Splitting

**Database Changes:**
```sql
CREATE TABLE shared_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id),
  created_by UUID REFERENCES profiles(id),
  title VARCHAR(255) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  split_type VARCHAR(50), -- 'equal', 'percentage', 'custom'
  due_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expense_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES shared_expenses(id),
  user_id UUID REFERENCES profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid'
  paid_at TIMESTAMPTZ
);
```

---

### 2.2 Ratings & Reviews

**Priority: High for Phase 2**

**Database Changes:**
```sql
CREATE TABLE cohabitation_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id),
  provider_id UUID REFERENCES profiles(id),
  seeker_id UUID REFERENCES profiles(id),
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohabitation_id UUID REFERENCES cohabitation_periods(id),
  reviewer_id UUID REFERENCES profiles(id),
  reviewee_id UUID REFERENCES profiles(id),
  -- Rating criteria
  rent_payment_rating INTEGER CHECK (rent_payment_rating BETWEEN 1 AND 5),
  cleanliness_rating INTEGER CHECK (cleanliness_rating BETWEEN 1 AND 5),
  respect_rating INTEGER CHECK (respect_rating BETWEEN 1 AND 5),
  communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
  overall_rating DECIMAL(2,1) GENERATED ALWAYS AS (
    (COALESCE(rent_payment_rating,0) + COALESCE(cleanliness_rating,0) +
     COALESCE(respect_rating,0) + COALESCE(communication_rating,0)) / 4.0
  ) STORED,
  comment TEXT,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- One review per cohabitation per reviewer
  UNIQUE(cohabitation_id, reviewer_id)
);
```

**Components:**
- `ReviewForm.tsx` - Star rating inputs
- `ReviewCard.tsx` - Display individual review
- `ReviewSummary.tsx` - Aggregate rating display
- `ReviewPrompt.tsx` - Prompt to leave review after cohabitation

---

### 2.3 Insurance Integration

**Priority: Medium for Phase 2**

**Approach:** Partner integration, not underwriting

**Implementation:**
1. Insurance partner API integration (e.g., Square One, Duuo)
2. Quote request form
3. Redirect to partner for purchase
4. Store policy reference only

**Database Changes:**
```sql
CREATE TABLE insurance_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  provider VARCHAR(100),
  policy_number VARCHAR(100),
  coverage_type VARCHAR(50),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2.4 Moving Services Marketplace

**Priority: Low for Phase 2**

**Database Changes:**
```sql
CREATE TABLE service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  business_name VARCHAR(255) NOT NULL,
  service_type VARCHAR(50), -- 'moving', 'cleaning', 'storage'
  description TEXT,
  service_areas TEXT[], -- cities/provinces served
  logo_url TEXT,
  website_url TEXT,
  phone VARCHAR(20),
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE service_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES service_providers(id),
  customer_id UUID REFERENCES profiles(id),
  service_date DATE,
  details JSONB,
  status VARCHAR(50), -- 'requested', 'confirmed', 'completed', 'cancelled'
  total_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2.5 Co-Renter Groups

**Priority: Medium for Phase 2**

**Database Changes:**
```sql
CREATE TABLE co_renter_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  description TEXT,
  combined_budget_min DECIMAL(10,2),
  combined_budget_max DECIMAL(10,2),
  target_move_date DATE,
  preferred_cities TEXT[],
  status VARCHAR(50) DEFAULT 'forming', -- 'forming', 'searching', 'matched'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE co_renter_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES co_renter_groups(id),
  user_id UUID REFERENCES profiles(id),
  role VARCHAR(50) DEFAULT 'member', -- 'admin', 'member'
  budget_contribution DECIMAL(10,2),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE co_renter_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES co_renter_groups(id),
  inviter_id UUID REFERENCES profiles(id),
  invitee_id UUID REFERENCES profiles(id),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Features:**
- Create/join co-renter group
- Combined profile showing all members
- Group chat
- Joint search with combined budget
- Compatibility matching within group

---

## Technical Architecture

### API Structure
```
src/
  app/
    api/
      listings/
        route.ts              # GET (list), POST (create)
        [id]/
          route.ts            # GET, PUT, DELETE
          views/
            route.ts          # POST (increment views)
      conversations/
        route.ts              # GET (list), POST (create)
        [id]/
          route.ts            # GET details
          messages/
            route.ts          # GET, POST
      saved-listings/
        route.ts              # GET, POST
        [listingId]/
          route.ts            # DELETE
      verify/
        phone/
          send/route.ts       # POST
          confirm/route.ts    # POST
        id/
          initiate/route.ts   # POST
      webhooks/
        certn/route.ts        # POST
        stripe/route.ts       # POST
      payments/
        intents/route.ts      # POST
        confirm/route.ts      # POST
        history/route.ts      # GET
        methods/
          route.ts            # GET, POST
          [id]/route.ts       # DELETE
```

### Component Structure
```
src/
  components/
    listings/
      ListingForm/
        index.tsx
        BasicInfoStep.tsx
        LocationStep.tsx
        DetailsStep.tsx
        AmenitiesStep.tsx
        PhotosStep.tsx
        PreferencesStep.tsx
        ReviewStep.tsx
      ListingCard.tsx
      ListingDetail.tsx
      ListingGrid.tsx
    messages/
      ConversationList.tsx
      ChatThread.tsx
      MessageInput.tsx
      MessageBubble.tsx
    verification/
      PhoneVerification.tsx
      IDVerification.tsx
      VerificationStatus.tsx
    payments/
      PaymentForm.tsx
      PaymentHistory.tsx
      BillSplitter.tsx
    reviews/
      ReviewForm.tsx
      ReviewCard.tsx
      ReviewSummary.tsx
```

### State Management
- Server Components for data fetching
- React Query for client-side caching (consider adding)
- Supabase Realtime for live updates
- URL state for filters/pagination

### Security Considerations
1. **RLS Policies** - Already implemented for core tables
2. **Input Validation** - Zod schemas for all API endpoints
3. **Rate Limiting** - Implement for sensitive endpoints
4. **File Upload Security** - Validate file types, scan for malware
5. **Payment Security** - PCI compliance via Stripe
6. **Data Privacy** - PIPEDA compliance, consent management

---

## Third-Party Integration Strategy

### Required Integrations

| Service | Purpose | Priority | Complexity |
|---------|---------|----------|------------|
| Supabase | Database, Auth, Storage, Realtime | Already integrated | Low |
| Stripe | Payments | Phase 2 | High |
| Twilio Verify | Phone verification | Phase 1 | Medium |
| Certn | ID/Background checks | Phase 1 | Medium |
| Mapbox | Maps, Geocoding | Phase 1 | Medium |
| SendGrid/Resend | Transactional emails | Phase 1 | Low |

### Integration Architecture

```
Third-Party Services
         |
         v
  Webhook Endpoints (/api/webhooks/*)
         |
         v
  Service Layer (src/lib/services/)
    - certn.ts
    - twilio.ts
    - stripe.ts
    - mapbox.ts
    - email.ts
         |
         v
  API Routes (/api/*)
         |
         v
  Frontend Components
```

### Mapbox Integration
```typescript
// src/lib/services/mapbox.ts
export async function geocodeAddress(address: string) {
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?` +
    `access_token=${process.env.MAPBOX_ACCESS_TOKEN}&country=CA`
  );
  return response.json();
}

export async function reverseGeocode(lat: number, lng: number) {
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
    `access_token=${process.env.MAPBOX_ACCESS_TOKEN}`
  );
  return response.json();
}
```

### Certn Integration
```typescript
// src/lib/services/certn.ts
export async function initiateVerification(userId: string, email: string) {
  const response = await fetch('https://api.certn.co/hr/v1/applications/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CERTN_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      request_identity_verification: true,
      request_softcheck: false, // Enable for credit check
      request_criminal_record_check: false // Enable for criminal check
    })
  });
  return response.json();
}
```

---

## Development Milestones

### Milestone 1: Listing System (2-3 weeks)
- [ ] Listing creation wizard
- [ ] Listing detail page
- [ ] My listings dashboard
- [ ] Image upload to Supabase Storage
- [ ] Basic Mapbox integration for location

### Milestone 2: Messaging System (2 weeks)
- [ ] Conversation list
- [ ] Chat thread with real-time updates
- [ ] Message notifications
- [ ] File attachments

### Milestone 3: Save & Block (1 week)
- [ ] Save/unsave listings
- [ ] Saved listings page
- [ ] Block users
- [ ] Report system UI

### Milestone 4: Verification (2 weeks)
- [ ] Phone verification (Twilio)
- [ ] ID verification (Certn)
- [ ] Verification badges
- [ ] Settings page

### Milestone 5: MVP Polish (1 week)
- [ ] Email notifications
- [ ] Loading states
- [ ] Error handling
- [ ] Mobile optimization
- [ ] Performance audit

### Milestone 6: Phase 2 - Payments (3 weeks)
- [ ] Stripe Connect onboarding
- [ ] Payment flow
- [ ] Transaction history
- [ ] Bill splitting

### Milestone 7: Phase 2 - Reviews (2 weeks)
- [ ] Cohabitation tracking
- [ ] Review submission
- [ ] Review display
- [ ] Rating aggregation

### Milestone 8: Phase 2 - Additional Features (4 weeks)
- [ ] Co-renter groups
- [ ] Insurance marketplace
- [ ] Moving services
- [ ] Admin dashboard

---

## Testing Strategy

### Unit Tests
- API route handlers
- Utility functions
- Validation schemas

### Integration Tests
- Authentication flows
- Listing CRUD
- Messaging
- Payment flows

### E2E Tests (Playwright)
- User registration
- Profile completion
- Listing creation
- Search and filter
- Message exchange
- Payment flow

### Test Environment
- Supabase local development
- Stripe test mode
- Twilio test credentials
- Mock Certn responses

---

## Deployment Strategy

### Environments
1. **Development** - Local + Supabase dev project
2. **Staging** - Vercel preview + Supabase staging
3. **Production** - Vercel production + Supabase production

### CI/CD Pipeline
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test

  deploy-preview:
    needs: test
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

### Environment Variables
```
# Production required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Phase 1
CERTN_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=
MAPBOX_ACCESS_TOKEN=
RESEND_API_KEY=

# Phase 2
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## Compliance Considerations

### Canadian Privacy (PIPEDA)
- Clear consent for data collection
- Right to access personal data
- Right to correction
- Data breach notification

### Provincial Tenancy Laws
- Disclaimer that platform doesn't constitute tenancy agreement
- Links to provincial tenancy boards
- Information is educational, not legal advice

### Verification Data
- Never store raw ID documents
- Use certified third-party providers
- Clear data retention policies
- User consent for background checks

### Accessibility (AODA/ACA)
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- Color contrast requirements

---

## Success Metrics

### Phase 1 KPIs
- User registrations
- Profile completion rate
- Listings created
- Messages sent
- Verification adoption rate

### Phase 2 KPIs
- Match success rate (message → agreement)
- Payment volume
- Review completion rate
- Report/block frequency
- User retention (30/60/90 day)

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Verification API downtime | High | Graceful degradation, retry logic |
| Payment disputes | High | Clear policies, Stripe dispute handling |
| Fake listings | Medium | Verification requirements, reporting |
| User safety incidents | Critical | Background checks, reporting, moderation |
| Data breach | Critical | Encryption, RLS, security audits |
| Scalability issues | Medium | CDN, database indexes, caching |

---

## Next Steps

1. **Immediate**: Complete listing creation system
2. **Week 2**: Implement messaging with real-time
3. **Week 3**: Add save/block functionality
4. **Week 4**: Integrate phone verification (Twilio)
5. **Week 5**: Integrate ID verification (Certn)
6. **Week 6**: Polish, testing, MVP launch

Ready to begin implementation. Start with Milestone 1: Listing System.

# NestMatch Optimization Plan

## Overview
Complete remaining optimizations for the NestMatch codebase to improve code quality, performance, and consistency.

## Tasks

### 1. Extract Shared Helpers
- [ ] Create `src/components/ui/loading-spinner.tsx` - standardized loading component
- [ ] Create `src/components/ui/status-badge.tsx` - shared status badge helpers
- [ ] Update pages to use new shared components

### 2. Batch Dashboard Queries
- [ ] Refactor `src/app/(app)/dashboard/page.tsx` to reduce 5 queries to 2

### 3. Standardize API Error Responses
- [ ] Create error response helper in `src/lib/api-utils.ts`
- [ ] Update API routes to use consistent error format

### 4. Split Large Files
- [ ] Split `src/app/(app)/listings/new/page.tsx` (700 lines) into step components
- [ ] Split `src/app/(app)/groups/[id]/page.tsx` (671 lines) - extract InviteModal
- [ ] Split `src/app/page.tsx` (573 lines) - extract landing page sections

### 5. Performance Optimizations
- [ ] Add React.memo to Navbar component
- [ ] Lazy load landing page icons

## Execution Order
1. Shared helpers (foundation for other changes)
2. Dashboard queries (quick win)
3. API error standardization
4. Split large files
5. Performance optimizations

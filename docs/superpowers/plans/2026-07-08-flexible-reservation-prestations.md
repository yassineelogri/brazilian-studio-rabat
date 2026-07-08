# Flexible Reservation Prestations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admin create/edit reservation prestations with optional price, and show active prestations in client booking.

**Architecture:** Add nullable `price` to `services`. Keep `/dashboard/services` as admin source of truth. Use small service helper functions for validation and display labels so behavior can be tested outside React.

**Tech Stack:** Next.js 14, React 18, Supabase, TypeScript, Node built-in test runner.

## Global Constraints

- Price is optional and stored as integer DH on `services.price`.
- Inactive services stay hidden from `/booking`.
- Do not hard-delete services because appointments reference `services.id`.
- New UI follows existing dashboard inline-style patterns.

---

### Task 1: Service Helper And Tests

**Files:**
- Create: `src/lib/services.ts`
- Create: `src/lib/services.test.mjs`

**Interfaces:**
- Produces: `formatDurationRange(minDuration: number, maxDuration: number): string`
- Produces: `formatServicePrice(price: number | null | undefined): string | null`
- Produces: `validateServiceInput(input: ServiceInput): string | null`

- [ ] Write failing Node tests for duration, optional price, and validation.
- [ ] Run `node src/lib/services.test.mjs` and confirm failure because helper file is missing.
- [ ] Implement helper functions.
- [ ] Run `node src/lib/services.test.mjs` and confirm pass.

### Task 2: Database Type And Migration

**Files:**
- Create: `supabase/migrations/011_services_optional_price.sql`
- Modify: `src/lib/supabase/types.ts`

**Interfaces:**
- Adds `Service.price: number | null`

- [ ] Add migration with `alter table services add column if not exists price integer;`.
- [ ] Update TypeScript `Service` type.
- [ ] Run TypeScript verification.

### Task 3: Admin Prestations UI

**Files:**
- Modify: `src/app/dashboard/services/page.tsx`

**Interfaces:**
- Consumes helper functions from `src/lib/services.ts`.
- Writes rows into Supabase `services`.

- [ ] Add creation form.
- [ ] Add editable fields: name, description, min duration, max duration, optional price, color, active.
- [ ] Replace delete with active/inactive toggle only.
- [ ] Show validation errors before saving.

### Task 4: Booking Display

**Files:**
- Modify: `src/components/booking/ServiceStep.tsx`

**Interfaces:**
- Consumes `formatDurationRange` and `formatServicePrice`.

- [ ] Display optional price beside duration.
- [ ] Keep current active-services query unchanged.
- [ ] Run build verification.

# Flexible Reservation Prestations - Design Spec

**Date:** 2026-07-08
**Project:** Brazilian Studio Rabat
**Feature:** Admin-managed reservation prestations with optional price

## Overview

The admin dashboard can create and update reservation prestations. Active prestations appear automatically in the client booking flow. Price is optional: if admin leaves it empty, clients see only service name and duration; if admin fills it, clients also see the price in DH.

## Data Model

Add a nullable `price` column to `services`:

```sql
alter table services
  add column if not exists price integer;
```

Existing services keep `price = null`, so production data remains valid. Existing appointments keep their service references.

## Admin Experience

`/dashboard/services` becomes the source of truth for reservation prestations:

- Create a prestation with name, optional description, min/max duration, optional price, color, and active status.
- Edit the same fields for existing prestations.
- Deactivate/reactivate a prestation instead of deleting it, because previous appointments may reference it.
- Show active/inactive state in the list.

## Client Booking Experience

`/booking` already loads active rows from `services`. The service selection step will show:

- service name
- duration range
- optional price label, displayed only when `price` exists

Inactive services stay hidden from the client reservation flow.

## Validation

Admin form validation:

- name required
- min duration and max duration must be positive numbers
- max duration cannot be less than min duration
- price can be empty or a positive number

API/database validation remains light because the current admin page writes through the existing Supabase client and RLS staff policy.

## Files

- `supabase/migrations/011_services_optional_price.sql`
- `src/lib/supabase/types.ts`
- `src/app/dashboard/services/page.tsx`
- `src/components/booking/ServiceStep.tsx`

## Verification

- Run TypeScript/build verification.
- Confirm admin service creation works with optional price in local UI.
- Confirm booking list displays newly active services and hides inactive services.

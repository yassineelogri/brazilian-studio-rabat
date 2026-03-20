import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Server-side client with service_role key — bypasses RLS
// NEVER import this in client components
export function createServerSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Anon client for server-side reads (respects RLS)
export function createAnonSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
}

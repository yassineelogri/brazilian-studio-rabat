export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServerSupabaseClient } from '@/lib/supabase/server'


export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/espace-client?error=invalid_link`)
  }

  // Build the redirect response first so we can set cookies on it
  const successResponse = NextResponse.redirect(`${origin}/espace-client/dashboard`)
  const errorResponse = (err: string) =>
    NextResponse.redirect(`${origin}/espace-client?error=${err}`)

  // Use @supabase/ssr createServerClient to exchange code + write session cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            successResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !user || !user.email) {
    // Supabase returns 'invalid_grant' or 'otp_expired' for expired magic links
    const isExpired = error?.message?.toLowerCase().includes('expir') || error?.code === 'otp_expired'
    return errorResponse(isExpired ? 'expired' : 'invalid_link')
  }

  // Link auth user to clients row (use service_role to bypass RLS)
  const admin = createServerSupabaseClient()
  let { data: client } = await admin
    .from('clients')
    .select('id, auth_user_id')
    .eq('email', user.email)
    .limit(1)
    .maybeSingle()

  // First visit without any prior booking: create the client record so
  // account registration works for brand-new visitors too
  if (!client) {
    const fallbackName = user.email.split('@')[0].replace(/[._-]+/g, ' ').trim() || 'Cliente'
    const { data: created, error: createError } = await admin
      .from('clients')
      .insert({ name: fallbackName, phone: '', email: user.email, auth_user_id: user.id })
      .select('id, auth_user_id')
      .single()
    if (createError || !created) {
      console.error('Failed to create client record on first login:', createError)
      return errorResponse('server_error')
    }
    client = created
  }

  if (!client.auth_user_id) {
    const { error: updateError } = await admin
      .from('clients')
      .update({ auth_user_id: user.id })
      .eq('id', client.id)
    if (updateError) {
      console.error('Failed to link auth_user_id to client:', updateError)
      return NextResponse.redirect(new URL('/espace-client?error=server_error', origin))
    }
  }

  return successResponse
}

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServerSupabaseClient } from '@/lib/supabase/server'


export async function POST(request: NextRequest) {
  try {
    const { email, token } = await request.json()
    
    if (!email || !token) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    }

    const successResponse = NextResponse.json({ ok: true })

    // Use @supabase/ssr createServerClient to verify OTP + write session cookies
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

    const { data: { user }, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    })

    if (error || !user || !user.email) {
      return NextResponse.json({ error: 'invalid_code' }, { status: 401 })
    }

    // Link auth user to clients row (use service_role to bypass RLS)
    const admin = createServerSupabaseClient()
    let { data: client } = await admin
      .from('clients')
      .select('id, auth_user_id')
      .eq('email', user.email)
      .limit(1)
      .maybeSingle()

    // First visit without any prior booking: create the client record
    if (!client) {
      const fallbackName = user.email.split('@')[0].replace(/[._-]+/g, ' ').trim() || 'Cliente'
      const { data: created, error: createError } = await admin
        .from('clients')
        .insert({ name: fallbackName, phone: '', email: user.email, auth_user_id: user.id })
        .select('id, auth_user_id')
        .single()
      
      if (createError || !created) {
        console.error('Failed to create client record on first login:', createError)
        return NextResponse.json({ error: 'server_error' }, { status: 500 })
      }
      client = created
    }

    if (client.auth_user_id !== user.id) {
      const { error: updateError } = await admin
        .from('clients')
        .update({ auth_user_id: user.id })
        .eq('id', client.id)
      
      if (updateError) {
        console.error('Failed to link auth_user_id to client:', updateError)
        return NextResponse.json({ error: 'server_error' }, { status: 500 })
      }
    }

    return successResponse
  } catch (err) {
    console.error('POST /api/client/auth/verify-otp error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createAnonSupabaseClient } from '@/lib/supabase/server'


export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 422 })
    }

    const supabase = createAnonSupabaseClient()
    // Canonical URL only: trailing slashes stripped, and never a preview/localhost
    // URL in production — Supabase silently falls back to its Site URL setting
    // when redirect_to is not an exact allow-list match.
    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.NODE_ENV === 'production'
        ? 'https://brazilian-studio-rabat.vercel.app'
        : 'http://localhost:3000')
    ).replace(/\/+$/, '')

    await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${siteUrl}/api/client/auth/callback`,
      },
    })

    // Always return 200 — never reveal whether email exists (prevents enumeration)
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error('POST /api/client/auth/magic-link error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}

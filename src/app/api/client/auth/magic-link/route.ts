import { createAnonSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 422 })
    }

    const supabase = createAnonSupabaseClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

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

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const client = await requireClient()
    if (!client) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    return NextResponse.json(client, { status: 200 })
  } catch (err) {
    console.error('GET /api/client/profile error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const client = await requireClient()
    if (!client) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, phone } = body

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json({ error: 'name is required' }, { status: 422 })
      }
    }
    if (phone !== undefined) {
      if (typeof phone !== 'string' || phone.trim() === '') {
        return NextResponse.json({ error: 'phone is required' }, { status: 422 })
      }
    }

    const updates: Record<string, string> = {}
    if (name !== undefined) updates.name = name.trim()
    if (phone !== undefined) updates.phone = phone.trim()

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(client, { status: 200 })
    }

    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', client.id)
      .select('id, name, phone, email')
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 200 })
  } catch (err) {
    console.error('PATCH /api/client/profile error:', err)
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 })
  }
}

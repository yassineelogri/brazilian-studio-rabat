import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const STAFF_PATHS = ['/dashboard']
const CLIENT_PATHS = [
  '/espace-client/dashboard',
  '/espace-client/appointments',
  '/espace-client/devis',
  '/espace-client/factures',
  '/espace-client/profile',
  '/espace-client/set-password',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isStaffPath = STAFF_PATHS.some(p => pathname.startsWith(p))
  const isClientPath = CLIENT_PATHS.some(p => pathname.startsWith(p))

  if (!isStaffPath && !isClientPath) {
    return NextResponse.next()
  }

  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    if (isStaffPath) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    // Client path — redirect to espace-client login
    return NextResponse.redirect(new URL('/espace-client', request.url))
  }

  // Staff area requires the staff role claim (app_metadata is server-controlled,
  // set via the admin API only — a client session can never reach /dashboard)
  if (isStaffPath && user.app_metadata?.role !== 'staff') {
    return NextResponse.redirect(new URL('/espace-client/dashboard', request.url))
  }

  return response
}

export const config = {
  // Only intercept paths that require auth — keep /espace-client (login) and /espace-client/acces/* (public token pages) out of middleware
  matcher: [
    '/dashboard/:path*',
    '/espace-client/dashboard/:path*',
    '/espace-client/appointments/:path*',
    '/espace-client/devis/:path*',
    '/espace-client/factures/:path*',
    '/espace-client/profile/:path*',
    '/espace-client/set-password/:path*',
  ],
}

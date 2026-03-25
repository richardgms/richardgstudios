import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = 'rgs_auth'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas públicas — login e API de auth passam sem verificação
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  const authCookie = request.cookies.get(COOKIE_NAME)
  const authSecret = process.env.AUTH_SECRET

  if (!authSecret || !authCookie || authCookie.value !== authSecret) {
    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/') {
      loginUrl.searchParams.set('from', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.webmanifest|offline|icons/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)',
  ],
}

import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'rgs_auth'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 dias

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  const sitePassword = process.env.SITE_PASSWORD
  const authSecret = process.env.AUTH_SECRET

  if (!sitePassword || !authSecret) {
    return NextResponse.json(
      { error: 'Auth não configurado no servidor' },
      { status: 500 }
    )
  }

  // Comparação timing-safe para evitar timing attacks
  const encoder = new TextEncoder()
  const a = encoder.encode(password ?? '')
  const b = encoder.encode(sitePassword)

  let match = a.length === b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) match = false
  }

  if (!match) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAME, authSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })

  return response
}

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/verify',
  '/api/stock/sync',
  '/api/stock/decrement',
  '/api/products/bulk-update',
  '/api/stock/bulk-reset',
  '/api/products/bulk-config',
  '/api/sales/sync',
  '/api/reports/mysql',
]

const SECRET = process.env.SESSION_SECRET || 'default-insecure-secret-change-me'

function getCookieValue(cookies: string, name: string): string | null {
  const match = cookies.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

async function sign(payload: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const hex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')
  return payload + '.' + hex
}

async function verify(token: string): Promise<boolean> {
  const parts = token.split('.')
  if (parts.length < 2) return false
  const hex = parts.pop()!
  const payload = parts.join('.')
  const expected = await sign(payload)
  return expected === token
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith('/api/auth/'))) {
    return NextResponse.next()
  }

  const cookieHeader = request.headers.get('cookie') || ''
  const token = getCookieValue(cookieHeader, 'bazar_session')

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const isValid = await verify(token)

  if (!isValid) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('bazar_session')
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|icons|manifest.json|sw.js|favicon.ico).*)'],
}
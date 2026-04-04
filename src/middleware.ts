import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/verify',
  '/api/auth/webauthn/authenticate',
  '/api/auth/webauthn/available',
  '/api/auth/webauthn/register',
  '/api/stock/sync',
  '/api/stock/decrement',
  '/api/sales/sync',
  '/api/reports/mysql',
  '/api/site/generate',
  '/api/health',
]

const SECRET = process.env.SESSION_SECRET
if (!SECRET) {
  throw new Error('SESSION_SECRET environment variable is required')
}

const encoder = new TextEncoder()

async function sign(payload: string): Promise<string> {
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

  try {
    const parsed = JSON.parse(payload)
    if (parsed.exp && parsed.exp < Date.now()) {
      return false
    }
  } catch {
    return false
  }

  const expected = await sign(payload)
  return expected === token
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith('/api/auth/'))) {
    return NextResponse.next()
  }

  const token = request.cookies.get('bazar_session')?.value

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

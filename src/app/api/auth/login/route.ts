import { NextRequest, NextResponse } from 'next/server'

const SECRET = process.env.SESSION_SECRET
if (!SECRET) {
  throw new Error('SESSION_SECRET environment variable is required')
}
const VALID_PASSWORD = process.env.AUTH_PASSWORD || ''

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const password = body?.password
    const rememberDevice = body?.rememberDevice

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Senha obrigatória' }, { status: 400 })
    }

    if (password !== VALID_PASSWORD) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
    }

    const maxAge = rememberDevice ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60
    const payload = JSON.stringify({
      auth: true,
      exp: Date.now() + maxAge * 1000,
    })

    const token = await sign(payload)

    const response = NextResponse.json({ ok: true })
    response.cookies.set('bazar_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[Auth] Login error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

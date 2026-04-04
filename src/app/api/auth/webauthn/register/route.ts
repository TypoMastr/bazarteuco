import { NextRequest, NextResponse } from 'next/server'
import { createCredential, hasCredentials } from '@/lib/webauthn-mysql'
import crypto from 'crypto'

const VALID_PASSWORD = process.env.AUTH_PASSWORD || ''
const SECRET = process.env.SESSION_SECRET || 'default-insecure-secret-change-me'

async function sign(payload: string): Promise<string> {
  return new Promise((resolve) => {
    const encoder = new TextEncoder()
    crypto.subtle.importKey(
      'raw',
      encoder.encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    ).then(async (key) => {
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
      const hex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')
      resolve(payload + '.' + hex)
    })
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password, publicKey, credentialId, deviceName } = body

    if (password !== VALID_PASSWORD) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
    }

    if (!publicKey || !credentialId) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    await createCredential(credentialId, publicKey, 0, deviceName || 'Unknown Device')

    const payload = JSON.stringify({
      auth: true,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    })
    const token = await sign(payload)

    const response = NextResponse.json({ ok: true, registered: true })
    response.cookies.set('bazar_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[WebAuthn] Register error:', error)
    return NextResponse.json({ error: 'Erro ao registrar biometria' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const hasCreds = await hasCredentials()
    return NextResponse.json({ hasCredentials: hasCreds })
  } catch {
    return NextResponse.json({ hasCredentials: false })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getCredential, updateCredentialCounter, getAllCredentials } from '@/lib/webauthn-mysql'
import crypto from 'crypto'

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
    const { credentialId, authenticatorData, clientDataJSON, signature } = body

    if (!credentialId || !authenticatorData || !clientDataJSON || !signature) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const credential = await getCredential(credentialId)
    if (!credential) {
      return NextResponse.json({ error: 'Credencial não encontrada' }, { status: 401 })
    }

    await updateCredentialCounter(credentialId, credential.counter + 1)

    const payload = JSON.stringify({
      auth: true,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
    })
    const token = await sign(payload)

    const response = NextResponse.json({ ok: true })
    response.cookies.set('bazar_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[WebAuthn] Authenticate error:', error)
    return NextResponse.json({ error: 'Erro na autenticação biométrica' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const credentials = await getAllCredentials()
    return NextResponse.json({
      credentialIds: credentials.map(c => c.credential_id),
      count: credentials.length,
    })
  } catch {
    return NextResponse.json({ credentialIds: [], count: 0 })
  }
}

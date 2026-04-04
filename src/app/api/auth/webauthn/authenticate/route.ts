import { NextRequest, NextResponse } from 'next/server'
import { getCredential, updateCredentialCounter, getAllCredentials } from '@/lib/webauthn-mysql'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import crypto from 'crypto'

const SECRET = process.env.SESSION_SECRET
if (!SECRET) {
  throw new Error('SESSION_SECRET environment variable is required')
}

async function sign(payload: string): Promise<string> {
  const encoder = new TextEncoder()
  try {
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
  } catch (err) {
    throw err
  }
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

    const verification = await verifyAuthenticationResponse({
      response: {
        id: credentialId,
        rawId: credentialId,
        response: {
          authenticatorData,
          clientDataJSON,
          signature,
        },
        type: 'public-key',
        clientExtensionResults: {},
      },
      expectedChallenge: async () => true,
      expectedOrigin: process.env.NEXT_PUBLIC_APP_URL || 'https://bazarteuco.vercel.app',
      expectedRPID: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://bazarteuco.vercel.app').hostname,
      credential: {
        id: credentialId,
        publicKey: Buffer.from(credential.public_key, 'base64'),
        counter: credential.counter,
        transports: ['internal'],
      },
    })

    if (!verification.verified) {
      return NextResponse.json({ error: 'Falha na verificação biométrica' }, { status: 401 })
    }

    await updateCredentialCounter(credentialId, verification.authenticationInfo.newCounter)

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

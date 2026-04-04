import { NextResponse } from 'next/server'
import { hasCredentials } from '@/lib/webauthn-mysql'

export async function GET() {
  try {
    const hasCreds = await hasCredentials()
    return NextResponse.json({ available: hasCreds })
  } catch {
    return NextResponse.json({ available: false })
  }
}

import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET() {
  const response = NextResponse.json({ ok: true })
  response.headers.set('Cache-Control', 'no-store, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  return response
}
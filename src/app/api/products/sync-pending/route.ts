import { NextRequest, NextResponse } from 'next/server'
import { syncPendingProducts } from '@/lib/sync-to-mysql'

export async function POST() {
  try {
    const result = await syncPendingProducts()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] Sync pending products error:', error)
    return NextResponse.json({ error: 'Erro ao sincronizar produtos pendentes' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const result = await syncPendingProducts()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] Sync pending products error:', error)
    return NextResponse.json({ error: 'Erro ao sincronizar produtos pendentes' }, { status: 500 })
  }
}

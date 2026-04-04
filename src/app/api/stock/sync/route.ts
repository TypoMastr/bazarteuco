import { NextRequest, NextResponse } from 'next/server'
import { initDatabase, syncProductsFromAPI, getLastSyncTime } from '@/lib/hybrid-stock'

export async function GET() {
  try {
    await initDatabase()
    const lastSync = await getLastSyncTime()
    return NextResponse.json({ lastSync })
  } catch (error) {
    console.error('[API] Stock sync GET error:', error)
    return NextResponse.json({ error: 'Erro ao verificar sincronização' }, { status: 500 })
  }
}

export async function POST() {
  try {
    await initDatabase()
    
    const result = await syncProductsFromAPI()
    
    return NextResponse.json({
      success: true,
      synced: result.synced,
      failed: result.failed,
    })
  } catch (error) {
    console.error('[API] Stock sync POST error:', error)
    return NextResponse.json({ error: 'Erro ao sincronizar com API' }, { status: 500 })
  }
}
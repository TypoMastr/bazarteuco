import { NextRequest, NextResponse } from 'next/server'
import { syncSalesFromAPI, getSyncedDateRange } from '@/lib/sales-mysql'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start') || '2025-01-01'
    const end = searchParams.get('end') || new Date().toISOString().split('T')[0]

    const result = await syncSalesFromAPI(start, end)
    return NextResponse.json({
      success: true,
      ...result,
      message: `${result.synced} vendas sincronizadas`
    })
  } catch (error) {
    console.error('[API] Sales sync error:', error)
    return NextResponse.json({ error: 'Erro ao sincronizar vendas' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const range = await getSyncedDateRange()
    return NextResponse.json(range)
  } catch (error) {
    console.error('[API] Get sync range error:', error)
    return NextResponse.json({ earliest: null, latest: null })
  }
}

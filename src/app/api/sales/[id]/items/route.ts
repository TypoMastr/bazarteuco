import { getSaleItems } from '@/lib/smartpos-api'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await getSaleItems(id)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[API] Sale items error:', error)
    return NextResponse.json({ error: 'Erro ao carregar itens da venda' }, { status: 500 })
  }
}
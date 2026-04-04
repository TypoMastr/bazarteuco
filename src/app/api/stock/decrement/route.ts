import { NextRequest, NextResponse } from 'next/server'
import { decrementStockOnSale } from '@/lib/hybrid-stock'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { items } = body as { items: { productId: number; quantity: number }[] }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Itens inválidos' }, { status: 400 })
    }

    await decrementStockOnSale(items)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Stock decrement error:', error)
    return NextResponse.json({ error: 'Erro ao decrementar estoque' }, { status: 500 })
  }
}

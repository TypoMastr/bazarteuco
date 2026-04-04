import { NextRequest, NextResponse } from 'next/server'
import { initDatabase, getStockSummary, getStockStatus, updateStock, updateStockBatch } from '@/lib/hybrid-stock'

export async function GET(request: NextRequest) {
  try {
    await initDatabase()
    
    const summary = await getStockSummary()
    const products = await getStockStatus()
    
    return NextResponse.json({
      summary,
      products,
    })
  } catch (error) {
    console.error('[API] Stock GET error:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Erro ao carregar estoque: ${message}` }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await initDatabase()
    
    const body = await request.json()
    
    if (body.updates && Array.isArray(body.updates)) {
      const result = await updateStockBatch(body.updates)
      return NextResponse.json(result)
    }
    
    if (body.productId && body.quantity !== undefined) {
      const success = await updateStock(body.productId, body.quantity)
      return NextResponse.json({ success, productId: body.productId, quantity: body.quantity })
    }
    
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  } catch (error) {
    console.error('[API] Stock PUT error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar estoque' }, { status: 500 })
  }
}
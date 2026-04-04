import { NextRequest, NextResponse } from 'next/server'
import { initDatabase, getStockSummary, getStockStatus, updateStock, updateStockBatch } from '@/lib/hybrid-stock'
import { executeUpdate } from '@/lib/mysql-client'

async function syncStockToSmartPOS(productId: number, quantity: number) {
  try {
    await executeUpdate(
      `INSERT INTO stock_history (product_id, quantity, operation, notes, created_at)
       VALUES (?, ?, 'SYNC', 'Sincronizado após atualização', NOW())`,
      [productId, quantity]
    )
    // Try to update in SmartPOS (fire and forget)
    fetch(`https://api.smartpos.app/v1/products/stock/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key-Id': process.env.SMARTPOS_API_KEY_ID!,
        'X-Api-Key-Secret': process.env.SMARTPOS_API_KEY_SECRET!,
      },
      body: JSON.stringify({
        productId: productId,
        productVariantId: null,
        quantity: quantity,
        stockOperation: 'SET',
      }),
    }).catch(() => {})
  } catch {}
}

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
      // Sync each updated product to SmartPOS
      for (const update of body.updates) {
        syncStockToSmartPOS(update.productId, update.quantity)
      }
      return NextResponse.json(result)
    }
    
    if (body.productId && body.quantity !== undefined) {
      const success = await updateStock(body.productId, body.quantity)
      // Sync to SmartPOS immediately
      syncStockToSmartPOS(body.productId, body.quantity)
      return NextResponse.json({ success, productId: body.productId, quantity: body.quantity })
    }
    
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  } catch (error) {
    console.error('[API] Stock PUT error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar estoque' }, { status: 500 })
  }
}
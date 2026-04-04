import { NextRequest, NextResponse } from 'next/server'
import { getProducts } from '@/lib/smartpos-api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { minimumStock = 5, noStock = false, quantity = 0 } = body as { 
      minimumStock?: number
      noStock?: boolean
      quantity?: number 
    }

    let page = 1
    let hasMore = true
    const batchSize = 50
    let totalUpdated = 0

    while (hasMore) {
      const data = await getProducts({ page: String(page), size: String(batchSize) })
      const products = data.items || []

      if (products.length === 0) {
        hasMore = false
        break
      }

      const stockUpdates = products.map((p: any) => ({
        productId: p.id,
        productVariantId: null,
        quantity: quantity,
        stockOperation: 'SET' as const
      }))

      const res = await fetch('https://api.smartpos.app/v1/products/stock/batch', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key-Id': process.env.SMARTPOS_API_KEY_ID!,
          'X-Api-Key-Secret': process.env.SMARTPOS_API_KEY_SECRET!,
        },
        body: JSON.stringify(stockUpdates)
      })

      if (!res.ok) {
        const error = await res.text()
        console.error('Batch stock update error:', error)
        throw new Error(`SmartPOS API error: ${res.status}`)
      }

      totalUpdated += products.length
      console.log(`Updated stock page ${page}: ${products.length} products`)

      page++
      if (products.length < batchSize) hasMore = false
    }

    return NextResponse.json({
      success: true,
      message: `Stock reset para ${quantity} em ${totalUpdated} produtos`,
      totalUpdated
    })
  } catch (error) {
    console.error('[API] Bulk stock reset error:', error)
    return NextResponse.json({ error: 'Erro na atualização em massa' }, { status: 500 })
  }
}

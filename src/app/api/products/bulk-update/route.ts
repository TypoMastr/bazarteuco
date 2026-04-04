import { NextRequest, NextResponse } from 'next/server'
import { getProducts, updateProduct } from '@/lib/smartpos-api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { minimumStock = 5, noStock = false } = body as { minimumStock?: number; noStock?: boolean }

    let page = 1
    let total = 0
    let updated = 0
    let failed = 0
    let hasMore = true

    while (hasMore) {
      const data = await getProducts({ page: String(page), size: '100' })
      const products = data.items || []

      if (products.length === 0) {
        hasMore = false
        break
      }

        for (const product of products) {
        total++
        try {
          console.log(`Atualizando produto ${product.id}...`)
          await updateProduct(String(product.id), {
            noStock: noStock,
            minimumStock: minimumStock
          })
          updated++
        } catch (err) {
          failed++
          console.error(`Erro produto ${product.id}:`, err)
        }
      }

      page++
      if (products.length < 100) hasMore = false
    }

    return NextResponse.json({
      success: true,
      total,
      updated,
      failed,
      message: `${updated} produtos atualizados`
    })
  } catch (error) {
    console.error('[API] Bulk update error:', error)
    return NextResponse.json({ error: 'Erro na atualização em massa' }, { status: 500 })
  }
}

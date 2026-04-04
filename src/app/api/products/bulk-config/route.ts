import { NextRequest, NextResponse } from 'next/server'
import { getProducts } from '@/lib/smartpos-api'
import { updateProductFields } from '@/lib/smartpos-api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { minimumStock = 5, noStock = false } = body as { minimumStock?: number; noStock?: boolean }

    let page = 1
    let hasMore = true
    const batchSize = 30
    let totalUpdated = 0
    let failed = 0
    let errors: string[] = []

    while (hasMore) {
      const data = await getProducts({ page: String(page), size: String(batchSize) })
      const products = data.items || []

      if (products.length === 0) {
        hasMore = false
        break
      }

      for (const product of products) {
        try {
          const result = await updateProductFields(String(product.id), {
            name: product.name,
            minimumStock: minimumStock,
            noStock: noStock
          })
          
          if (result !== null) {
            totalUpdated++
            console.log(`Updated product ${product.id}: minStock=${minimumStock}, noStock=${noStock}`)
          }
        } catch (err) {
          failed++
          const errorMsg = err instanceof Error ? err.message : String(err)
          errors.push(`Product ${product.id}: ${errorMsg}`)
          console.error(`Error updating product ${product.id}:`, err)
        }
      }

      page++
      if (products.length < batchSize) hasMore = false
    }

    return NextResponse.json({
      success: true,
      message: `${totalUpdated} produtos atualizados, ${failed} falhas`,
      totalUpdated,
      failed,
      errors: errors.slice(0, 10)
    })
  } catch (error) {
    console.error('[API] Bulk product update error:', error)
    return NextResponse.json({ error: 'Erro na atualização em massa' }, { status: 500 })
  }
}

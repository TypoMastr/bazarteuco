import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/mysql-client'

const API_BASE = 'https://api.smartpos.app/v1'

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Api-Key-Id': process.env.SMARTPOS_API_KEY_ID!,
    'X-Api-Key-Secret': process.env.SMARTPOS_API_KEY_SECRET!,
  }
}

async function fetchAPI(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { headers: getHeaders() })
  if (!res.ok) throw new Error(`SmartPOS API Error: ${res.status}`)
  return res.json()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const since = body?.since || null

    // Get last sync date from MySQL
    const pool = getPool()
    const [lastSyncRows] = await pool.execute(
      'SELECT MAX(synced_at) as last_sync FROM sales_cache'
    )
    const lastSync = (lastSyncRows as any)[0]?.last_sync

    // Determine start date for sync
    let startDate: string
    if (since) {
      startDate = since
    } else if (lastSync) {
      startDate = new Date(lastSync).toISOString()
    } else {
      // First sync ever: last 7 days
      const d = new Date()
      d.setDate(d.getDate() - 7)
      startDate = d.toISOString()
    }

    const endDate = new Date().toISOString()

    // Fetch sales from SmartPOS
    const qs = `?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`
    const salesData = await fetchAPI(`/sales${qs}`)
    const sales = Array.isArray(salesData) ? salesData : (salesData?.items || [])

    if (sales.length === 0) {
      return NextResponse.json({ synced: 0, newSales: 0, lastSyncDate: endDate })
    }

    const conn = await pool.getConnection()
    let syncedCount = 0

    try {
      await conn.beginTransaction()

      for (const sale of sales) {
        const saleId = sale.uniqueIdentifier || sale.id
        const creationDate = sale.creationDate

        // Insert sale (idempotent)
        const [insertResult] = await conn.execute(
          `INSERT IGNORE INTO sales_cache (sale_id, unique_identifier, creation_date, total_amount, discount_amount, is_canceled, synced_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [saleId, sale.uniqueIdentifier, creationDate, sale.totalAmount || 0, sale.discountAmount || 0, sale.isCanceled || false]
        )

        const inserted = (insertResult as any).affectedRows > 0
        if (!inserted) continue // Already exists, skip

        syncedCount++

        // Fetch items for this sale
        try {
          const itemsData = await fetchAPI(`/sales/${sale.uniqueIdentifier}/items`)
          const items = Array.isArray(itemsData) ? itemsData : []

          // Delete old items (idempotent)
          await conn.execute('DELETE FROM sale_items_cache WHERE sale_id = ?', [saleId])

          // Insert items
          for (const item of items) {
            const productName = item.product?.name || 'AVULSO'
            const isRifa = productName.toLowerCase().includes('rifa')
            const isAvulso = productName.toLowerCase().includes('avulso')
            const isDoacao = productName.toLowerCase().includes('doacao') || productName.toLowerCase().includes('doação')

            await conn.execute(
              `INSERT INTO sale_items_cache (sale_id, product_id, product_name, quantity, unit_price, net_item, is_rifa, is_avulso, is_doacao, synced_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
              [saleId, item.product?.id || null, productName, item.quantity || 0, item.usedPrice || item.listPrice || 0, item.netItem || 0, isRifa, isAvulso, isDoacao]
            )

            // Atomic stock decrement
            if (item.product?.id && !sale.isCanceled) {
              await conn.execute(
                `UPDATE stock SET quantity = GREATEST(0, quantity - ?), updated_at = NOW() WHERE product_id = ?`,
                [item.quantity || 0, item.product.id]
              )

              await conn.execute(
                `INSERT INTO stock_history (product_id, quantity, operation, notes, created_at)
                 VALUES (?, ?, 'SALE', 'Venda registrada via sync', NOW())`,
                [item.product.id, item.quantity || 0]
              )
            }
          }
        } catch (itemErr) {
          console.error(`[Sync] Error fetching items for sale ${saleId}:`, itemErr)
        }
      }

      await conn.commit()
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }

    const response = NextResponse.json({
      synced: syncedCount,
      totalFetched: sales.length,
      lastSyncDate: endDate,
    })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  } catch (error: any) {
    console.error('[Sync] Error:', error)
    return NextResponse.json({ error: error.message || 'Erro ao sincronizar' }, { status: 500 })
  }
}

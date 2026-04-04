import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/mysql-client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const since = searchParams.get('since')

    let query = `
      SELECT sc.sale_id, sc.unique_identifier, sc.creation_date, sc.total_amount, sc.is_canceled,
             sic.product_name, sic.quantity, sic.unit_price, sic.net_item
      FROM sales_cache sc
      LEFT JOIN sale_items_cache sic ON sc.sale_id = sic.sale_id
    `
    const params: any[] = []

    if (since) {
      query += ' WHERE sc.creation_date > ?'
      params.push(since)
    }

    query += ' ORDER BY sc.creation_date DESC'

    const rows = await executeQuery<any>(query, params)

    // Group by sale
    const salesMap = new Map<string, any>()
    for (const row of rows) {
      const saleId = row.sale_id
      if (!salesMap.has(saleId)) {
        salesMap.set(saleId, {
          sale_id: row.sale_id,
          unique_identifier: row.unique_identifier,
          creation_date: row.creation_date,
          total_amount: row.total_amount,
          is_canceled: row.is_canceled,
          items: [],
        })
      }
      if (row.product_name) {
        salesMap.get(saleId)!.items.push({
          product_name: row.product_name,
          quantity: row.quantity,
          unit_price: row.unit_price,
          net_item: row.net_item,
        })
      }
    }

    const sales = Array.from(salesMap.values())

    return NextResponse.json({
      sales,
      count: sales.length,
    })
  } catch (error: any) {
    console.error('[API] Check new sales error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

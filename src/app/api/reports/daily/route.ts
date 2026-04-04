import { getSalesByDate } from '@/lib/smartpos-api'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

const CONCURRENCY = 4

async function fetchSaleItems(uid: string): Promise<any[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/sales/${uid}/items`, {
      headers: { 'Content-Type': 'application/json' }
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch { return [] }
}

export async function GET(request: NextRequest) {
  try {
    const date = request.nextUrl.searchParams.get('date')
    if (!date) {
      return NextResponse.json({ error: 'Parâmetro "date" é obrigatório (YYYY-MM-DD)' }, { status: 400 })
    }

    const sales = await getSalesByDate(date)
    const salesList = Array.isArray(sales) ? sales : (sales?.items || sales?.data || [])

    const productMap = new Map<string, { name: string; quantity: number; unitPrice: number; total: number }>()
    let totalSales = 0
    let totalRevenue = 0
    let totalDiscount = 0

    const activeSales = salesList.filter((s: any) => !s.isCanceled)
    const uids = activeSales.map((s: any) => s.uniqueIdentifier || s.id).filter(Boolean)

    const batches: string[][] = []
    for (let i = 0; i < uids.length; i += CONCURRENCY) {
      batches.push(uids.slice(i, i + CONCURRENCY))
    }

    for (const batch of batches) {
      const results = await Promise.all(batch.map(uid => fetchSaleItems(uid)))
      
      for (const items of results) {
        for (const item of items) {
          const productName = item.product?.name || 'VALOR AVULSO'
          const quantity = item.quantity || 0
          const unitPrice = item.usedPrice || item.listPrice || 0
          const itemTotal = item.netItem || 0

          if (productMap.has(productName)) {
            const existing = productMap.get(productName)!
            existing.quantity += quantity
            existing.total += itemTotal
          } else {
            productMap.set(productName, {
              name: productName,
              quantity,
              unitPrice,
              total: itemTotal,
            })
          }
        }
      }
    }

    for (const sale of activeSales) {
      totalSales++
      totalRevenue += sale.totalAmount || 0
      totalDiscount += sale.discountAmount || 0
    }

    const products = Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)

    const response = NextResponse.json({
      date,
      products,
      summary: { totalSales, totalRevenue, totalDiscount },
    })
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return response
  } catch (error) {
    console.error('[API] Daily report error:', error)
    return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: 500 })
  }
}
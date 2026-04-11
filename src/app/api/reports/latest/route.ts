import { getSales } from '@/lib/smartpos-api'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET() {
  try {
    const sales = await getSales()
    const salesList = Array.isArray(sales) ? sales : (sales?.items || sales?.data || [])

    let latestDate: string | null = null
    let latestSaleTime: string | null = null
    
    for (const sale of salesList) {
      if (sale.isCanceled) continue
      const saleDate = sale.creationDate
      if (!saleDate) continue
      if (!latestDate || !latestSaleTime || saleDate > latestSaleTime) {
        latestDate = saleDate.split('T')[0]
        latestSaleTime = saleDate
      }
    }

    if (!latestDate) {
      return NextResponse.json({ latestDate: null })
    }

    const response = NextResponse.json({
      latestDate,
      latestSaleTime,
    })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    return response
  } catch (error) {
    console.error('[API] Latest report error:', error)
    return NextResponse.json({ error: 'Erro ao buscar última venda' }, { status: 500 })
  }
}
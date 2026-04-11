import { NextRequest, NextResponse } from 'next/server'
import { getSales, getSaleItems } from '@/lib/smartpos-api'
import { getMonthlyReport, getAnnualReport, getAvailableYears } from '@/lib/sales-mysql'

async function generateDailyReportFromAPI(date: string) {
  const startISO = `${date}T00:00:00Z`
  const endISO = `${date}T23:59:59Z`
  
  const salesData = await getSales({ start: startISO, end: endISO })
  const salesList = Array.isArray(salesData) ? salesData : (salesData?.items || [])
  const activeSales = salesList.filter((s: any) => !s.isCanceled && !s.isCanceled)

  const productMap = new Map<string, { name: string; quantity: number; unitPrice: number; total: number; isRifa: boolean; isAvulso: boolean; isDoacao: boolean }>()
  let totalRevenue = 0

  for (const sale of activeSales) {
    totalRevenue += sale.totalAmount || 0
    
    try {
      const itemsData = await getSaleItems(sale.uniqueIdentifier)
      const items = Array.isArray(itemsData) ? itemsData : []
      
      for (const item of items) {
        const productName = item.product?.name || 'AVULSO'
        const qty = Number(item.quantity) || 0
        const price = Number(item.usedPrice || item.listPrice) || 0
        const total = Number(item.netItem) || qty * price
        const isRifa = productName.toLowerCase().includes('rifa')
        const isAvulso = productName.toLowerCase().includes('avulso')
        const isDoacao = productName.toLowerCase().includes('doacao') || productName.toLowerCase().includes('doação')

        if (productMap.has(productName)) {
          const e = productMap.get(productName)!
          e.quantity += qty
          e.total += total
        } else {
          productMap.set(productName, { name: productName, quantity: qty, unitPrice: price, total, isRifa, isAvulso, isDoacao })
        }
      }
    } catch (err) {
      console.error(`[Report] Error fetching items for sale ${sale.uniqueIdentifier}:`, err)
    }
  }

  const products = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity)
  const rifaRevenue = products.filter(p => p.isRifa).reduce((sum, p) => sum + p.total, 0)
  const avulsoRevenue = products.filter(p => p.isAvulso).reduce((sum, p) => sum + p.total, 0)
  const doacaoRevenue = products.filter(p => p.isDoacao).reduce((sum, p) => sum + p.total, 0)
  const bazarRevenue = totalRevenue - rifaRevenue - avulsoRevenue - doacaoRevenue

  return {
    date,
    products,
    summary: {
      totalSales: activeSales.length,
      totalRevenue,
      rifaRevenue,
      bazarRevenue,
      avulsoRevenue,
      doacaoRevenue,
      totalDiscount: 0,
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const date = searchParams.get('date')
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    if (type === 'years') {
      const years = await getAvailableYears()
      const response = NextResponse.json({ years })
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      return response
    }

    if (type === 'daily' && date) {
      const report = await generateDailyReportFromAPI(date)
      const response = NextResponse.json(report)
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      return response
    }

    if (type === 'monthly' && year && month) {
      const report = await getMonthlyReport(parseInt(year), parseInt(month))
      const response = NextResponse.json(report)
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      return response
    }

    if (type === 'annual' && year) {
      const report = await getAnnualReport(parseInt(year))
      const response = NextResponse.json(report)
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      return response
    }

    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  } catch (error) {
    console.error('[API] Reports error:', error)
    return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: 500 })
  }
}

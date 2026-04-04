import { NextRequest, NextResponse } from 'next/server'
import { getDailyReport, getMonthlyReport, getAnnualReport, getAvailableYears } from '@/lib/sales-mysql'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const date = searchParams.get('date')
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    if (type === 'years') {
      const years = await getAvailableYears()
      return NextResponse.json({ years })
    }

    if (type === 'daily' && date) {
      const report = await getDailyReport(date)
      return NextResponse.json(report)
    }

    if (type === 'monthly' && year && month) {
      const report = await getMonthlyReport(parseInt(year), parseInt(month))
      return NextResponse.json(report)
    }

    if (type === 'annual' && year) {
      const report = await getAnnualReport(parseInt(year))
      return NextResponse.json(report)
    }

    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  } catch (error) {
    console.error('[API] Reports error:', error)
    return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: 500 })
  }
}

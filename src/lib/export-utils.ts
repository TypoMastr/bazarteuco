import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { matchesGiraDaMata, matchesEventos } from './report-categories'

export type ExportType = 'products' | 'stock' | 'sales' | 'report'

export interface ProductData {
  id: number
  name: string
  alphaCode?: string
  eanCode?: string
  sellValue: number
  promotionalValue?: number
  category?: { name: string; description?: string }
}

export interface StockData {
  productId: number
  name: string
  alphaCode: string
  quantity: number
  status: 'zerado' | 'baixo' | 'ok'
  sellValue: number
  categoryName?: string
}

export interface SaleData {
  id: string
  uniqueIdentifier: string
  creationDate: string
  totalAmount: number
  saleNumber?: number | string
  orderName?: string
  items?: any[]
}

export interface ReportData {
  date?: string
  products?: { name: string; quantity: number; unitPrice: number; total: number }[]
  sales?: {
    saleNumber: number
    saleId: string
    uniqueIdentifier: string
    creationDate: string
    totalAmount: number
    items: { productName: string; quantity: number; unitPrice: number; total: number }[]
  }[]
  summary: { 
    totalSales: number; 
    totalRevenue: number;
    bazarRevenue?: number;
    rifaRevenue?: number;
    avulsoRevenue?: number;
    doacaoRevenue?: number;
  }
  year?: number
  month?: number
  dailyData?: { date: string; total: number; sales: number }[]
  monthlyData?: { month: number; total: number; sales: number }[]
  topProducts?: { name: string; quantity: number; total: number }[]
  reportType?: 'daily' | 'monthly' | 'annual'
}

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function getReportType(report: ReportData): 'daily' | 'monthly' | 'annual' {
  if (report.date) return 'daily'
  if (report.year && report.month) return 'monthly'
  if (report.year) return 'annual'
  return 'daily'
}

function getReportTitle(report: ReportData): string {
  const type = getReportType(report)
  if (type === 'daily') return 'Relatorio Diario de Vendas'
  if (type === 'monthly') return 'Relatorio Mensal de Vendas'
  return 'Relatorio Anual de Vendas'
}

function getReportSubtitle(report: ReportData): string {
  const type = getReportType(report)
  if (type === 'daily') return formatDateBR(report.date!)
  if (type === 'monthly') return `${MONTH_NAMES[report.month! - 1]}/${report.year}`
  return `${report.year}`
}

function getReportPeriod(report: ReportData): string {
  const type = getReportType(report)
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const currentDay = new Date().getDate()

  if (type === 'monthly') {
    const y = report.year!
    const m = report.month!
    const lastDay = new Date(y, m, 0).getDate()
    return `Periodo: 01/${String(m).padStart(2, '0')}/${y} ate ${String(lastDay).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
  }
  if (type === 'annual') {
    const y = report.year!
    const isCurrentYear = y === currentYear
    if (isCurrentYear) {
      return `Periodo: 01/01/${y} ate ${String(currentDay).padStart(2, '0')}/${String(currentMonth).padStart(2, '0')}/${y}`
    }
    return `Periodo: 01/01/${y} ate 31/12/${y}`
  }
  return ''
}

export function exportToPDF(
  type: ExportType,
  data: ProductData[] | StockData[] | SaleData[] | ReportData,
  filename?: string
): void {
  const doc = new jsPDF()
  const pageTitle = getPageTitle(type)
  
  if (type !== 'report' && type !== 'sales') {
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(pageTitle, 14, 16)
  }

  switch (type) {
    case 'products':
      exportProductsPDF(doc, data as ProductData[])
      break
    case 'stock':
      exportStockPDF(doc, data as StockData[])
      break
    case 'sales':
      exportSalesPDF(doc, data as SaleData[])
      break
    case 'report':
      exportReportPDF(doc, data as ReportData)
      break
  }

  doc.save(filename || `${type}-${new Date().toISOString().split('T')[0]}.pdf`)
}

function getPageTitle(type: ExportType): string {
  const titles: Record<ExportType, string> = {
    products: 'Bazar TEUCO - Lista de Produtos',
    stock: 'Bazar TEUCO - Controle de Estoque',
    sales: 'Bazar TEUCO - Vendas',
    report: 'Bazar TEUCO - Relatório de Vendas'
  }
  return titles[type]
}

function exportProductsPDF(doc: jsPDF, products: ProductData[]): void {
  const sorted = [...products].sort((a, b) => (a.alphaCode || '').localeCompare(b.alphaCode || ''))
  
  const categoryMap = new Map<string, ProductData[]>()
  const noCategory: ProductData[] = []

  sorted.forEach(p => {
    const catName = p.category?.description || p.category?.name
    if (!catName) {
      noCategory.push(p)
    } else {
      if (!categoryMap.has(catName)) categoryMap.set(catName, [])
      categoryMap.get(catName)!.push(p)
    }
  })

  const groups: { name: string; products: ProductData[] }[] = []
  categoryMap.forEach((prods, name) => groups.push({ name, products: prods }))
  if (noCategory.length > 0) groups.push({ name: 'Sem Categoria', products: noCategory })
  groups.sort((a, b) => a.name.localeCompare(b.name))

  let startY = 40
  groups.forEach((group, gi) => {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(group.name, 14, startY)
    startY += 2

    const tableData = group.products.map(p => [
      p.alphaCode || '-',
      p.name,
      formatCurrency(p.sellValue)
    ])

    autoTable(doc, {
      head: [['Código', 'Produto', 'Preço']],
      body: tableData,
      startY,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 139, 34] }
    })

    startY = (doc as any).lastAutoTable.finalY + 8
    if (startY > 270) {
      doc.addPage()
      startY = 20
    }
  })
}

function exportStockPDF(doc: jsPDF, stock: StockData[]): void {
  const statusLabels: Record<string, string> = { zerado: 'ZERADO', baixo: 'BAIXO', ok: 'OK' }
  const sorted = [...stock].sort((a, b) => (a.alphaCode || '').localeCompare(b.alphaCode || ''))
  
  const categoryMap = new Map<string, StockData[]>()
  const noCategory: StockData[] = []

  sorted.forEach(s => {
    const catName = s.categoryName || 'Sem Categoria'
    if (!categoryMap.has(catName)) categoryMap.set(catName, [])
    categoryMap.get(catName)!.push(s)
  })

  const groups: { name: string; products: StockData[] }[] = []
  categoryMap.forEach((prods, name) => groups.push({ name, products: prods }))
  groups.sort((a, b) => a.name.localeCompare(b.name))

  let startY = 40
  groups.forEach((group) => {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(group.name, 14, startY)
    startY += 2

    const tableData = group.products.map(s => [
      s.alphaCode,
      s.name,
      s.quantity,
      statusLabels[s.status],
      formatCurrency(s.sellValue)
    ])

    autoTable(doc, {
      head: [['Código', 'Produto', 'Qtd', 'Status', 'Preço']],
      body: tableData,
      startY,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 139, 34] },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 3) {
          const status = group.products[data.row.index]?.status
          if (status === 'zerado') data.cell.styles.textColor = [220, 38, 38]
          else if (status === 'baixo') data.cell.styles.textColor = [202, 138, 4]
          else data.cell.styles.textColor = [22, 163, 74]
        }
      }
    })

    startY = (doc as any).lastAutoTable.finalY + 8
    if (startY > 270) {
      doc.addPage()
      startY = 20
    }
  })
}

function exportSalesPDF(doc: jsPDF, data: any): void {
  const sales: SaleData[] = data.sales || data
  const saleItemsMap: Record<string, any[]> = data.saleItems || {}
  const total = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0)
  const dateRange = data.dateRange || null

  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(34, 139, 34)

  let headerText = 'Bazar TEUCO'
  if (dateRange && dateRange.start && dateRange.end) {
    if (dateRange.start === dateRange.end) {
      headerText += ` - ${formatDateBR(dateRange.start)}`
    } else {
      headerText += ` - ${formatDateBR(dateRange.start)} ate ${formatDateBR(dateRange.end)}`
    }
  }
  headerText += ` | Vendas: ${sales.length} | Receita: ${formatCurrency(total)}`

  const textWidth = doc.getTextWidth(headerText)
  const xPos = (pageWidth - textWidth) / 2
  doc.text(headerText, xPos, 16)

  let startY = 24

  sales.forEach((sale, saleIdx) => {
    const uid = sale.uniqueIdentifier || sale.id
    const saleLabel = sale.id && /^\d+$/.test(sale.id) ? `#${sale.id}` : (sale.orderName || `#${uid.slice(-6)}`)
    const { date: saleDate, time: saleTime } = formatDateTimeBR(sale.creationDate)
    const items = saleItemsMap[uid] || sale.items || []

    // Calculate total height needed for this sale
    const headerH = 10
    const itemsH = items.length * 7
    const totalH = 10
    const spacerH = saleIdx < sales.length - 1 ? 4 : 0
    const saleTotalH = headerH + itemsH + totalH + spacerH

    // If sale won't fit, start new page
    if (startY + saleTotalH > 270) {
      doc.addPage()
      startY = 12
    }

    // Sale header with green background
    doc.setFillColor(34, 139, 34)
    doc.roundedRect(10, startY, 190, 9, 1.5, 1.5, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('Venda', 12, startY + 6)
    doc.text('Data', 32, startY + 6)
    doc.text('Horario', 60, startY + 6)
    doc.text('Produto', 78, startY + 6)
    doc.text('Valor', 178, startY + 6)
    startY += 10

    if (items.length > 0) {
      items.forEach((item: any, idx: number) => {

        const itemName = item.product?.name || item.productName || 'Valor Avulso'
        const qty = item.quantity || 1
        const itemLabel = qty > 1 ? `${itemName} (${qty}x)` : itemName
        const itemValue = formatCurrency(item.netItem || item.total || 0)

        doc.setFillColor(248, 248, 248)
        doc.rect(10, startY, 190, 7, 'F')

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(80, 80, 80)

        if (idx === 0) {
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(34, 139, 34)
          doc.text(saleLabel, 12, startY + 5)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(100, 100, 100)
          doc.text(saleDate, 32, startY + 5)
          doc.text(saleTime, 60, startY + 5)
        }

        doc.text(itemLabel, 78, startY + 5)
        doc.text(itemValue, 178, startY + 5)
        startY += 7
      })

      // Total row
      doc.setFillColor(230, 250, 235)
      doc.rect(10, startY, 190, 7, 'F')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(34, 139, 34)
      const totalText = formatCurrency(sale.totalAmount || 0)
      const totalWidth = doc.getTextWidth(totalText)
      doc.text('Total', 178 - totalWidth - 12, startY + 5)
      doc.text(totalText, 178, startY + 5)
      startY += 10
    } else {
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(saleLabel, 12, startY + 5)
      doc.text(saleDate, 32, startY + 5)
      doc.text(saleTime, 60, startY + 5)
      doc.text('—', 78, startY + 5)
      doc.text(formatCurrency(sale.totalAmount || 0), 178, startY + 5)
      startY += 10
    }

    // White space between sales
    if (saleIdx < sales.length - 1) {
      startY += 4
    }
  })
}

function formatDateTimeBR(dateISO: string): { date: string; time: string } {
  if (!dateISO) return { date: '-', time: '-' }
  const d = new Date(dateISO)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return { date: `${dd}/${mm}/${yyyy}`, time: `${hh}:${min}` }
}

function exportReportPDF(doc: jsPDF, report: ReportData): void {
  const summary = report.summary
  const products = report.products || []
  const extra = (report as any).extraData || {}
  const bazarRevenue = extra.correctedBazarRevenue ?? summary.bazarRevenue ?? 0
  const giraDaMataRevenue = extra.giraDaMataRevenue ?? 0
  const eventosRevenue = extra.eventosRevenue ?? 0
  const showGiraDaMata = extra.showGiraDaMata ?? giraDaMataRevenue > 0
  const showEventos = extra.showEventos ?? eventosRevenue > 0
  const reportType = getReportType(report)

  const pageWidth = doc.internal.pageSize.getWidth()
  const usableWidth = pageWidth - 28

  // Header
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(34, 139, 34)
  const titleText = getReportTitle(report)
  const titleW = doc.getTextWidth(titleText)
  doc.text(titleText, (pageWidth - titleW) / 2, 16)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  const subtitleText = getReportSubtitle(report)
  const subtitleW = doc.getTextWidth(subtitleText)
  doc.text(subtitleText, (pageWidth - subtitleW) / 2, 24)

  // Period line for monthly/annual
  let startY = 27
  const period = getReportPeriod(report)
  if (period) {
    doc.setFontSize(8)
    doc.setTextColor(140, 140, 140)
    const periodW = doc.getTextWidth(period)
    doc.text(period, (pageWidth - periodW) / 2, 29)
    startY = 32
  }

  // Green line
  doc.setDrawColor(34, 139, 34)
  doc.setLineWidth(1)
  doc.line(14, startY, pageWidth - 14, startY)

  // Total card
  startY += 7
  doc.setFillColor(230, 250, 235)
  doc.roundedRect(14, startY, usableWidth, 16, 2, 2, 'F')
  doc.setDrawColor(34, 139, 34)
  doc.setLineWidth(0.5)
  doc.line(14, startY + 16, pageWidth - 14, startY + 16)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(34, 139, 34)
  doc.text('TOTAL', 20, startY + 7)
  doc.setFontSize(14)
  doc.text(formatCurrency(summary.totalRevenue), 20, startY + 14)

  startY += 20

  // Category cards - 3 per row
  const cats = [
    { label: 'Bazar', value: bazarRevenue, color: [37, 99, 235] as [number, number, number] },
    { label: 'Rifa', value: summary.rifaRevenue || 0, color: [234, 88, 12] as [number, number, number] },
    { label: 'Avulsos', value: summary.avulsoRevenue || 0, color: [147, 51, 234] as [number, number, number] },
    { label: 'Doacoes', value: summary.doacaoRevenue || 0, color: [219, 39, 119] as [number, number, number] },
  ]
  if (showGiraDaMata) cats.push({ label: 'Gira da Mata', value: giraDaMataRevenue, color: [245, 158, 11] as [number, number, number] })
  if (showEventos) cats.push({ label: 'Eventos/Cantina', value: eventosRevenue, color: [20, 184, 166] as [number, number, number] })

  const cardW = (usableWidth - 8) / 3
  const cardH = 14

  cats.forEach((cat, i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = 14 + col * (cardW + 4)
    const y = startY + row * (cardH + 4)

    doc.setFillColor(248, 248, 248)
    doc.roundedRect(x, y, cardW, cardH, 1.5, 1.5, 'F')
    doc.setDrawColor(...cat.color)
    doc.setLineWidth(0.8)
    doc.line(x, y + cardH, x + cardW, y + cardH)

    doc.setFontSize(6)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...cat.color)
    doc.text(cat.label.toUpperCase(), x + 3, y + 5.5)

    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
    doc.text(formatCurrency(cat.value), x + 3, y + 11.5)
  })

  const catsRows = Math.ceil(cats.length / 3)
  startY += catsRows * (cardH + 4) + 6

  // Separator
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(14, startY, pageWidth - 14, startY)
  startY += 6

  // Products ranking header
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(34, 139, 34)
  doc.text('Mais Vendidos', 14, startY)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(140, 140, 140)
  doc.text(`${products.length} produtos`, pageWidth - 14, startY, { align: 'right' })
  startY += 5

  // Products table
  const productRows = products.map((p, i) => {
    const rank = (i + 1).toString()
    return [
      rank,
      p.name,
      `${p.quantity}x`,
      formatCurrency(p.unitPrice || (p.total / p.quantity || 0)),
      formatCurrency(p.total),
    ]
  })

  autoTable(doc, {
    head: [['#', 'Produto', 'Qtd', 'Unitario', 'Total']],
    body: productRows,
    startY,
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: {
      fillColor: [34, 139, 34],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 90 },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    theme: 'grid',
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 0) {
        data.cell.styles.textColor = [34, 139, 34]
        data.cell.styles.fontStyle = 'bold'
      }
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
  })

  const finalY = (doc as any).lastAutoTable.finalY + 8

  // Footer
  if (finalY > 260) {
    doc.addPage()
    doc.setFillColor(34, 139, 34)
    doc.rect(0, 10, pageWidth, 16, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(`${summary.totalSales} vendas  |  ${formatCurrency(summary.totalRevenue)}`, pageWidth / 2, 20, { align: 'center' })
  } else {
    doc.setFillColor(34, 139, 34)
    doc.rect(0, finalY, pageWidth, 16, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(`${summary.totalSales} vendas  |  ${formatCurrency(summary.totalRevenue)}`, pageWidth / 2, finalY + 10, { align: 'center' })
  }
}

export function exportToWhatsApp(
  type: ExportType,
  data: ProductData[] | StockData[] | SaleData[] | ReportData
): void {
  try {
    const message = generateWhatsAppMessage(type, data)
    const encodedMessage = encodeURIComponent(message)
    console.log('WhatsApp message length:', message.length, 'chars')
    console.log('Encoded length:', encodedMessage.length)
    
    if (encodedMessage.length > 4096) {
      console.warn('Message too long for WhatsApp, truncating...')
    }
    
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
  } catch (error) {
    console.error('WhatsApp export error:', error)
    alert('Erro ao abrir WhatsApp. Tente novamente.')
  }
}

function generateWhatsAppMessage(
  type: ExportType,
  data: ProductData[] | StockData[] | SaleData[] | ReportData
): string {
  const lines: string[] = []

  if (type !== 'sales' && type !== 'report') {
    lines.push(`*BAZAR TEUCO - ${getPageTitle(type).replace('Bazar TEUCO - ', '')}*`)
    lines.push(`Data: ${new Date().toLocaleDateString('pt-BR')}`)
    lines.push('')
  }

  switch (type) {
    case 'products': {
      const products = data as ProductData[]
      const sorted = [...products].sort((a, b) => (a.alphaCode || '').localeCompare(b.alphaCode || ''))
      lines.push(`*${products.length} produtos*`)
      
      const categoryMap = new Map<string, ProductData[]>()
      const noCategory: ProductData[] = []
      sorted.forEach(p => {
        const catName = p.category?.description || p.category?.name
        if (!catName) noCategory.push(p)
        else {
          if (!categoryMap.has(catName)) categoryMap.set(catName, [])
          categoryMap.get(catName)!.push(p)
        }
      })
      
      const groups: { name: string; products: ProductData[] }[] = []
      categoryMap.forEach((prods, name) => groups.push({ name, products: prods }))
      if (noCategory.length > 0) groups.push({ name: 'Sem Categoria', products: noCategory })
      groups.sort((a, b) => a.name.localeCompare(b.name))
      
      groups.forEach(group => {
        lines.push('')
        lines.push(`*${group.name}* (${group.products.length})`)
        group.products.forEach(p => {
          const promo = (p.promotionalValue ?? 0) > 0 ? ` [PROMO: ${formatCurrency(p.promotionalValue!)}]` : ''
          lines.push(`- [${p.alphaCode}] ${p.name} - ${formatCurrency(p.sellValue)}${promo}`)
        })
      })
      
      break
    }
    case 'stock': {
      const stock = data as StockData[]
      const sorted = [...stock].sort((a, b) => (a.alphaCode || '').localeCompare(b.alphaCode || ''))
      const zerados = stock.filter(s => s.status === 'zerado').length
      const baixos = stock.filter(s => s.status === 'baixo').length
      lines.push(`Total: ${stock.length} | Zerados: ${zerados} | Baixos: ${baixos}`)
      
      const categoryMap = new Map<string, StockData[]>()
      sorted.forEach(s => {
        const catName = s.categoryName || 'Sem Categoria'
        if (!categoryMap.has(catName)) categoryMap.set(catName, [])
        categoryMap.get(catName)!.push(s)
      })
      
      const groups: { name: string; products: StockData[] }[] = []
      categoryMap.forEach((prods, name) => groups.push({ name, products: prods }))
      groups.sort((a, b) => a.name.localeCompare(b.name))
      
      groups.forEach(group => {
        lines.push('')
        lines.push(`*${group.name}*`)
        group.products.forEach(s => {
          const status = s.status === 'zerado' ? '[ZERADO]' : s.status === 'baixo' ? '[BAIXO]' : '[OK]'
          lines.push(`- [${s.alphaCode}] ${s.name} - Qtd: ${s.quantity} ${status}`)
        })
      })
      
      break
    }
    case 'sales': {
      const salesData = data as any
      const sales: SaleData[] = salesData.sales || data
      const saleItemsMap: Record<string, any[]> = salesData.saleItems || {}
      const dateRange = salesData.dateRange || null
      const total = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0)

      let headerText = '*Bazar TEUCO*'
      if (dateRange && dateRange.start && dateRange.end) {
        if (dateRange.start === dateRange.end) {
          headerText += ` - ${formatDateBR(dateRange.start)}`
        } else {
          headerText += ` - ${formatDateBR(dateRange.start)} ate ${formatDateBR(dateRange.end)}`
        }
      }
      headerText += ` | Vendas: ${sales.length} | Receita: ${formatCurrency(total)}`

      lines.push(headerText)
      lines.push('')

      sales.forEach((sale) => {
        const uid = sale.uniqueIdentifier || sale.id
        const saleLabel = sale.id && /^\d+$/.test(sale.id) ? `#${sale.id}` : (sale.orderName || `#${uid.slice(-6)}`)
        const { date: saleDate, time: saleTime } = formatDateTimeBR(sale.creationDate)

        lines.push('━━━━━━━━━━━━━━━━━━')
        lines.push('')
          lines.push(`VENDA ${saleLabel} • ${saleDate} • ${saleTime}`)

        const items = saleItemsMap[uid] || sale.items || []
        if (items.length > 0) {
          items.forEach((item: any) => {
            const itemName = item.product?.name || item.productName || 'Valor Avulso'
            const qty = item.quantity || 1
            const itemTotal = formatCurrency(item.netItem || item.total || 0)
            if (qty > 1) {
              lines.push(`• ${itemName} (${qty}x) - ${itemTotal}`)
            } else {
              lines.push(`• ${itemName} - ${itemTotal}`)
            }
          })
        }
        lines.push(`*Total: ${formatCurrency(sale.totalAmount || 0)}*`)
      })
      break
    }
    case 'report': {
      const report = data as ReportData
      const summary = report.summary
      const reportType = getReportType(report)
      const extra = (report as any).extraData || {}
      const bazarRevenue = extra.correctedBazarRevenue ?? summary.bazarRevenue ?? 0
      const giraDaMataRevenue = extra.giraDaMataRevenue ?? 0
      const eventosRevenue = extra.eventosRevenue ?? 0
      const showGiraDaMata = extra.showGiraDaMata ?? giraDaMataRevenue > 0
      const showEventos = extra.showEventos ?? eventosRevenue > 0

      lines.push(`*${getReportTitle(report)}*`)
      lines.push(`*${getReportSubtitle(report)}*`)
      const period = getReportPeriod(report)
      if (period) lines.push(period)
      lines.push('')

      lines.push(`*RESUMO*`)
      lines.push(`Vendas: ${summary.totalSales}`)
      lines.push(`Receita: ${formatCurrency(summary.totalRevenue)}`)
      lines.push(`Bazar: ${formatCurrency(bazarRevenue)}`)
      lines.push(`Rifa: ${formatCurrency(summary.rifaRevenue || 0)}`)
      lines.push(`Avulsos: ${formatCurrency(summary.avulsoRevenue || 0)}`)
      lines.push(`Doacoes: ${formatCurrency(summary.doacaoRevenue || 0)}`)
      if (showGiraDaMata) lines.push(`Gira da Mata: ${formatCurrency(giraDaMataRevenue)}`)
      if (showEventos) lines.push(`Eventos/Cantina: ${formatCurrency(eventosRevenue)}`)
      lines.push('')

      if (reportType === 'daily') {
        const sales = report.sales || []
        if (sales.length > 0) {
          lines.push('━━━━━━━━━━━━━━━━━━')
          sales.forEach((sale) => {
            const { date: saleDate, time: saleTime } = formatDateTimeBR(sale.creationDate)
            const saleLabel = sale.uniqueIdentifier ? `#${sale.uniqueIdentifier}` : `#${sale.saleNumber}`

            lines.push('')
            lines.push(`VENDA ${saleLabel} • ${saleDate} • ${saleTime}`)
            sale.items.forEach(item => {
              const itemTotal = formatCurrency(item.total)
              if (item.quantity > 1) {
                lines.push(`• ${item.productName} (${item.quantity}x) - ${itemTotal}`)
              } else {
                lines.push(`• ${item.productName} - ${itemTotal}`)
              }
            })
            lines.push(`*Total: ${formatCurrency(sale.totalAmount)}*`)
            lines.push('━━━━━━━━━━━━━━━━━━')
          })
        }
      }

      const products = report.products || report.topProducts || []
      const sorted = [...products].sort((a, b) => b.quantity - a.quantity)
      const totalQty = sorted.reduce((sum, p) => sum + p.quantity, 0)

      lines.push('')
      lines.push(`*TODOS OS PRODUTOS VENDIDOS* (${sorted.length} itens | ${totalQty} unidades)`)
      lines.push('')
      sorted.forEach(p => {
        lines.push(`• ${p.name} (${p.quantity}x) - ${formatCurrency(p.total)}`)
      })
      break
    }
  }

  lines.push('')
  lines.push('_Exportado via Bazar TEUCO Dashboard_')

  return lines.join('\n')
}

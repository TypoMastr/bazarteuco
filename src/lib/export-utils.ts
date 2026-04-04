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
  items?: any[]
  orderName?: string
}

export interface ReportData {
  date?: string
  products?: { name: string; quantity: number; unitPrice: number; total: number }[]
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDateBR(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR')
}

export function exportToPDF(
  type: ExportType,
  data: ProductData[] | StockData[] | SaleData[] | ReportData,
  filename?: string
): void {
  const doc = new jsPDF()
  const pageTitle = getPageTitle(type)
  
  if (type !== 'report') {
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

function exportSalesPDF(doc: jsPDF, sales: SaleData[]): void {
  const total = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0)
  
  doc.setFontSize(12)
  doc.text(`Total de vendas: ${sales.length} | Receita: ${formatCurrency(total)}`, 14, 38)

  const tableData = sales.map(s => [
    s.orderName || s.uniqueIdentifier || s.id,
    s.creationDate ? formatDateBR(s.creationDate) : '-',
    formatCurrency(s.totalAmount || 0)
  ])

  autoTable(doc, {
    head: [['Venda', 'Data', 'Valor']],
    body: tableData,
    startY: 45,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [34, 139, 34] }
  })
}

function exportReportPDF(doc: jsPDF, report: ReportData): void {
  const products = report.products || report.topProducts || []
  const dateLabel = report.date 
    ? formatDateBR(report.date)
    : (report.year ? `${report.month ? `${report.month}/` : ''}${report.year}` : 'Relatório')
  
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Relatorio de Vendas', 14, 14)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(dateLabel, 14, 22)
  doc.text(`Vendas: ${report.summary.totalSales} | Receita: ${formatCurrency(report.summary.totalRevenue)}`, 14, 30)

  const categories: { name: string; matcher: (p: any) => boolean; color: [number, number, number] }[] = [
    { name: 'Bazar', matcher: (p: any) => !p.isRifa && !p.isAvulso && !p.isDoacao && !matchesGiraDaMata(p.name) && !matchesEventos(p.name), color: [59, 130, 246] },
    { name: 'Rifa', matcher: (p: any) => p.isRifa, color: [249, 115, 22] },
    { name: 'Avulsos', matcher: (p: any) => p.isAvulso, color: [168, 85, 247] },
    { name: 'Doacoes', matcher: (p: any) => p.isDoacao, color: [236, 72, 153] },
    { name: 'Gira da Mata', matcher: (p: any) => matchesGiraDaMata(p.name), color: [245, 158, 11] },
    { name: 'Eventos/Cantina', matcher: (p: any) => matchesEventos(p.name), color: [20, 184, 166] },
  ]

  let startY = 38
  categories.forEach(cat => {
    const catProducts = products.filter(p => cat.matcher(p))
    if (catProducts.length === 0) return

    const catTotal = catProducts.reduce((sum, p) => sum + p.total, 0)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...cat.color)
    doc.text(`${cat.name} (${catProducts.length} itens) - ${formatCurrency(catTotal)}`, 14, startY)
    startY += 1

    const tableData = catProducts.map(p => [
      p.name,
      p.quantity,
      formatCurrency(p.total / p.quantity || (p as any).unitPrice || 0),
      formatCurrency(p.total)
    ])

    autoTable(doc, {
      head: [['Produto', 'Qtd', 'Unitario', 'Total']],
      body: tableData,
      startY,
      styles: { fontSize: 7 },
      headStyles: { fillColor: cat.color },
      margin: { left: 14, right: 14 }
    })

    startY = (doc as any).lastAutoTable.finalY + 6
    if (startY > 250) {
      doc.addPage()
      startY = 15
    }
  })
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
  const lines: string[] = [`*BAZAR TEUCO - ${getPageTitle(type).replace('Bazar TEUCO - ', '')}*`]
  lines.push(`Data: ${new Date().toLocaleDateString('pt-BR')}`)
  lines.push('')

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
      const sales = data as SaleData[]
      const total = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0)
      lines.push(`Receita: ${formatCurrency(total)}`)
      lines.push(`Vendas: ${sales.length}`)
      break
    }
    case 'report': {
      const report = data as ReportData
      const dateLabel = report.date 
        ? formatDateBR(report.date)
        : (report.year ? `${report.month ? `${report.month}/` : ''}${report.year}` : 'Relatório')
      lines.push(`*${dateLabel}*`)
      lines.push(`Receita: ${formatCurrency(report.summary.totalRevenue)}`)
      if (report.summary.bazarRevenue) lines.push(`Bazar: ${formatCurrency(report.summary.bazarRevenue)}`)
      if (report.summary.rifaRevenue) lines.push(`Rifa: ${formatCurrency(report.summary.rifaRevenue)}`)
      if (report.summary.avulsoRevenue) lines.push(`Avulsos: ${formatCurrency(report.summary.avulsoRevenue)}`)
      if (report.summary.doacaoRevenue) lines.push(`Doações: ${formatCurrency(report.summary.doacaoRevenue)}`)
      lines.push(`Vendas: ${report.summary.totalSales}`)
      lines.push('')
      lines.push(`*Mais vendidos:*`)
      const products = report.products || report.topProducts || []
      const top = [...products].sort((a, b) => b.quantity - a.quantity).slice(0, 5)
      top.forEach(p => {
        lines.push(`- ${p.name}: ${p.quantity} uni`)
      })
      break
    }
  }

  lines.push('')
  lines.push('_Exportado via Bazar TEUCO Dashboard_')

  return lines.join('\n')
}

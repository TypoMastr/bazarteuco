import { executeQuery, executeUpdate } from './mysql-client'
import { getSales, getSaleItems } from './smartpos-api'

export interface CachedSale {
  sale_id: string
  unique_identifier: string
  creation_date: Date
  total_amount: number
  discount_amount: number
  is_canceled: boolean
}

export interface CachedSaleItem {
  sale_id: string
  product_id: number | null
  product_name: string
  quantity: number
  unit_price: number
  net_item: number
  is_rifa: boolean
}

export async function initSalesCache(): Promise<void> {
  await executeUpdate(`
    CREATE TABLE IF NOT EXISTS sales_cache (
      id INT PRIMARY KEY AUTO_INCREMENT,
      sale_id VARCHAR(50) UNIQUE,
      unique_identifier VARCHAR(100),
      creation_date DATETIME,
      total_amount DECIMAL(10,2),
      discount_amount DECIMAL(10,2),
      is_canceled BOOLEAN DEFAULT FALSE,
      synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_creation_date (creation_date),
      INDEX idx_sale_id (sale_id)
    )
  `)

  await executeUpdate(`
    CREATE TABLE IF NOT EXISTS sale_items_cache (
      id INT PRIMARY KEY AUTO_INCREMENT,
      sale_id VARCHAR(50),
      product_id INT,
      product_name VARCHAR(255),
      quantity INT,
      unit_price DECIMAL(10,2),
      net_item DECIMAL(10,2),
      is_rifa BOOLEAN DEFAULT FALSE,
      is_avulso BOOLEAN DEFAULT FALSE,
      is_doacao BOOLEAN DEFAULT FALSE,
      synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sale_id (sale_id),
      INDEX idx_product_name (product_name),
      INDEX idx_is_rifa (is_rifa),
      INDEX idx_is_avulso (is_avulso),
      INDEX idx_is_doacao (is_doacao)
    )
  `)

  try {
    await executeUpdate(`ALTER TABLE sale_items_cache ADD COLUMN is_avulso BOOLEAN DEFAULT FALSE AFTER is_rifa`)
  } catch {}
  try {
    await executeUpdate(`ALTER TABLE sale_items_cache ADD COLUMN is_doacao BOOLEAN DEFAULT FALSE AFTER is_avulso`)
  } catch {}
}

export async function getSyncedDateRange(): Promise<{ earliest: string | null; latest: string | null }> {
  const result = await executeQuery<any>(`
    SELECT 
      MIN(DATE(creation_date)) as earliest,
      MAX(DATE(creation_date)) as latest
    FROM sales_cache
  `)
  const row = result[0] || {}
  return {
    earliest: row.earliest || null,
    latest: row.latest || null
  }
}

export async function getAvailableYears(): Promise<number[]> {
  const result = await executeQuery<any>(`
    SELECT DISTINCT YEAR(creation_date) as year
    FROM sales_cache
    ORDER BY year DESC
  `)
  return result.map((r: any) => Number(r.year))
}

export async function syncSalesFromAPI(
  startDate: string,
  endDate: string,
  onProgress?: (current: number, total: number) => void
): Promise<{ synced: number; failed: number; itemsSynced: number }> {
  await initSalesCache()

  const start = new Date(startDate)
  const end = new Date(endDate)
  let synced = 0
  let failed = 0
  let itemsSynced = 0

  const ranges: { start: Date; end: Date }[] = []
  let current = new Date(start)
  while (current < end) {
    const rangeEnd = new Date(current)
    rangeEnd.setDate(rangeEnd.getDate() + 119)
    if (rangeEnd > end) rangeEnd.setTime(end.getTime())
    ranges.push({ start: new Date(current), end: new Date(rangeEnd) })
    current = new Date(rangeEnd)
    current.setDate(current.getDate() + 1)
  }

  let totalRanges = ranges.length
  for (let r = 0; r < ranges.length; r++) {
    const range = ranges[r]
    const startISO = `${range.start.toISOString().split('T')[0]}T00:00:00Z`
    const endISO = `${range.end.toISOString().split('T')[0]}T23:59:59Z`

    const salesData = await getSales({ start: startISO, end: endISO })
    const salesList = Array.isArray(salesData) ? salesData : (salesData.items || salesData.data || [])
    const activeSales = salesList.filter((s: any) => !s.isCanceled)

    for (let i = 0; i < activeSales.length; i++) {
      const sale = activeSales[i]
      const saleId = sale.uniqueIdentifier || sale.id

      try {
        await executeUpdate(
          `INSERT IGNORE INTO sales_cache (sale_id, unique_identifier, creation_date, total_amount, discount_amount, is_canceled)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [saleId, sale.uniqueIdentifier || null, sale.creationDate, sale.totalAmount || 0, sale.discountAmount || 0, sale.isCanceled || false]
        )

        await executeUpdate(
          `DELETE FROM sale_items_cache WHERE sale_id = ?`,
          [saleId]
        )

        const itemsRes = await getSaleItems(sale.uniqueIdentifier || sale.id)
        const items = Array.isArray(itemsRes) ? itemsRes : []

        for (const item of items) {
          const productName = item.product?.name || 'AVULSO'
          const isRifa = productName.toLowerCase().includes('rifa')
          const isAvulso = productName.toLowerCase().includes('avulso')
          const isDoacao = productName.toLowerCase().includes('doacao') || productName.toLowerCase().includes('doação')

          await executeUpdate(
            `INSERT INTO sale_items_cache (sale_id, product_id, product_name, quantity, unit_price, net_item, is_rifa, is_avulso, is_doacao)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [saleId, item.product?.id || null, productName, item.quantity || 0, item.usedPrice || item.listPrice || 0, item.netItem || 0, isRifa, isAvulso, isDoacao]
          )
          itemsSynced++
        }

        synced++
      } catch (err) {
        console.error(`Error syncing sale ${saleId}:`, err)
        failed++
      }

      if (onProgress) {
        const overallProgress = ((r * activeSales.length + i + 1) / (totalRanges * 100)) * 100
        onProgress(Math.min(overallProgress, 100), 100)
      }
    }
  }

  return { synced, failed, itemsSynced }
}

export async function getDailyReport(date: string) {
  const startISO = `${date}T00:00:00Z`
  const endISO = `${date}T23:59:59Z`

  const sales = await executeQuery<any>(`
    SELECT sale_id, total_amount, discount_amount
    FROM sales_cache
    WHERE creation_date >= ? AND creation_date <= ?
    AND is_canceled = FALSE
  `, [startISO, endISO])

  const items = await executeQuery<any>(`
    SELECT product_name, quantity, unit_price, net_item, is_rifa, is_avulso, is_doacao
    FROM sale_items_cache
    WHERE sale_id IN (
      SELECT sale_id FROM sales_cache
      WHERE creation_date >= ? AND creation_date <= ?
      AND is_canceled = FALSE
    )
  `, [startISO, endISO])

  const productMap = new Map<string, { name: string; quantity: number; unitPrice: number; total: number; isRifa: boolean; isAvulso: boolean; isDoacao: boolean }>()

  for (const item of items) {
    const name = item.product_name
    const qty = Number(item.quantity)
    const price = Number(item.unit_price)
    const total = Number(item.net_item)
    const isRifa = Boolean(item.is_rifa)
    const isAvulso = Boolean(item.is_avulso)
    const isDoacao = Boolean(item.is_doacao)

    if (productMap.has(name)) {
      const e = productMap.get(name)!
      e.quantity += qty
      e.total += total
    } else {
      productMap.set(name, { name, quantity: qty, unitPrice: price, total, isRifa, isAvulso, isDoacao })
    }
  }

  const products = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity)
  const totalRevenue = products.reduce((sum, p) => sum + p.total, 0)
  const rifaRevenue = products.filter(p => p.isRifa).reduce((sum, p) => sum + p.total, 0)
  const avulsoRevenue = products.filter(p => p.isAvulso).reduce((sum, p) => sum + p.total, 0)
  const doacaoRevenue = products.filter(p => p.isDoacao).reduce((sum, p) => sum + p.total, 0)
  const bazarRevenue = products.filter(p => !p.isRifa && !p.isAvulso && !p.isDoacao).reduce((sum, p) => sum + p.total, 0)

  return {
    date,
    products,
    summary: {
      totalSales: sales.length,
      totalRevenue,
      rifaRevenue,
      bazarRevenue,
      avulsoRevenue,
      doacaoRevenue
    }
  }
}

export async function getMonthlyReport(year: number, month: number) {
  const startMonth = new Date(year, month - 1, 1)
  const endMonth = new Date(year, month, 0, 23, 59, 59)

  const dailyData = await executeQuery<any>(`
    SELECT 
      DATE(s.creation_date) as sale_date,
      SUM(s.total_amount) as total,
      COUNT(DISTINCT s.sale_id) as sales
    FROM sales_cache s
    WHERE s.creation_date >= ? AND s.creation_date <= ?
    AND s.is_canceled = FALSE
    GROUP BY DATE(s.creation_date)
    ORDER BY sale_date DESC
  `, [startMonth.toISOString(), endMonth.toISOString()])

  const items = await executeQuery<any>(`
    SELECT 
      i.product_name,
      SUM(i.quantity) as total_qty,
      SUM(i.net_item) as total_revenue,
      SUM(CASE WHEN i.is_rifa THEN i.net_item ELSE 0 END) as rifa_revenue
    FROM sale_items_cache i
    WHERE i.sale_id IN (
      SELECT sale_id FROM sales_cache
      WHERE creation_date >= ? AND creation_date <= ?
      AND is_canceled = FALSE
    )
    GROUP BY i.product_name
    ORDER BY total_qty DESC
  `, [startMonth.toISOString(), endMonth.toISOString()])

  const salesTotals = await executeQuery<any>(`
    SELECT 
      SUM(s.total_amount) as total,
      COUNT(DISTINCT s.sale_id) as sales
    FROM sales_cache s
    WHERE s.creation_date >= ? AND s.creation_date <= ?
    AND s.is_canceled = FALSE
  `, [startMonth.toISOString(), endMonth.toISOString()])

  const itemTotals = await executeQuery<any>(`
    SELECT 
      SUM(CASE WHEN NOT i.is_rifa AND NOT i.is_avulso AND NOT i.is_doacao THEN i.net_item ELSE 0 END) as bazar,
      SUM(CASE WHEN i.is_rifa THEN i.net_item ELSE 0 END) as rifa,
      SUM(CASE WHEN i.is_avulso THEN i.net_item ELSE 0 END) as avulso,
      SUM(CASE WHEN i.is_doacao THEN i.net_item ELSE 0 END) as doacao
    FROM sale_items_cache i
    WHERE i.sale_id IN (
      SELECT sc.sale_id FROM sales_cache sc
      WHERE sc.creation_date >= ? AND sc.creation_date <= ?
      AND sc.is_canceled = FALSE
    )
  `, [startMonth.toISOString(), endMonth.toISOString()])

  const st = salesTotals[0] || {}
  const it = itemTotals[0] || {}
  return {
    year,
    month,
    dailyData: dailyData.map((d: any) => ({
      date: d.sale_date,
      total: Number(d.total),
      sales: Number(d.sales)
    })),
    topProducts: items.map((i: any) => ({
      name: i.product_name,
      quantity: Number(i.total_qty),
      total: Number(i.total_revenue),
      rifaRevenue: Number(i.rifa_revenue)
    })),
    summary: {
      totalRevenue: Number(st.total) || 0,
      bazarRevenue: Number(it.bazar) || 0,
      rifaRevenue: Number(it.rifa) || 0,
      avulsoRevenue: Number(it.avulso) || 0,
      doacaoRevenue: Number(it.doacao) || 0,
      totalSales: Number(st.sales) || 0
    }
  }
}

export async function getAnnualReport(year: number) {
  const startYear = new Date(year, 0, 1)
  const endYear = new Date(year, 11, 31, 23, 59, 59)

  const monthlyData = await executeQuery<any>(`
    SELECT 
      MONTH(s.creation_date) as sale_month,
      SUM(s.total_amount) as total,
      COUNT(DISTINCT s.sale_id) as sales
    FROM sales_cache s
    WHERE s.creation_date >= ? AND s.creation_date <= ?
    AND s.is_canceled = FALSE
    GROUP BY MONTH(s.creation_date)
    ORDER BY sale_month DESC
  `, [startYear.toISOString(), endYear.toISOString()])

  const items = await executeQuery<any>(`
    SELECT 
      i.product_name,
      SUM(i.quantity) as total_qty,
      SUM(i.net_item) as total_revenue,
      SUM(CASE WHEN i.is_rifa THEN i.net_item ELSE 0 END) as rifa_revenue
    FROM sale_items_cache i
    WHERE i.sale_id IN (
      SELECT sale_id FROM sales_cache
      WHERE creation_date >= ? AND creation_date <= ?
      AND is_canceled = FALSE
    )
    GROUP BY i.product_name
    ORDER BY total_qty DESC
  `, [startYear.toISOString(), endYear.toISOString()])

  const totals = await executeQuery<any>(`
    SELECT 
      COUNT(DISTINCT s.sale_id) as sales
    FROM sales_cache s
    WHERE s.creation_date >= ? AND s.creation_date <= ?
    AND s.is_canceled = FALSE
  `, [startYear.toISOString(), endYear.toISOString()])

  const itemTotals = await executeQuery<any>(`
    SELECT 
      SUM(i.net_item) as total,
      SUM(CASE WHEN NOT i.is_rifa AND NOT i.is_avulso AND NOT i.is_doacao THEN i.net_item ELSE 0 END) as bazar,
      SUM(CASE WHEN i.is_rifa THEN i.net_item ELSE 0 END) as rifa,
      SUM(CASE WHEN i.is_avulso THEN i.net_item ELSE 0 END) as avulso,
      SUM(CASE WHEN i.is_doacao THEN i.net_item ELSE 0 END) as doacao
    FROM sale_items_cache i
    WHERE i.sale_id IN (
      SELECT sale_id FROM sales_cache
      WHERE creation_date >= ? AND creation_date <= ?
      AND is_canceled = FALSE
    )
  `, [startYear.toISOString(), endYear.toISOString()])

  const t = totals[0] || {}
  const it = itemTotals[0] || {}
  return {
    year,
    monthlyData: monthlyData.map((m: any) => ({
      month: Number(m.sale_month),
      total: Number(m.total),
      sales: Number(m.sales)
    })),
    topProducts: items.map((i: any) => ({
      name: i.product_name,
      quantity: Number(i.total_qty),
      total: Number(i.total_revenue),
      rifaRevenue: Number(i.rifa_revenue)
    })),
    summary: {
      totalRevenue: Number(it.total) || 0,
      bazarRevenue: Number(it.bazar) || 0,
      rifaRevenue: Number(it.rifa) || 0,
      avulsoRevenue: Number(it.avulso) || 0,
      doacaoRevenue: Number(it.doacao) || 0,
      totalSales: Number(t.sales) || 0
    }
  }
}

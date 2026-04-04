import { NextResponse } from 'next/server'
import { generateSiteHtml } from '@/lib/site-generator'
import * as ftp from 'basic-ftp'
import { Readable } from 'stream'
import { getPool, executeUpdate } from '@/lib/mysql-client'

const API_BASE = 'https://api.smartpos.app/v1'

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Api-Key-Id': process.env.SMARTPOS_API_KEY_ID!,
    'X-Api-Key-Secret': process.env.SMARTPOS_API_KEY_SECRET!,
  }
}

async function fetchAPI(path: string) {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, { headers: getHeaders() })
  if (!res.ok) throw new Error(`SmartPOS API Error: ${res.status} ${res.statusText}`)
  return res.json()
}

async function getAllProducts(): Promise<any[]> {
  const allProducts: any[] = []
  let page = 1
  let hasMore = true
  while (hasMore) {
    const data = await fetchAPI(`/products?page=${page}&size=100`)
    if (data?.items) {
      allProducts.push(...data.items)
      hasMore = data.items.length === 100
      page++
    } else {
      hasMore = false
    }
  }
  return allProducts
}

async function getAllCategories(): Promise<any[]> {
  const allCategories: any[] = []
  let page = 1
  let hasMore = true
  while (hasMore) {
    const data = await fetchAPI(`/categories?page=${page}&size=100`)
    if (data?.items) {
      allCategories.push(...data.items)
      hasMore = data.items.length === 100
      page++
    } else {
      hasMore = false
    }
  }
  return allCategories
}

async function syncAll() {
  await executeUpdate(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT PRIMARY KEY, name VARCHAR(255), view_mode VARCHAR(50),
      text VARCHAR(50), color VARCHAR(50), oculto BOOLEAN DEFAULT FALSE,
      show_catalog BOOLEAN DEFAULT TRUE, archived BOOLEAN DEFAULT FALSE,
      synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await executeUpdate(`
    CREATE TABLE IF NOT EXISTS products (
      id INT PRIMARY KEY, alpha_code VARCHAR(50), name VARCHAR(255),
      sell_value DECIMAL(10,2), cost_value DECIMAL(10,2), ean_code VARCHAR(50),
      minimum_stock DECIMAL(10,2) DEFAULT 0, no_stock BOOLEAN DEFAULT FALSE,
      category_id INT, category_name VARCHAR(100), api_data JSON,
      synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const [categories, products] = await Promise.all([getAllCategories(), getAllProducts()])

  const pool = getPool()
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    for (const cat of categories) {
      await conn.execute(
        `INSERT INTO categories (id, name, view_mode, text, color, oculto, show_catalog, archived, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE name = VALUES(name), view_mode = VALUES(view_mode), text = VALUES(text),
           color = VALUES(color), oculto = VALUES(oculto), show_catalog = VALUES(show_catalog),
           archived = VALUES(archived), synced_at = NOW()`,
        [cat.id, cat.name || '', cat.viewMode || '', cat.text || '', cat.color || '', cat.oculto || false, cat.showCatalog || true, cat.archived || false]
      )
    }

    for (const product of products) {
      const categoryId = product.category?.id || null
      const categoryName = product.category?.description || null
      await conn.execute(
        `INSERT INTO products (id, alpha_code, name, sell_value, cost_value, ean_code, minimum_stock, no_stock, category_id, category_name, api_data, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE alpha_code = VALUES(alpha_code), name = VALUES(name), sell_value = VALUES(sell_value),
           cost_value = VALUES(cost_value), ean_code = VALUES(ean_code), minimum_stock = VALUES(minimum_stock),
           no_stock = VALUES(no_stock), category_id = VALUES(category_id), category_name = VALUES(category_name),
           api_data = VALUES(api_data), synced_at = NOW()`,
        [product.id, product.alphaCode || '', product.name || '', product.sellValue || 0, product.costValue || 0, product.eanCode || '', product.minimumStock || 0, product.noStock || false, categoryId, categoryName, JSON.stringify(product)]
      )
    }

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }

  // Delete products from MySQL that no longer exist in SmartPOS (keep local pending products)
  const smartposIds = products.map(p => p.id)
  if (smartposIds.length > 0) {
    const placeholders = smartposIds.map(() => '?').join(',')
    await executeUpdate(
      `DELETE FROM products WHERE id > 0 AND id NOT IN (${placeholders})`,
      smartposIds
    )
  }

  return { categories: categories.length, products: products.length }
}

export async function POST() {
  try {
    // First, try to sync any pending local products to SmartPOS
    try {
      const { syncPendingProducts } = await import('@/lib/sync-to-mysql')
      const pendingResult = await syncPendingProducts()
      console.log(`[Site] Pending sync: ${pendingResult.success} success, ${pendingResult.failed} failed`)
    } catch (err) {
      console.log('[Site] Pending sync skipped or failed:', err)
    }
    
    // Then sync from SmartPOS to MySQL
    const syncResult = await syncAll()
    console.log(`[Site] Synced ${syncResult.categories} categories, ${syncResult.products} products`)

    const html = await generateSiteHtml()

    const ftpHost = process.env.FTP_HOST
    const ftpUser = process.env.FTP_USER
    const ftpPass = process.env.FTP_PASSWORD
    const ftpPort = parseInt(process.env.FTP_PORT || '21')
    const ftpPath = process.env.FTP_REMOTE_PATH

    if (!ftpHost || !ftpUser || !ftpPass || !ftpPath) {
      return NextResponse.json({ error: 'Credenciais FTP não configuradas' }, { status: 500 })
    }

    const client = new ftp.Client()
    client.ftp.verbose = false

    try {
      await client.access({
        host: ftpHost,
        user: ftpUser,
        password: ftpPass,
        port: ftpPort,
        secure: false,
      })

      await client.uploadFrom(
        Readable.from([html]),
        ftpPath
      )

      return NextResponse.json({ message: `Site atualizado! ${syncResult.products} produtos em ${syncResult.categories} categorias.` })
    } finally {
      client.close()
    }
  } catch (error: any) {
    console.error('[API] Site generation error:', error)
    return NextResponse.json({ error: error.message || 'Erro ao atualizar site' }, { status: 500 })
  }
}

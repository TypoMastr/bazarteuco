import { getPool, executeUpdate, executeQuery } from './mysql-client'

const API_BASE = 'https://api.smartpos.app/v1'

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Api-Key-Id': process.env.SMARTPOS_API_KEY_ID!,
    'X-Api-Key-Secret': process.env.SMARTPOS_API_KEY_SECRET!,
  }
}

async function fetchAPI(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, { headers: getHeaders(), ...options })
  if (!res.ok) throw new Error(`API Error: ${res.status}`)
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

export async function syncProductsToMySQL(): Promise<{ products: number; stock: number }> {
  const pool = getPool()

  await executeUpdate(`
    CREATE TABLE IF NOT EXISTS products (
      id INT PRIMARY KEY,
      alpha_code VARCHAR(50),
      name VARCHAR(255),
      sell_value DECIMAL(10,2),
      cost_value DECIMAL(10,2),
      ean_code VARCHAR(50),
      minimum_stock DECIMAL(10,2) DEFAULT 0,
      no_stock BOOLEAN DEFAULT FALSE,
      category_id INT,
      category_name VARCHAR(100),
      api_data JSON,
      synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await executeUpdate(`
    CREATE TABLE IF NOT EXISTS stock (
      id INT PRIMARY KEY AUTO_INCREMENT,
      product_id INT UNIQUE,
      quantity DECIMAL(10,2) DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const products = await getAllProducts()
  let productsSynced = 0
  let stockCreated = 0

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    for (const product of products) {
      const categoryId = product.category?.id || null
      const categoryName = product.category?.description || null
      const apiData = JSON.stringify(product)

      await conn.execute(
        `INSERT INTO products (id, alpha_code, name, sell_value, cost_value, ean_code, minimum_stock, no_stock, category_id, category_name, api_data, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE alpha_code = VALUES(alpha_code), name = VALUES(name), sell_value = VALUES(sell_value), cost_value = VALUES(cost_value), ean_code = VALUES(ean_code), minimum_stock = VALUES(minimum_stock), no_stock = VALUES(no_stock), category_id = VALUES(category_id), category_name = VALUES(category_name), api_data = VALUES(api_data), synced_at = NOW()`,
        [
          product.id,
          product.alphaCode || '',
          product.name || '',
          product.sellValue || 0,
          product.costValue || 0,
          product.eanCode || '',
          product.minimumStock || 0,
          product.noStock || false,
          categoryId,
          categoryName,
          apiData,
        ]
      )
      productsSynced++

      await conn.execute(
        `INSERT INTO stock (product_id, quantity)
         VALUES (?, 0)
         ON DUPLICATE KEY UPDATE product_id = product_id`,
        [product.id]
      )
      stockCreated++
    }

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }

  return { products: productsSynced, stock: stockCreated }
}

export async function syncCategoriesToMySQL(): Promise<number> {
  const pool = getPool()

  await executeUpdate(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT PRIMARY KEY,
      name VARCHAR(255),
      view_mode VARCHAR(50),
      text VARCHAR(50),
      color VARCHAR(50),
      oculto BOOLEAN DEFAULT FALSE,
      show_catalog BOOLEAN DEFAULT TRUE,
      archived BOOLEAN DEFAULT FALSE,
      synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const categories = await getAllCategories()
  let categoriesSynced = 0

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    for (const cat of categories) {
      await conn.execute(
        `INSERT INTO categories (id, name, view_mode, text, color, oculto, show_catalog, archived, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE name = VALUES(name), view_mode = VALUES(view_mode), text = VALUES(text), color = VALUES(color), oculto = VALUES(oculto), show_catalog = VALUES(show_catalog), archived = VALUES(archived), synced_at = NOW()`,
        [cat.id, cat.name || '', cat.viewMode || '', cat.text || '', cat.color || '', cat.oculto || false, cat.showCatalog || true, cat.archived || false]
      )
      categoriesSynced++
    }

    await conn.commit()
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }

  return categoriesSynced
}

export async function syncPendingProducts(): Promise<{ success: number; failed: number }> {
  const pool = getPool()
  
  // Get products with negative ID (locally created, pending sync)
  const pendingProducts = await executeQuery<any>(
    'SELECT * FROM products WHERE id < 0'
  )
  
  if (pendingProducts.length === 0) {
    return { success: 0, failed: 0 }
  }
  
  let success = 0
  let failed = 0
  
  for (const product of pendingProducts) {
    try {
      const payload = {
        alphaCode: product.alpha_code,
        description: product.name,
        sellValue: Number(product.sell_value),
        costValue: Number(product.cost_value),
        minimumStock: Number(product.minimum_stock),
        category: Number(product.category_id),
      }
      
      const result = await fetchAPI('/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      
      // Update with real SmartPOS ID
      await executeUpdate(
        'UPDATE products SET id = ?, api_data = ?, synced_at = NOW() WHERE id = ?',
        [result.id, JSON.stringify(result), product.id]
      )
      
      console.log(`[Sync] Synced product ${product.alpha_code} with SmartPOS ID ${result.id}`)
      success++
    } catch (err) {
      console.error(`[Sync] Failed to sync product ${product.alphaCode}:`, err)
      failed++
    }
  }
  
  return { success, failed }
}

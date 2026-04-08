import { executeQuery, executeUpdate, getPool } from './mysql-client'
import { getProducts, updateProduct } from './smartpos-api'

export interface ProductCache {
  id: number
  alpha_code: string
  name: string
  sell_value: number
  cost_value: number
  ean_code: string
  minimum_stock: number
  no_stock: boolean
  category_id: number | null
  category_name: string | null
  api_data: any
  synced_at: Date
}

export interface Stock {
  id: number
  product_id: number
  quantity: number
  updated_at: Date
}

export interface StockStatus {
  productId: number
  alphaCode: string
  name: string
  quantity: number
  minimumStock: number
  status: 'zerado' | 'baixo' | 'ok'
  sellValue: number
  categoryId: number | null
  categoryName: string | null
}

export async function initDatabase(): Promise<void> {
  const queries = [
    `CREATE TABLE IF NOT EXISTS products (
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
    )`,
    `CREATE TABLE IF NOT EXISTS stock (
      id INT PRIMARY KEY AUTO_INCREMENT,
      product_id INT UNIQUE,
      quantity DECIMAL(10,2) DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )`,
    `CREATE TABLE IF NOT EXISTS stock_history (
      id INT PRIMARY KEY AUTO_INCREMENT,
      product_id INT,
      quantity DECIMAL(10,2),
      operation ENUM('SALE', 'ADJUSTMENT', 'SYNC', 'INIT', 'SET'),
      notes VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sync_log (
      id INT PRIMARY KEY AUTO_INCREMENT,
      entity_type VARCHAR(50),
      status ENUM('PENDING', 'SYNCED', 'FAILED'),
      details TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sales_cache (
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
    )`,
    `CREATE TABLE IF NOT EXISTS sale_items_cache (
      id INT PRIMARY KEY AUTO_INCREMENT,
      sale_id VARCHAR(50),
      product_id INT,
      product_name VARCHAR(255),
      quantity INT,
      unit_price DECIMAL(10,2),
      net_item DECIMAL(10,2),
      is_rifa BOOLEAN DEFAULT FALSE,
      synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sale_id (sale_id),
      INDEX idx_product_name (product_name),
      INDEX idx_is_rifa (is_rifa)
    )`,
  ]

  for (const query of queries) {
    await executeUpdate(query)
  }
}

export async function syncProductsFromAPI(): Promise<{ synced: number; failed: number }> {
  let page = 1
  let synced = 0
  let failed = 0
  let hasMore = true

  while (hasMore) {
    try {
      const data = await getProducts({ page: String(page), size: '100' })
      const products = data.items || []

      if (products.length === 0) {
        hasMore = false
        break
      }

      // Batch insert products
      const pool = getPool()
      const conn = await pool.getConnection()
      try {
        await conn.beginTransaction()

        for (const product of products) {
          try {
            const categoryId = product.category?.id || null
            const categoryName = product.category?.description || null

            await conn.execute(
              `INSERT INTO products (id, alpha_code, name, sell_value, cost_value, ean_code, minimum_stock, no_stock, category_id, category_name, api_data, synced_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
               ON DUPLICATE KEY UPDATE
                 alpha_code = VALUES(alpha_code),
                 name = VALUES(name),
                 sell_value = VALUES(sell_value),
                 cost_value = VALUES(cost_value),
                 ean_code = VALUES(ean_code),
                 minimum_stock = VALUES(minimum_stock),
                 no_stock = VALUES(no_stock),
                 category_id = VALUES(category_id),
                 category_name = VALUES(category_name),
                 api_data = VALUES(api_data),
                 synced_at = NOW()`,
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
                JSON.stringify(product),
              ]
            )

            const productName = (product.name || '').toLowerCase()
            const isRifa = productName.includes('rifa')
            const isDoacao = productName.includes('doacao') || productName.includes('doação')

            if (!isRifa && !isDoacao) {
              await conn.execute(
                `INSERT INTO stock (product_id, quantity)
                 VALUES (?, 0)
                 ON DUPLICATE KEY UPDATE product_id = product_id`,
                [product.id]
              )
            }

            synced++
          } catch (err) {
            console.error(`Erro ao sincronizar produto ${product.id}:`, err)
            failed++
          }
        }

        await conn.commit()
      } catch (err) {
        await conn.rollback()
        throw err
      } finally {
        conn.release()
      }

      page++
      if (products.length < 100) hasMore = false
    } catch (err) {
      console.error('Erro na página de sync:', err)
      break
    }
  }

  try {
    await executeUpdate(
      `INSERT INTO sync_log (entity_type, status, details, created_at) VALUES ('products', 'SYNCED', ?, NOW())`,
      [`Synced: ${synced}, Failed: ${failed}`]
    )
  } catch {}

  return { synced, failed }
}

export async function getStockStatus(): Promise<StockStatus[]> {
  const products = await executeQuery<any>(`
    SELECT 
      p.id as productId,
      p.alpha_code as alphaCode,
      p.name,
      COALESCE(s.quantity, 0) as quantity,
      p.minimum_stock as minimumStock,
      p.sell_value as sellValue,
      p.category_id as categoryId,
      p.category_name as categoryName
    FROM products p
    LEFT JOIN stock s ON p.id = s.product_id
    WHERE LOWER(p.name) NOT LIKE '%rifa%'
      AND LOWER(p.name) NOT LIKE '%doacao%'
      AND LOWER(p.name) NOT LIKE '%doação%'
    ORDER BY p.name ASC
  `)

  return products.map((p) => {
    const qty = Number(p.quantity)
    const minStock = Number(p.minimumStock) || 5
    const status = qty === 0 ? 'zerado' : qty <= minStock ? 'baixo' : 'ok'
    return {
      productId: p.productId,
      alphaCode: p.alphaCode,
      name: p.name,
      quantity: qty,
      minimumStock: minStock,
      status,
      sellValue: Number(p.sellValue) || 0,
      categoryId: p.categoryId || null,
      categoryName: p.categoryName || null,
    }
  })
}

export async function getStockSummary(): Promise<{ zerado: number; baixo: number; ok: number; total: number }> {
  const result = await executeQuery<any>(`
    SELECT 
      COALESCE(SUM(CASE WHEN COALESCE(s.quantity, 0) = 0 THEN 1 ELSE 0 END), 0) as zerado,
      COALESCE(SUM(CASE WHEN COALESCE(s.quantity, 0) >= 1 AND COALESCE(s.quantity, 0) <= COALESCE(p.minimum_stock, 5) THEN 1 ELSE 0 END), 0) as baixo,
      COALESCE(SUM(CASE WHEN COALESCE(s.quantity, 0) > COALESCE(p.minimum_stock, 5) THEN 1 ELSE 0 END), 0) as ok,
      COUNT(*) as total
    FROM products p
    LEFT JOIN stock s ON p.id = s.product_id
    WHERE LOWER(p.name) NOT LIKE '%rifa%'
      AND LOWER(p.name) NOT LIKE '%doacao%'
      AND LOWER(p.name) NOT LIKE '%doação%'
  `)

  const r = result[0] || { zerado: 0, baixo: 0, ok: 0, total: 0 }
  return {
    zerado: Number(r.zerado),
    baixo: Number(r.baixo),
    ok: Number(r.ok),
    total: Number(r.total),
  }
}

export async function updateStock(productId: number, newQuantity: number): Promise<boolean> {
  try {
    await executeUpdate(
      `INSERT INTO stock (product_id, quantity, updated_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE quantity = ?, updated_at = NOW()`,
      [productId, newQuantity, newQuantity]
    )

    await executeUpdate(
      `INSERT INTO stock_history (product_id, quantity, operation, notes, created_at)
       VALUES (?, ?, 'SET', 'Atualização manual', NOW())`,
      [productId, newQuantity]
    )

    return true
  } catch (err) {
    console.error('Erro ao atualizar estoque:', err)
    return false
  }
}

export async function updateMinStock(productId: number, newMinStock: number): Promise<boolean> {
  try {
    await executeUpdate(
      `UPDATE products SET minimum_stock = ? WHERE id = ?`,
      [newMinStock, productId]
    )

    return true
  } catch (err) {
    console.error('Erro ao atualizar estoque mínimo:', err)
    return false
  }
}

export async function updateMinStockBatch(updates: { productId: number; minStock: number }[]): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  for (const update of updates) {
    const result = await updateMinStock(update.productId, update.minStock)
    if (result) success++
    else failed++
  }

  return { success, failed }
}

export async function updateStockBatch(updates: { productId: number; quantity: number }[]): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  for (const update of updates) {
    const result = await updateStock(update.productId, update.quantity)
    if (result) success++
    else failed++
  }

  return { success, failed }
}

export async function decrementStockOnSale(saleItems: { productId: number; quantity: number }[]): Promise<void> {
  for (const item of saleItems) {
    try {
      // Atomic decrement to prevent race conditions
      await executeUpdate(
        `UPDATE stock SET quantity = GREATEST(0, quantity - ?), updated_at = NOW()
         WHERE product_id = ?`,
        [item.quantity, item.productId]
      )

      await executeUpdate(
        `INSERT INTO stock_history (product_id, quantity, operation, notes, created_at)
         VALUES (?, ?, 'SALE', 'Venda registrada', NOW())`,
        [item.productId, item.quantity]
      )

      try {
        await fetch(`https://api.smartpos.app/v1/products/stock/${item.productId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key-Id': process.env.SMARTPOS_API_KEY_ID!,
            'X-Api-Key-Secret': process.env.SMARTPOS_API_KEY_SECRET!,
          },
          body: JSON.stringify({
            productId: item.productId,
            productVariantId: null,
            quantity: item.quantity,
            stockOperation: 'REMOVE',
          }),
        })
      } catch (apiErr) {
        console.warn('API SmartPOS stock remove falhou:', apiErr)
      }
    } catch (err) {
      console.error(`Erro ao decrementar stock do produto ${item.productId}:`, err)
    }
  }
}

export async function getProductStock(productId: number): Promise<number> {
  const result = await executeQuery<any>(
    'SELECT quantity FROM stock WHERE product_id = ?',
    [productId]
  )
  return result.length > 0 ? Number(result[0].quantity) : 0
}

export async function getLastSyncTime(): Promise<Date | null> {
  const result = await executeQuery<any>(
    `SELECT created_at FROM sync_log ORDER BY created_at DESC LIMIT 1`
  )
  return result.length > 0 ? result[0].created_at : null
}
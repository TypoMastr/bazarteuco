import { NextRequest, NextResponse } from 'next/server'
import { initDatabase, getLastSyncTime } from '@/lib/hybrid-stock'
import { executeQuery, executeUpdate, getPool } from '@/lib/mysql-client'

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
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API Error: ${res.status} - ${text}`)
  }
  const text = await res.text()
  if (!text) return { items: [] }
  return JSON.parse(text)
}

export async function GET() {
  try {
    await initDatabase()
    const lastSync = await getLastSyncTime()
    return NextResponse.json({ lastSync })
  } catch (error) {
    console.error('[API] Stock sync GET error:', error)
    return NextResponse.json({ error: 'Erro ao verificar sincronização' }, { status: 500 })
  }
}

export async function POST() {
  try {
    await initDatabase()
    
    const pool = getPool()
    const conn = await pool.getConnection()
    
    let totalSynced = 0
    let page = 1
    const pageSize = 200
    
    try {
      await conn.beginTransaction()
      
      while (true) {
        console.log(`[Sync] Fetching page ${page}...`)
        const data = await fetchAPI(`/products?page=${page}&size=${pageSize}`)
        const products = Array.isArray(data?.items) ? data.items : []
        
        console.log(`[Sync] Got ${products.length} products on page ${page}`)
        if (products.length === 0) break
        
        for (const product of products) {
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
          
          totalSynced++
        }
        
        if (products.length < pageSize) break
        page++
      }
      
      // Delete products that no longer exist in SmartPOS (keep pending local products)
      await conn.execute(
        `DELETE s FROM stock s 
         INNER JOIN products p ON s.product_id = p.id 
         WHERE p.id > 0`
      )
      
      await conn.commit()
    } catch (err) {
      await conn.rollback()
      console.error('[Sync] Transaction error:', err)
      throw err
    } finally {
      conn.release()
    }
    
    console.log(`[Sync] Complete. Total synced: ${totalSynced}`)
    return NextResponse.json({
      success: true,
      synced: totalSynced,
      failed: 0,
    })
  } catch (error: any) {
    console.error('[API] Stock sync POST error:', error)
    return NextResponse.json({ error: 'Erro ao sincronizar: ' + (error?.message || 'Erro desconhecido') }, { status: 500 })
  }
}
import { getProducts, createProduct } from '@/lib/smartpos-api'
import { syncProductsToMySQL } from '@/lib/sync-to-mysql'
import { executeUpdate } from '@/lib/mysql-client'
import { NextRequest, NextResponse } from 'next/server'

const SYNC_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes
let lastProductsSync = 0

async function getAllProducts(): Promise<{ items: any[]; totalRecords: number }> {
  const allItems: any[] = []
  let page = 1
  let hasMore = true
  let totalRecords = 0

  while (hasMore) {
    const data = await getProducts({ page: String(page), size: '100' })
    if (data?.items) {
      allItems.push(...data.items)
      totalRecords = data.totalRecords || allItems.length
      hasMore = data.items.length === 100
      page++
    } else {
      hasMore = false
    }
  }

  return { items: allItems, totalRecords }
}

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams)
    
    let data
    if (params.page || params.size) {
      data = await getProducts(params)
    } else {
      data = await getAllProducts()
    }
    
    // Sync para MySQL em background com cooldown
    const now = Date.now()
    if (now - lastProductsSync > SYNC_COOLDOWN_MS) {
      lastProductsSync = now
      syncProductsToMySQL().catch(err => console.error('[Sync] Products sync error:', err))
    }
    
    const response = NextResponse.json(data)
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  } catch (error) {
    console.error('[API] Products error:', error)
    return NextResponse.json({ error: 'Erro ao carregar produtos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    
    const { initialStock, ...productBody } = body
    
    // SmartPOS API requires 'description' field (separate from 'name')
    if (!productBody.description && productBody.name) {
      productBody.description = productBody.name
    }
    
    // Build only the fields SmartPOS API needs
    const smartposPayload = {
      alphaCode: productBody.alphaCode,
      description: productBody.description || productBody.name,
      sellValue: Number(productBody.sellValue) || 0,
      costValue: Number(productBody.costValue) || 0,
      minimumStock: Number(productBody.minimumStock) || 0,
      category: Number(productBody.category),
      observation: productBody.observation || undefined,
      detail: productBody.detail || undefined,
      isFractional: false,
      noStock: false,
      isOpenValue: false,
      showCatalog: true,
      productOrigin: 'NACIONAL',
      ncm: 5100010,
      unit: 18008022,
    }
    
    console.log('[API] Sending to SmartPOS:', JSON.stringify(smartposPayload))
    let data: any
    let createdLocally = false
    
    try {
      data = await createProduct(smartposPayload)
      console.log('[API] SmartPOS response:', JSON.stringify(data))
    } catch (smartposError: any) {
      // SmartPOS API failing - create locally as fallback
      console.error('[API] SmartPOS failed, creating locally:', smartposError.message)
      
      const localId = -Math.floor(Math.random() * 1000000) // Negative temp ID
      data = {
        id: localId,
        alphaCode: productBody.alphaCode,
        name: productBody.description || productBody.name,
        description: productBody.description || productBody.name,
        sellValue: Number(productBody.sellValue) || 0,
        costValue: Number(productBody.costValue) || 0,
        minimumStock: Number(productBody.minimumStock) || 0,
        category: Number(productBody.category),
        observation: productBody.observation,
        noStock: false,
        isFractional: false,
        pendingSync: true,
        createdAt: new Date().toISOString(),
      }
      createdLocally = true
      
      // Save to local products table
      try {
        await executeUpdate(
          `INSERT INTO products (id, alpha_code, name, sell_value, cost_value, minimum_stock, category_id, api_data, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE alpha_code = VALUES(alpha_code), name = VALUES(name), sell_value = VALUES(sell_value)`,
          [data.id, data.alphaCode, data.name, data.sellValue, data.costValue, data.minimumStock, data.category, JSON.stringify(data)]
        )
      } catch (dbErr) {
        console.error('[API] Local insert error:', dbErr)
      }
    }
    
    // Sync para MySQL em background (não bloqueia a resposta)
    if (!createdLocally) {
      syncProductsToMySQL().catch(err => console.error('[Sync] Products sync error:', err))
    } else {
      // Try to sync pending products immediately
      import('@/lib/sync-to-mysql').then(({ syncPendingProducts }) => {
        syncPendingProducts().catch(err => console.error('[Sync] Pending sync error:', err))
      }).catch(() => {})
    }
    
    // Definir estoque inicial no MySQL
    if (initialStock !== undefined && initialStock !== null) {
      try {
        await executeUpdate(
          `INSERT INTO stock (product_id, quantity)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE quantity = ?`,
          [data.id, initialStock, initialStock]
        )
      } catch (err) {
        console.error('[API] Error setting initial stock:', err)
      }
    }
    
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[API] Create product error:', error)
    return NextResponse.json({ error: error.message || 'Erro ao criar produto' }, { status: 500 })
  }
}
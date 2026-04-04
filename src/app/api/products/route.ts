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
    const data = await createProduct(productBody)
    
    // Sync imediato após criar
    await syncProductsToMySQL()
    
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
  } catch (error) {
    console.error('[API] Create product error:', error)
    return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 })
  }
}
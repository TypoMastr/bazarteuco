import { getProduct, updateProduct, deleteProduct } from '@/lib/smartpos-api'
import { syncProductsToMySQL } from '@/lib/sync-to-mysql'
import { executeUpdate, executeQuery } from '@/lib/mysql-client'
import { NextRequest, NextResponse } from 'next/server'

const API_BASE = 'https://api.smartpos.app/v1'

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Api-Key-Id': process.env.SMARTPOS_API_KEY_ID!,
    'X-Api-Key-Secret': process.env.SMARTPOS_API_KEY_SECRET!,
  }
}

async function findTaxRuleId(): Promise<string | null> {
  try {
    const url = `${API_BASE}/taxes-rules?page=1&size=100`
    console.log('[API] Fetching tax rules from:', url)
    const res = await fetch(url, { headers: getHeaders() })
    if (res.ok) {
      const data = await res.json()
      console.log('[API] Tax rules response:', JSON.stringify(data).substring(0, 500))
      const items = data?.items || data?.data || (Array.isArray(data) ? data : [])
      if (items.length > 0) {
        const id = items[0]?.id
        if (id) {
          console.log('[API] Found tax rule ID:', id)
          return String(id)
        }
      }
    } else {
      const errText = await res.text()
      console.log('[API] Tax rules fetch failed:', res.status, errText.substring(0, 200))
    }
  } catch (err) {
    console.log('[API] Tax rules fetch error:', err)
  }
  return null
}

async function ensureTablesExist() {
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
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const numericId = parseInt(id)
    
    // Check if it's a local product (negative ID)
    if (numericId < 0) {
      try {
        await ensureTablesExist()
        const products = await executeQuery<any>('SELECT * FROM products WHERE id = ?', [numericId])
        if (products.length > 0) {
          const p = products[0]
          const apiData = p.api_data ? JSON.parse(p.api_data) : {}
          return NextResponse.json({
            id: p.id,
            alphaCode: p.alpha_code,
            name: p.name,
            sellValue: p.sell_value,
            costValue: p.cost_value,
            minimumStock: p.minimum_stock,
            category: apiData.category,
            pendingSync: true,
          })
        }
        return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
      } catch (err) {
        console.error('[API] Error fetching local product:', err)
        return NextResponse.json({ error: 'Erro ao carregar produto local' }, { status: 500 })
      }
    }
    
    // Normal flow - get from SmartPOS
    const data = await getProduct(id)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[API] Get product error:', error)
    return NextResponse.json({ error: 'Erro ao carregar produto' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const numericId = parseInt(id)
    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    
    // Convert to uppercase
    body.name = (body.name || '').toUpperCase()
    body.alphaCode = (body.alphaCode || '').toUpperCase()
    body.observation = body.observation ? body.observation.toUpperCase() : undefined
    body.description = body.description ? body.description.toUpperCase() : undefined
    
    // Check if it's a local product (negative ID)
    if (numericId < 0) {
      try {
        await executeUpdate(
          'UPDATE products SET alpha_code = ?, name = ?, sell_value = ?, cost_value = ?, minimum_stock = ?, api_data = ? WHERE id = ?',
          [body.alphaCode, body.name, body.sellValue, body.costValue, body.minimumStock, JSON.stringify(body), numericId]
        )
        return NextResponse.json({ success: true, updated: true, local: true })
      } catch (err) {
        console.error('[API] Error updating local product:', err)
        return NextResponse.json({ error: 'Erro ao atualizar produto local' }, { status: 500 })
      }
    }
    
    // Normal flow - update in SmartPOS
    // Fetch current product to get UUID taxesRuleId, detail.id, etc.
    let current: any = null
    try {
      current = await getProduct(id)
      console.log('[API] Current product taxesRule:', JSON.stringify(current?.taxesRule))
      console.log('[API] Current product taxesRuleId:', current?.taxesRuleId)
      console.log('[API] Current product detail:', JSON.stringify(current?.detail))
    } catch {
      // If we can't fetch, build payload without it
    }

    // Build payload matching the creation format — only fields the client sent
    const payload: Record<string, unknown> = {}

    if (body.name !== undefined) {
      payload.description = (body.name || '').toUpperCase()
    }
    if (body.alphaCode !== undefined) payload.alphaCode = (body.alphaCode || '').toUpperCase()
    if (body.sellValue !== undefined) payload.sellValue = Number(body.sellValue) || 0
    if (body.costValue !== undefined) payload.costValue = Number(body.costValue) || 0
    if (body.minimumStock !== undefined) payload.minimumStock = Number(body.minimumStock) || 0
    if (body.isFractional !== undefined) payload.isFractional = body.isFractional
    if (body.noStock !== undefined) payload.noStock = body.noStock
    if (body.isOpenValue !== undefined) payload.isOpenValue = body.isOpenValue
    if (body.showCatalog !== undefined) payload.showCatalog = body.showCatalog
    if (body.favorite !== undefined) payload.favorite = body.favorite
    if (body.productOrigin !== undefined) payload.productOrigin = body.productOrigin
    if (body.eanCode !== undefined) payload.eanCode = body.eanCode
    if (body.netWeight !== undefined) payload.netWeight = Number(body.netWeight)
    if (body.grossWeight !== undefined) payload.grossWeight = Number(body.grossWeight)
    if (body.observation !== undefined) payload.observation = body.observation
    if (body.exTipi !== undefined) payload.exTipi = body.exTipi
    if (body.cest !== undefined) payload.cest = body.cest
    if (body.category !== undefined) {
      const catId = Number(body.category)
      if (catId) payload.category = catId
    }
    if (body.unit !== undefined) {
      const unitId = Number(body.unit)
      if (unitId) payload.unit = unitId
    }
    if (body.ncm !== undefined) {
      const ncmCode = Number(body.ncm)
      if (ncmCode) payload.ncm = ncmCode
    }
    if (body.supplierId !== undefined) {
      const supId = Number(body.supplierId)
      if (supId) payload.supplierId = supId
    }
    if (body.promotionalValue !== undefined) {
      payload.promotionalValue = Number(body.promotionalValue) || 0
      if (body.promotionalExpirationDate !== undefined) payload.promotionalExpirationDate = body.promotionalExpirationDate
      if (body.promotionalDisplayTimer !== undefined) payload.promotionalDisplayTimer = body.promotionalDisplayTimer
    }

    // Only send detail/googleProductCategory/taxesRule if the client explicitly provided them
    // (creation doesn't send these fields, so partial PUT should also skip them by default)
    if (body.detail !== undefined && body.detail?.text) {
      payload.detail = {
        ...current?.detail,
        text: (body.detail.text || '').toUpperCase(),
        viewMode: body.detail.viewMode || 'TEXT',
        color: body.detail.color || '#ffff6010',
      }
    }
    if (body.googleProductCategoryId !== undefined) {
      payload.googleProductCategoryId = String(body.googleProductCategoryId)
    }
    if (body.taxesRuleId !== undefined) {
      payload.taxesRuleId = String(body.taxesRuleId)
    }

    // Try to find a valid tax rule from the API (like creation would auto-assign)
    const freshRuleId = await findTaxRuleId()
    if (freshRuleId) {
      payload.taxesRuleId = freshRuleId
    }

    console.log('[API] Update payload:', JSON.stringify(payload))
    const data = await updateProduct(id, payload)
    
    // Sync para MySQL em background (não bloqueia a resposta)
    syncProductsToMySQL().catch(err => console.error('[Sync] Products sync error:', err))
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('[API] Update product error:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: `Erro ao atualizar produto: ${message}` }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const numericId = parseInt(id)
    
    // Check if it's a local product (negative ID)
    if (numericId < 0) {
      try {
        await ensureTablesExist()
        await executeUpdate('DELETE FROM stock WHERE product_id = ?', [numericId])
        await executeUpdate('DELETE FROM products WHERE id = ?', [numericId])
        return NextResponse.json({ success: true, deleted: true, local: true })
      } catch (err: any) {
        console.error('[API] Error deleting local product:', err)
        return NextResponse.json({ error: 'Erro ao excluir produto local: ' + (err?.message || 'Erro desconhecido') }, { status: 500 })
      }
    }
    
    // Try to delete from SmartPOS
    try {
      const result = await deleteProduct(id)
      
      // Delete from local MySQL as well (stock first, then products)
      try {
        await executeUpdate('DELETE FROM stock WHERE product_id = ?', [numericId])
        await executeUpdate('DELETE FROM products WHERE id = ?', [numericId])
      } catch (err) {
        console.error('[API] Error deleting from local MySQL:', err)
      }
      
      return NextResponse.json({ success: true, deleted: result !== null })
    } catch (err) {
      return NextResponse.json({ error: 'Erro ao excluir produto da SmartPOS' }, { status: 500 })
    }
  } catch (error) {
    console.error('[API] Delete product error:', error)
    return NextResponse.json({ error: 'Erro ao excluir produto' }, { status: 500 })
  }
}
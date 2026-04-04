import { getProduct, updateProduct, deleteProduct } from '@/lib/smartpos-api'
import { syncProductsToMySQL } from '@/lib/sync-to-mysql'
import { executeUpdate, executeQuery } from '@/lib/mysql-client'
import { NextRequest, NextResponse } from 'next/server'

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
    const data = await updateProduct(id, body)
    
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
      return NextResponse.json({ success: true, deleted: result !== null })
    } catch (err) {
      // If SmartPOS fails, still delete locally if it was synced before
      return NextResponse.json({ error: 'Erro ao excluir produto da SmartPOS' }, { status: 500 })
    }
  } catch (error) {
    console.error('[API] Delete product error:', error)
    return NextResponse.json({ error: 'Erro ao excluir produto' }, { status: 500 })
  }
}
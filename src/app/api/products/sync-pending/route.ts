import { NextRequest, NextResponse } from 'next/server'
import { syncPendingProducts } from '@/lib/sync-to-mysql'
import { executeQuery, executeUpdate } from '@/lib/mysql-client'

export async function GET() {
  try {
    // List pending products
    const pendingProducts = await executeQuery<any>('SELECT * FROM products WHERE id < 0')
    return NextResponse.json({ products: pendingProducts })
  } catch (error) {
    console.error('[API] List pending products error:', error)
    return NextResponse.json({ error: 'Erro ao listar produtos pendentes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    
    // Delete specific product by ID
    if (body.deleteId) {
      const numericId = parseInt(body.deleteId)
      if (numericId < 0) {
        await executeUpdate('DELETE FROM products WHERE id = ?', [numericId])
        await executeUpdate('DELETE FROM stock WHERE product_id = ?', [numericId])
        return NextResponse.json({ success: true, deleted: numericId })
      }
      return NextResponse.json({ error: 'ID deve ser negativo (produto local)' }, { status: 400 })
    }
    
    // Delete all pending products
    if (body.deleteAll) {
      await executeUpdate('DELETE FROM products WHERE id < 0')
      await executeUpdate('DELETE FROM stock WHERE product_id < 0')
      return NextResponse.json({ success: true, deletedAll: true })
    }
    
    // Sync pending products
    const result = await syncPendingProducts()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] Sync pending products error:', error)
    return NextResponse.json({ error: 'Erro ao sincronizar produtos pendentes' }, { status: 500 })
  }
}

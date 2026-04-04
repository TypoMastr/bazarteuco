import { NextRequest, NextResponse } from 'next/server'
import { executeUpdate } from '@/lib/mysql-client'

export async function POST() {
  try {
    await executeUpdate('SET FOREIGN_KEY_CHECKS = 0')
    
    await executeUpdate('DELETE FROM sale_items_cache')
    await executeUpdate('DELETE FROM sales_cache')
    await executeUpdate('DELETE FROM stock_history')
    await executeUpdate('DELETE FROM stock')
    await executeUpdate('DELETE FROM products')
    await executeUpdate('DELETE FROM categories')
    await executeUpdate('DELETE FROM sync_log')
    
    await executeUpdate('SET FOREIGN_KEY_CHECKS = 1')
    
    return NextResponse.json({ message: 'Banco local limpo com sucesso' })
  } catch (error) {
    console.error('[API] Cleanup error:', error)
    return NextResponse.json({ error: 'Erro ao limpar banco' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Endpoint de cleanup. Use POST para limpar o banco local.',
    tables: ['products', 'categories', 'stock', 'stock_history', 'sales_cache', 'sale_items_cache', 'sync_log']
  })
}
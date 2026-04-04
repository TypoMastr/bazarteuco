import { getProduct, updateProduct, deleteProduct } from '@/lib/smartpos-api'
import { syncProductsToMySQL } from '@/lib/sync-to-mysql'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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
    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
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
    await deleteProduct(id)
    
    // Sync para MySQL em background (não bloqueia a resposta)
    syncProductsToMySQL().catch(err => console.error('[Sync] Products sync error:', err))
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Delete product error:', error)
    return NextResponse.json({ error: 'Erro ao excluir produto' }, { status: 500 })
  }
}
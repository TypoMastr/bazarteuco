import { getCategory, updateCategory, deleteCategory } from '@/lib/smartpos-api'
import { syncCategoriesToMySQL } from '@/lib/sync-to-mysql'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const data = await getCategory(id)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[API] Get category error:', error)
    return NextResponse.json({ error: 'Erro ao carregar categoria' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    const data = await updateCategory(id, body)
    
    // Sync imediato após editar
    await syncCategoriesToMySQL()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('[API] Update category error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar categoria' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await deleteCategory(id)
    
    // Sync imediato após deletar
    await syncCategoriesToMySQL()
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Delete category error:', error)
    return NextResponse.json({ error: 'Erro ao excluir categoria' }, { status: 500 })
  }
}
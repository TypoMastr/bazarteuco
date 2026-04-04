import { getCategories, createCategory } from '@/lib/smartpos-api'
import { syncCategoriesToMySQL } from '@/lib/sync-to-mysql'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams)
    const data = await getCategories(params)
    
    // Sync para MySQL em background
    syncCategoriesToMySQL().catch(err => console.error('[Sync] Categories sync error:', err))
    
    const response = NextResponse.json(data)
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  } catch (error) {
    console.error('[API] Categories error:', error)
    return NextResponse.json({ error: 'Erro ao carregar categorias' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    const data = await createCategory(body)
    
    // Sync imediato após criar
    await syncCategoriesToMySQL()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('[API] Create category error:', error)
    return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 })
  }
}
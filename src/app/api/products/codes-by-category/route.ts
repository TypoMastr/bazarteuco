import { NextRequest, NextResponse } from 'next/server'
import { getCategories, getProductsByCategory } from '@/lib/smartpos-api'

async function getAllProductsForCategory(categoryId: number): Promise<string[]> {
  const allCodes: string[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const productsData = await getProductsByCategory(categoryId, { page: String(page), size: '100' })
    if (productsData?.items) {
      allCodes.push(...productsData.items.map((p: any) => p.alphaCode).filter((code: string) => code))
      hasMore = productsData.items.length === 100
      page++
    } else {
      hasMore = false
    }
  }

  return allCodes
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const includeAll = searchParams.get('all') === 'true'

    if (includeAll) {
      const categoriesData = await getCategories({ page: '1', size: '100' })
      const categories = categoriesData.items || []
      
      const result: Record<string, string[]> = {}
      
      for (const category of categories) {
        try {
          result[category.id] = await getAllProductsForCategory(category.id)
        } catch {
          result[category.id] = []
        }
      }
      
      return NextResponse.json(result)
    }

    if (!categoryId) {
      return NextResponse.json({ error: 'categoryId é obrigatório' }, { status: 400 })
    }

    const codes = await getAllProductsForCategory(parseInt(categoryId))
    return NextResponse.json({ codes })
  } catch (error) {
    console.error('[API] Error fetching codes by category:', error)
    return NextResponse.json({ error: 'Erro ao buscar códigos' }, { status: 500 })
  }
}
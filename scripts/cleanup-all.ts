import { config } from 'dotenv'
config({ path: '.env.local' })

const API_BASE = 'https://api.smartpos.app/v1'

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Api-Key-Id': process.env.SMARTPOS_API_KEY_ID!,
    'X-Api-Key-Secret': process.env.SMARTPOS_API_KEY_SECRET!,
  }
}

async function fetchAPI(path: string, options: RequestInit = {}, retries = 3): Promise<any> {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  })
  if (!res.ok) {
    const error = await res.text()
    if (res.status === 429 && retries > 0) {
      console.log('  Rate limited, waiting 3s...')
      await new Promise(r => setTimeout(r, 3000))
      return fetchAPI(path, options, retries - 1)
    }
    throw new Error(`API Error: ${res.status} - ${error}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

async function getAllProducts(): Promise<any[]> {
  const allProducts: any[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    console.log(`  Fetching products page ${page}...`)
    const data = await fetchAPI(`/products?page=${page}&size=100`)
    if (data?.items) {
      allProducts.push(...data.items)
      hasMore = data.items.length === 100
      page++
    } else {
      hasMore = false
    }
  }

  return allProducts
}

async function getAllCategories(): Promise<any[]> {
  const allCategories: any[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    console.log(`  Fetching categories page ${page}...`)
    const data = await fetchAPI(`/categories?page=${page}&size=100`)
    if (data?.items) {
      allCategories.push(...data.items)
      hasMore = data.items.length === 100
      page++
    } else {
      hasMore = false
    }
  }

  return allCategories
}

async function deleteProductsBulk(ids: number[]): Promise<number> {
  const BATCH_SIZE = 20
  let deleted = 0
  
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE)
    const idParams = batch.map(id => `id=${id}`).join('&')
    try {
      await fetchAPI(`/products?${idParams}`, { method: 'DELETE' })
      deleted += batch.length
      console.log(`  Deletados ${deleted}/${ids.length} produtos...`)
    } catch (err) {
      console.error(`  Erro no batch ${i/BATCH_SIZE + 1}:`, err)
    }
  }
  
  return deleted
}

async function deleteCategoriesBulk(ids: number[]): Promise<number> {
  const BATCH_SIZE = 20
  let deleted = 0
  
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE)
    const idParams = batch.map(id => `id=${id}`).join('&')
    try {
      await fetchAPI(`/categories?${idParams}`, { method: 'DELETE' })
      deleted += batch.length
      console.log(`  Deletadas ${deleted}/${ids.length} categorias...`)
    } catch (err) {
      console.error(`  Erro no batch ${i/BATCH_SIZE + 1}:`, err)
    }
  }
  
  return deleted
}

async function syncLocalDatabase() {
  console.log('\n--- Sincronizando banco de dados local ---')
  
  const mysql = await import('mysql2/promise')
  
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '',
    user: process.env.MYSQL_USER || '',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || '',
  })

  try {
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0')
    
    await connection.execute('DELETE FROM sale_items_cache')
    await connection.execute('DELETE FROM sales_cache')
    await connection.execute('DELETE FROM stock_history')
    await connection.execute('DELETE FROM stock')
    await connection.execute('DELETE FROM products')
    await connection.execute('DELETE FROM categories')
    await connection.execute('DELETE FROM sync_log')
    
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1')
    
    console.log('  Banco local sincronizado!')
  } finally {
    await connection.end()
  }
}

async function main() {
  console.log('=== APAGAR TODOS PRODUTOS E CATEGORIAS ===\n')

  console.log('--- Buscando produtos ---')
  const products = await getAllProducts()
  console.log(`  Total de produtos encontrados: ${products.length}`)

  if (products.length > 0) {
    const productIds = products.map(p => p.id)
    console.log('\n--- Deletando produtos em massa ---')
    const deleted = await deleteProductsBulk(productIds)
    console.log(`  ${deleted} produtos deletados da API`)
  } else {
    console.log('\n  Nenhum produto para deletar')
  }

  console.log('\n--- Buscando categorias ---')
  const categories = await getAllCategories()
  console.log(`  Total de categorias encontradas: ${categories.length}`)

  if (categories.length > 0) {
    console.log('\n--- Deletando categorias em massa ---')
    const categoryIds = categories.map(c => c.id)
    const deleted = await deleteCategoriesBulk(categoryIds)
    console.log(`  ${deleted} categorias deletadas da API`)
  } else {
    console.log('\n  Nenhuma categoria para deletar')
  }

  console.log('\n--- Sincronizando banco de dados local ---')
  try {
    await syncLocalDatabase()
  } catch (err) {
    console.log(`  Aviso: ${err}`)
    console.log('  (Banco local pode não estar configurado)')
  }

  console.log('\n=== CONCLUÍDO ===')
}

main().catch(console.error)

const API_BASE = 'https://api.smartpos.app/v1'

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Api-Key-Id': process.env.SMARTPOS_API_KEY_ID!,
    'X-Api-Key-Secret': process.env.SMARTPOS_API_KEY_SECRET!,
  }
}

async function fetchAPI(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers: { ...getHeaders(), ...options.headers },
  })
  if (!res.ok) {
    const error = await res.text()
    throw new Error(`SmartPOS API Error: ${res.status} - ${error}`)
  }
  const text = await res.text()
  if (!text) return null
  return JSON.parse(text)
}

export async function getSales(params?: Record<string, string>) {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const defaults = {
    start: thirtyDaysAgo.toISOString(),
    end: now.toISOString(),
  }
  const merged = { ...defaults, ...params }
  const qs = '?' + new URLSearchParams(merged).toString()
  return fetchAPI(`/sales${qs}`)
}

export async function getSalesByDate(date: string) {
  const start = `${date}T00:00:00Z`
  const end = `${date}T23:59:59Z`
  const qs = `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
  return fetchAPI(`/sales${qs}`)
}

export async function getSaleItems(uniqueIdentifier: string) {
  return fetchAPI(`/sales/${uniqueIdentifier}/items`)
}

export async function getProducts(params?: Record<string, string>) {
  const defaults = { page: '1', size: '100' }
  const merged = { ...defaults, ...params }
  const qs = '?' + new URLSearchParams(merged).toString()
  return fetchAPI(`/products${qs}`)
}

export async function getProductsByCategory(categoryId: number, params?: Record<string, string>): Promise<{ items: { alphaCode: string }[] }> {
  const defaults = { page: '1', size: '200', categoryId: String(categoryId) }
  const merged = { ...defaults, ...params }
  const qs = '?' + new URLSearchParams(merged).toString()
  return fetchAPI(`/products${qs}`)
}

export async function getProduct(id: string) {
  return fetchAPI(`/products/${id}`)
}

export async function createProduct(data: Record<string, unknown>) {
  return fetchAPI('/products', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateProduct(id: string, data: Record<string, unknown>) {
  return fetchAPI(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function updateProductFields(id: string, data: Record<string, unknown>) {
  const updateData: Record<string, unknown> = {}
  
  if (data.name) updateData.description = data.name
  if (data.minimumStock !== undefined) updateData.minimumStock = data.minimumStock
  if (data.noStock !== undefined) updateData.noStock = data.noStock
  
  if (Object.keys(updateData).length === 0) {
    return null
  }
  
  return fetchAPI(`/products/${id}`, { method: 'PUT', body: JSON.stringify(updateData) })
}

export async function deleteProduct(id: string) {
  return fetchAPI(`/products/${id}`, { method: 'DELETE' })
}

export async function getCategories(params?: Record<string, string>) {
  const defaults = { page: '1', size: '100' }
  const merged = { ...defaults, ...params }
  const qs = '?' + new URLSearchParams(merged).toString()
  return fetchAPI(`/categories${qs}`)
}

export async function getCategory(id: string) {
  return fetchAPI(`/categories/${id}`)
}

export async function createCategory(data: Record<string, unknown>) {
  return fetchAPI('/categories', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateCategory(id: string, data: Record<string, unknown>) {
  return fetchAPI(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function deleteCategory(id: string) {
  return fetchAPI(`/categories/${id}`, { method: 'DELETE' })
}

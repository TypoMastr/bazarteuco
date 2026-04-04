import { CACHE_MAX_DAYS } from './constants'

const CACHE_PREFIX = 'smartpos_'

interface CachedData<T = unknown> {
  data: T
  lastSyncAt: string
  cachedAt: string
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function getCacheKey(prefix: string, date: string): string {
  return `${CACHE_PREFIX}${prefix}_${date}`
}

function getCache<T>(prefix: string, date: string): CachedData<T> | null {
  if (!isBrowser()) return null
  try {
    const raw = localStorage.getItem(getCacheKey(prefix, date))
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedData<T>
    const cachedTime = new Date(parsed.cachedAt).getTime()
    if (isNaN(cachedTime)) return null
    const age = Date.now() - cachedTime
    if (age > CACHE_MAX_DAYS * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(getCacheKey(prefix, date))
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function setCache<T>(prefix: string, date: string, data: T, lastSyncAt: string): void {
  if (!isBrowser()) return
  try {
    const entry: CachedData<T> = { data, lastSyncAt, cachedAt: new Date().toISOString() }
    localStorage.setItem(getCacheKey(prefix, date), JSON.stringify(entry))
  } catch {
    // Storage full or unavailable
  }
}

function clearOldCache(): void {
  if (!isBrowser()) return
  try {
    const keysToRemove: string[] = []
    const cutoff = Date.now() - CACHE_MAX_DAYS * 24 * 60 * 60 * 1000
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(CACHE_PREFIX)) {
        try {
          const raw = localStorage.getItem(key)
          if (raw) {
            const parsed = JSON.parse(raw) as CachedData
            const cachedTime = new Date(parsed.cachedAt).getTime()
            if (isNaN(cachedTime) || cachedTime < cutoff) {
              keysToRemove.push(key)
            }
          }
        } catch {
          keysToRemove.push(key)
        }
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  } catch {
    // Ignore
  }
}

function getLatestTimestamp(sales: { creationDate?: string }[]): string {
  if (sales.length === 0) return ''
  const sorted = [...sales].sort((a, b) => {
    const aTime = a.creationDate ? new Date(a.creationDate).getTime() : 0
    const bTime = b.creationDate ? new Date(b.creationDate).getTime() : 0
    return bTime - aTime
  })
  return sorted[0]?.creationDate || ''
}

function mergeSales(existing: { id: string | number; creationDate?: string }[], newSales: { id: string | number; creationDate?: string }[]): { id: string | number; creationDate?: string }[] {
  const existingIds = new Set(existing.map((s) => s.id))
  const unique = newSales.filter((s) => !existingIds.has(s.id))
  return [...unique, ...existing].sort((a, b) => {
    const aTime = a.creationDate ? new Date(a.creationDate).getTime() : 0
    const bTime = b.creationDate ? new Date(b.creationDate).getTime() : 0
    return bTime - aTime
  })
}

function mergeItems(existing: Record<string, unknown[]>, newItems: Record<string, unknown[]>): Record<string, unknown[]> {
  return { ...existing, ...newItems }
}

export const salesCache = {
  get: (date: string) => getCache<unknown[]>('sales', date),
  set: (date: string, data: unknown[], lastSyncAt: string) => setCache('sales', date, data, lastSyncAt),
  getItems: (date: string) => getCache<Record<string, unknown[]>>('items', date),
  setItems: (date: string, data: Record<string, unknown[]>, lastSyncAt: string) => setCache('items', date, data, lastSyncAt),
  getLatestTimestamp,
  mergeSales: mergeSales as (existing: unknown[], newSales: unknown[]) => unknown[],
  mergeItems,
  clearOldCache,
}

export const reportCache = {
  get: (date: string) => getCache<unknown>('report', date),
  set: (date: string, data: unknown, lastSyncAt: string) => setCache('report', date, data, lastSyncAt),
  getLatestTimestamp,
  clearOldCache,
}

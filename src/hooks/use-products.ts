'use client'
import { useState, useEffect, useCallback } from 'react'

export function useProducts(params?: Record<string, string>) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalRecords, setTotalRecords] = useState(0)

  const fetchProducts = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      const res = await fetch(`/api/products${qs}`, { signal })
      if (!res.ok) throw new Error('Erro ao carregar produtos')
      const json = await res.json()
      if (json.items) {
        setData(json.items)
        setTotalRecords(json.totalRecords || 0)
      } else if (Array.isArray(json)) {
        setData(json)
        setTotalRecords(json.length)
      } else {
        setData(json.data || [])
        setTotalRecords(json.totalRecords || 0)
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(String(err))
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [JSON.stringify(params)])

  useEffect(() => {
    const controller = new AbortController()
    fetchProducts(controller.signal)
    return () => controller.abort()
  }, [fetchProducts])

  return { data, loading, error, totalRecords, refetch: () => fetchProducts() }
}
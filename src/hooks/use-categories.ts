'use client'
import { useState, useEffect, useCallback } from 'react'

export function useCategories(params?: Record<string, string>) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      const res = await fetch(`/api/categories${qs}`, { signal })
      if (!res.ok) throw new Error('Erro ao carregar categorias')
      const json = await res.json()
      if (json.items) setData(json.items)
      else if (Array.isArray(json)) setData(json)
      else setData(json.data || [])
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
    fetchCategories(controller.signal)
    return () => controller.abort()
  }, [fetchCategories])

  return { data, loading, error, refetch: () => fetchCategories() }
}
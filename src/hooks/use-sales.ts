'use client'
import { useState, useEffect, useCallback } from 'react'

export function useSales(params?: Record<string, string>) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      const res = await fetch(`/api/sales${qs}`)
      if (!res.ok) throw new Error('Erro ao carregar vendas')
      const json = await res.json()
      setData(Array.isArray(json) ? json : json.items || json.data || [])
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(params)])

  useEffect(() => { fetchSales() }, [fetchSales])

  return { data, loading, error, refetch: fetchSales }
}

export function useSaleItems(uniqueIdentifier: string) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    if (!uniqueIdentifier) return
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/sales/${uniqueIdentifier}/items`)
      if (!res.ok) throw new Error('Erro ao carregar itens')
      const json = await res.json()
      setData(Array.isArray(json) ? json : [])
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [uniqueIdentifier])

  useEffect(() => { fetchItems() }, [fetchItems])

  return { data, loading, error, refetch: fetchItems }
}

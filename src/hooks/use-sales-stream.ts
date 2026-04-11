'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

interface UseSalesStreamOptions {
  enabled?: boolean
  hasSalesToday?: boolean
  onNewSale?: (sale: any) => void
  onRefresh?: () => void
}

export function useSalesStream({ enabled = true, hasSalesToday = false, onNewSale, onRefresh }: UseSalesStreamOptions = {}) {
  const [status, setStatus] = useState<'connected' | 'reconnecting' | 'offline'>('offline')
  const [isInitialSync, setIsInitialSync] = useState(false)
  const knownSaleIds = useRef<Set<string>>(new Set())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isSyncingRef = useRef(false)
  const onRefreshRef = useRef(onRefresh)
  const lastPolledDate = useRef<string>(new Date().toISOString().split('T')[0])
  onRefreshRef.current = onRefresh

  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 800
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.2)
    } catch {}
  }, [])

  const shouldPoll = useCallback(() => {
    if (!enabled) return false
    if (!hasSalesToday) return false
    if (document.visibilityState === 'hidden') return false
    
    const today = new Date().toISOString().split('T')[0]
    if (today !== lastPolledDate.current) return false
    
    return true
  }, [enabled, hasSalesToday])

  const checkNewSales = useCallback(async () => {
    if (isSyncingRef.current) return
    if (!shouldPoll()) return

    isSyncingRef.current = true

    try {
      const today = new Date().toISOString().split('T')[0]
      const now = new Date().toISOString()
      const res = await fetch(`/api/sales?start=${today}T00:00:00Z&end=${now}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('Check failed')

      const data = await res.json()
      const salesList = Array.isArray(data) ? data : (data?.items || data?.data || [])

      let hasNew = false
      for (const sale of salesList) {
        const saleId = sale.id || sale.uniqueIdentifier
        if (!knownSaleIds.current.has(saleId)) {
          knownSaleIds.current.add(saleId)
          if (onNewSale) onNewSale({
            sale_id: sale.id,
            unique_identifier: sale.uniqueIdentifier,
            creation_date: sale.creationDate,
            total_amount: sale.totalAmount,
            is_canceled: sale.isCanceled,
          })
          playNotificationSound()
          hasNew = true
        }
      }

      if (hasNew && onRefreshRef.current) {
        onRefreshRef.current()
      }

      setStatus('connected')
    } catch {
      setStatus('reconnecting')
    } finally {
      isSyncingRef.current = false
    }
  }, [shouldPoll, onNewSale, playNotificationSound])

  const syncAndCheck = useCallback(async () => {
    if (!shouldPoll()) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    if (isSyncingRef.current) return
    isSyncingRef.current = true

    try {
      await fetch('/api/sync-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    } catch {
      console.error('[Stream] Sync failed')
    }

    isSyncingRef.current = false
    await checkNewSales()

    if (shouldPoll() && !intervalRef.current) {
      intervalRef.current = setInterval(syncAndCheck, 5000)
    }
  }, [shouldPoll, checkNewSales])

  useEffect(() => {
    if (!enabled || !hasSalesToday) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    const today = new Date().toISOString().split('T')[0]
    lastPolledDate.current = today

    setIsInitialSync(true)
    syncAndCheck().then(() => {
      setIsInitialSync(false)
    })

    intervalRef.current = setInterval(syncAndCheck, 5000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && shouldPoll()) {
        syncAndCheck()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, hasSalesToday, syncAndCheck, shouldPoll])

  return {
    status,
    isInitialSync,
    triggerSync: () => {
      if (shouldPoll()) syncAndCheck()
    },
  }
}

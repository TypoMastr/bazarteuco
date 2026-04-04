'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

interface UseSalesStreamOptions {
  enabled?: boolean
  onNewSale?: (sale: any) => void
}

export function useSalesStream({ enabled = true, onNewSale }: UseSalesStreamOptions = {}) {
  const [status, setStatus] = useState<'connected' | 'reconnecting' | 'offline'>('reconnecting')
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null)
  const [isCatchingUp, setIsCatchingUp] = useState(false)
  const [catchUpProgress, setCatchUpProgress] = useState(0)
  const [catchUpMessage, setCatchUpMessage] = useState('')
  const [hasSalesToday, setHasSalesToday] = useState(false)
  const [catchUpDone, setCatchUpDone] = useState(false)
  const knownSaleIds = useRef<Set<string>>(new Set())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isSyncingRef = useRef(false)
  const catchUpDoneRef = useRef(false)

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

  const syncSales = useCallback(async (isCatchUp = false) => {
    if (isSyncingRef.current) return
    isSyncingRef.current = true

    try {
      if (isCatchUp) {
        setIsCatchingUp(true)
        setCatchUpProgress(10)
        setCatchUpMessage('Buscando vendas do sistema...')
      }

      const body: any = {}
      if (lastSyncDate) body.since = lastSyncDate

      const res = await fetch('/api/sync-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('Sync failed')

      const data = await res.json()

      if (data.synced > 0 || data.lastSyncDate) {
        setHasSalesToday(true)
      }

      if (isCatchUp) {
        setCatchUpProgress(70)
        setCatchUpMessage(data.synced > 0 ? `Encontradas ${data.synced} venda(s) nova(s)...` : 'Nenhuma venda pendente.')

        await new Promise(r => setTimeout(r, 400))

        setCatchUpProgress(100)
        setCatchUpMessage('Dados atualizados!')
        catchUpDoneRef.current = true
        setCatchUpDone(true)
      }

      if (data.lastSyncDate) {
        setLastSyncDate(data.lastSyncDate)
      }

      setStatus('connected')
    } catch {
      setStatus('reconnecting')
      if (isCatchUp) {
        setCatchUpMessage('Erro ao sincronizar. Tentando novamente...')
      }
    } finally {
      isSyncingRef.current = false
    }
  }, [lastSyncDate])

  const checkNewSales = useCallback(async () => {
    if (!lastSyncDate || isSyncingRef.current || !hasSalesToday) return

    try {
      const res = await fetch(`/api/check-new-sales?since=${encodeURIComponent(lastSyncDate)}`)
      if (!res.ok) throw new Error('Check failed')

      const data = await res.json()

      if (data.sales && data.sales.length > 0) {
        for (const sale of data.sales) {
          if (!knownSaleIds.current.has(sale.sale_id)) {
            knownSaleIds.current.add(sale.sale_id)
            if (onNewSale) onNewSale(sale)
            playNotificationSound()
          }
        }
      }

      setStatus('connected')
    } catch {
      setStatus('reconnecting')
    }
  }, [lastSyncDate, onNewSale, playNotificationSound, hasSalesToday])

  // Initial catch-up only
  useEffect(() => {
    if (!enabled || catchUpDoneRef.current) return
    syncSales(true)
  }, [enabled, syncSales])

  // Polling only AFTER catch-up is done
  useEffect(() => {
    if (!enabled || !catchUpDone || !hasSalesToday) return

    const runCycle = () => {
      syncSales(false).then(() => {
        checkNewSales()
      })
    }

    intervalRef.current = setInterval(runCycle, 5000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [enabled, catchUpDone, hasSalesToday, syncSales, checkNewSales])

  return {
    status,
    isCatchingUp,
    catchUpProgress,
    catchUpMessage,
    lastSyncDate,
    hasSalesToday,
    triggerSync: () => {
      catchUpDoneRef.current = false
      setCatchUpDone(false)
      syncSales(true)
    },
  }
}

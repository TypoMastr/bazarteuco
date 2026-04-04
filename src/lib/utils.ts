import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(d)
}

export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(d)
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '-'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export function formatDateTimeBR(isoString: string): string {
  if (!isoString) return '-'
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function todayBR(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const saoPauloOffset = 180 // UTC-3
  const diff = saoPauloOffset + offset
  const spDate = new Date(now.getTime() + diff * 60 * 1000)
  return spDate.toISOString().split('T')[0]
}

export function daysAgoBR(days: number): string {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const saoPauloOffset = 180
  const diff = saoPauloOffset + offset
  const spDate = new Date(now.getTime() + diff * 60 * 1000 - days * 24 * 60 * 60 * 1000)
  return spDate.toISOString().split('T')[0]
}

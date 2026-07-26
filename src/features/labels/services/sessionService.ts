'use client'

/**
 * Sesión de trabajo — permite volver al dashboard y seguir imprimiendo
 * sin tener que subir otra vez el mismo archivo.
 *
 * Guarda la lista tal como quedó: productos, comparación de precios y qué
 * estaba marcado para imprimir. Vive en localStorage (por equipo); si no hay
 * sesión local, el dashboard reabre la lista desde el historial de snapshots.
 */

import { ProductWithDiff } from '@/features/labels/types'

const KEY = 'precios_session_v1'

export interface WorkSession {
  fileName: string
  savedAt: string // ISO
  products: ProductWithDiff[]
}

export function saveSession(session: WorkSession): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    // Sin espacio en localStorage: la sesión es una comodidad, no se rompe nada.
  }
}

export function loadSession(): WorkSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as WorkSession
    if (!Array.isArray(parsed.products) || parsed.products.length === 0) return null
    return parsed
  } catch {
    return null
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* ignorar */
  }
}

/** "hace 10 minutos", "hace 3 horas", "ayer", "el 24 de julio". */
export function describeWhen(iso: string): string {
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return ''

  const minutes = Math.floor((Date.now() - then.getTime()) / 60000)
  if (minutes < 1) return 'hace un momento'
  if (minutes < 60) return `hace ${minutes} minuto${minutes === 1 ? '' : 's'}`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} hora${hours === 1 ? '' : 's'}`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`

  return `el ${then.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}`
}

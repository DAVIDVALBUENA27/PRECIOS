'use client'

import { ColMapping } from '@/features/labels/types'

/**
 * Recordar las columnas del archivo para que la próxima vez se conecten solas.
 *
 * 1. Formato "Maestro de Productos" del POS (Código Barras, Código Producto,
 *    Inventario Caja, Nombre Grupo II, Nombre Producto, Ubicación, Valor Caja
 *    Contado): se reconoce de una vez, sin pasar por la pantalla de columnas.
 * 2. Cualquier otro archivo: se recuerda la última confirmación hecha para
 *    ese mismo juego de encabezados.
 */

const LS_KEY = 'precios_column_memory_v1'

export interface ColumnSetup {
  mapping: ColMapping
  /** Columnas extra que el negocio decidió NO traer. */
  excluded: string[]
}

export function normalizeHeader(h: string): string {
  return String(h ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function headersKey(headers: string[]): string {
  return headers.map(normalizeHeader).filter(Boolean).sort().join('|')
}

const MAESTRO = {
  sku: 'codigo barras',
  name: 'nombre producto',
  price: 'valor caja contado',
  lab: 'nombre grupo ii',
}
const MAESTRO_EXTRAS = ['codigo producto', 'inventario caja', 'ubicacion']

function maestroSetup(headers: string[]): ColumnSetup | null {
  const norm = headers.map(normalizeHeader)
  const idx = (name: string) => norm.indexOf(name)
  const all = [...Object.values(MAESTRO), ...MAESTRO_EXTRAS]
  if (all.some((name) => idx(name) === -1)) return null
  return {
    mapping: {
      sku: idx(MAESTRO.sku),
      name: idx(MAESTRO.name),
      price: idx(MAESTRO.price),
      lab: idx(MAESTRO.lab),
      content: null, // el contenido se saca del nombre ("370 ML")
    },
    excluded: [],
  }
}

function readAll(): Record<string, ColumnSetup> {
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, ColumnSetup>) : {}
  } catch {
    return {}
  }
}

/** Configuración de columnas conocida para estos encabezados, o null. */
export function findColumnSetup(headers: string[]): ColumnSetup | null {
  const saved = typeof window !== 'undefined' ? readAll()[headersKey(headers)] : undefined
  const valid = saved && Object.values(saved.mapping).every((i) => i === null || i < headers.length)
  return valid ? saved : maestroSetup(headers)
}

export function rememberColumnSetup(headers: string[], setup: ColumnSetup): void {
  try {
    const all = readAll()
    all[headersKey(headers)] = setup
    window.localStorage.setItem(LS_KEY, JSON.stringify(all))
  } catch {
    // Sin localStorage: la próxima vez se pide confirmar columnas, nada más.
  }
}

/** Columnas extra a traer (todas menos las excluidas). */
export function extrasToInclude(headers: string[], excluded: string[]): Set<string> {
  const skip = new Set(excluded)
  return new Set(headers.map((h) => String(h).trim()).filter((h) => h !== '' && !skip.has(h)))
}

'use client'

/**
 * Snapshot Service — historial de precios.
 *
 * Estrategia HÍBRIDA:
 *   1. localStorage  → siempre disponible, funciona sin Supabase.
 *   2. Supabase      → sincronización cuando el usuario tiene perfil.
 *
 * Así el historial funciona desde la primera carga, aunque las tablas
 * de Supabase no existan o el perfil del usuario no esté creado.
 */

import { createClient } from '@/lib/supabase/client'
import { RawProduct } from '@/features/labels/types'

// ─── localStorage ────────────────────────────────────────────────────────────

const LS_KEY = 'precios_snapshots_v1'

interface LocalSnap {
  date: string             // YYYY-MM-DD
  productCount: number
  products: RawProduct[]
}

function lsGetAll(): LocalSnap[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as LocalSnap[]) : []
  } catch { return [] }
}

function lsSave(snaps: LocalSnap[]): void {
  if (typeof window === 'undefined') return
  try {
    // Máximo 60 días para no saturar localStorage
    const trimmed = snaps
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 60)
    window.localStorage.setItem(LS_KEY, JSON.stringify(trimmed))
  } catch { /* quota exceeded — ignorar */ }
}

function lsUpsertSnapshot(date: string, products: RawProduct[]): void {
  const snaps = lsGetAll().filter((s) => s.date !== date)
  snaps.unshift({ date, productCount: products.length, products })
  lsSave(snaps)
}

// ─── Supabase (opcional) ──────────────────────────────────────────────────────

async function getBusinessId(): Promise<string | null> {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null
    const { data, error } = await sb
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single()
    if (error || !data) return null
    return data.business_id as string
  } catch { return null }
}

function toDbRow(p: RawProduct, businessId: string) {
  return {
    business_id: businessId,
    sku: p.sku,
    name: p.name,
    price: p.price,
    lab: p.lab,
    content_raw: p.contentRaw,
    content_qty: p.contentParsed?.normalizedQty ?? null,
    content_unit: p.contentParsed?.normalizedUnit ?? null,
    unit_price: p.unitPrice,
  }
}

function fromDbRow(row: Record<string, unknown>): RawProduct {
  return {
    sku: row.sku as string,
    name: row.name as string,
    price: row.price !== null ? Number(row.price) : null,
    lab: (row.lab as string) ?? 'Sin laboratorio',
    contentRaw: (row.content_raw as string) ?? null,
    contentParsed: row.content_qty != null && row.content_unit != null
      ? {
          quantity: Number(row.content_qty),
          unit: row.content_unit as 'gr' | 'ml' | 'kg' | 'l' | 'un',
          normalizedQty: Number(row.content_qty),
          normalizedUnit: row.content_unit as 'gr' | 'ml',
        }
      : null,
    unitPrice: row.unit_price !== null ? Number(row.unit_price) : null,
  }
}

async function sbSaveSnapshot(products: RawProduct[]): Promise<void> {
  const businessId = await getBusinessId()
  if (!businessId) return

  const sb = createClient()
  const today = new Date().toISOString().slice(0, 10)

  const productRows = products.map((p) => ({
    ...toDbRow(p, businessId),
    updated_at: new Date().toISOString(),
  }))
  await sb.from('products').upsert(productRows, { onConflict: 'business_id,sku' })

  const snapshotRows = products.map((p) => ({
    ...toDbRow(p, businessId),
    snapshot_date: today,
  }))
  await sb
    .from('price_snapshots')
    .upsert(snapshotRows, { onConflict: 'business_id,snapshot_date,sku' })
}

async function sbLoadLast(): Promise<RawProduct[] | null> {
  const businessId = await getBusinessId()
  if (!businessId) return null
  const sb = createClient()

  const { data: latest } = await sb
    .from('price_snapshots')
    .select('snapshot_date')
    .eq('business_id', businessId)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single()

  if (!latest) return null

  const { data: rows, error } = await sb
    .from('price_snapshots')
    .select('*')
    .eq('business_id', businessId)
    .eq('snapshot_date', latest.snapshot_date)

  if (error || !rows) return null
  return rows.map(fromDbRow)
}

// ─── API pública ─────────────────────────────────────────────────────────────

/**
 * Guarda snapshot: localStorage SIEMPRE + Supabase en segundo plano.
 */
export async function saveSnapshot(products: RawProduct[]): Promise<void> {
  if (products.length === 0) return
  const today = new Date().toISOString().slice(0, 10)

  // 1) localStorage: rápido, siempre funciona
  lsUpsertSnapshot(today, products)

  // 2) Supabase: best-effort, sin bloquear
  sbSaveSnapshot(products).catch((err) =>
    console.warn('[SnapshotService] Supabase save failed (no crítico):', err)
  )
}

/**
 * Carga el último snapshot: primero localStorage, luego Supabase como respaldo.
 */
export async function loadLastSnapshot(): Promise<RawProduct[]> {
  // 1) localStorage: instantáneo
  const local = lsGetAll()
  if (local.length > 0) return local[0].products

  // 2) Supabase: si localStorage está vacío (ej: primer uso en este dispositivo)
  try {
    const sbData = await sbLoadLast()
    if (sbData && sbData.length > 0) {
      // Cachear en localStorage para próximas consultas
      const today = new Date().toISOString().slice(0, 10)
      lsUpsertSnapshot(today, sbData)
      return sbData
    }
  } catch { /* Supabase no disponible */ }

  return []
}

/**
 * Devuelve cuántas fechas de snapshot hay (para saber si es "primera carga").
 */
export async function getSnapshotCount(): Promise<number> {
  const local = lsGetAll()
  if (local.length > 0) return local.length

  try {
    const businessId = await getBusinessId()
    if (!businessId) return 0
    const sb = createClient()
    const { count } = await sb
      .from('price_snapshots')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
    return count ?? 0
  } catch { return 0 }
}

// ─── Para página /ajustes ─────────────────────────────────────────────────────

export interface SnapshotSummary {
  date: string
  productCount: number
  source: 'local' | 'supabase'
}

/**
 * Lista todos los snapshots disponibles (localStorage preferido).
 */
export async function listSnapshots(): Promise<SnapshotSummary[]> {
  const local = lsGetAll()

  if (local.length > 0) {
    return local.map((s) => ({
      date: s.date,
      productCount: s.productCount,
      source: 'local' as const,
    }))
  }

  // Fallback a Supabase
  try {
    const businessId = await getBusinessId()
    if (!businessId) return []
    const sb = createClient()

    const { data, error } = await sb
      .from('price_snapshots')
      .select('snapshot_date')
      .eq('business_id', businessId)
      .order('snapshot_date', { ascending: false })

    if (error || !data) return []

    const counts: Record<string, number> = {}
    for (const row of data) {
      const d = row.snapshot_date as string
      counts[d] = (counts[d] ?? 0) + 1
    }

    return Object.entries(counts)
      .map(([date, productCount]) => ({ date, productCount, source: 'supabase' as const }))
      .sort((a, b) => b.date.localeCompare(a.date))
  } catch { return [] }
}

/**
 * Carga los productos de una fecha específica (localStorage primero).
 */
export async function loadSnapshotByDate(date: string): Promise<RawProduct[]> {
  const local = lsGetAll().find((s) => s.date === date)
  if (local) return local.products

  const businessId = await getBusinessId()
  if (!businessId) return []
  const sb = createClient()
  const { data, error } = await sb
    .from('price_snapshots')
    .select('*')
    .eq('business_id', businessId)
    .eq('snapshot_date', date)
  if (error || !data) return []
  return data.map(fromDbRow)
}

/**
 * Elimina un snapshot (localStorage + Supabase).
 */
export async function deleteSnapshot(date: string): Promise<void> {
  // Local
  const snaps = lsGetAll().filter((s) => s.date !== date)
  lsSave(snaps)

  // Supabase best-effort
  try {
    const businessId = await getBusinessId()
    if (!businessId) return
    const sb = createClient()
    await sb
      .from('price_snapshots')
      .delete()
      .eq('business_id', businessId)
      .eq('snapshot_date', date)
  } catch { /* ignorar */ }
}

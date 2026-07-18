'use client'

/**
 * Snapshot Service — historial de precios en Supabase.
 *
 * Tablas usadas (ya creadas en migración 002):
 *   - public.products (estado actual por negocio)
 *   - public.price_snapshots (historial diario por negocio)
 *   - public.profiles (para obtener business_id del usuario)
 */

import { createClient } from '@/lib/supabase/client'
import { RawProduct } from '@/features/labels/types'

// ─── helpers ────────────────────────────────────────────────────────────────

async function getBusinessId(): Promise<string | null> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data } = await sb.from('profiles').select('business_id').eq('id', user.id).single()
  return data?.business_id ?? null
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

// ─── public API ─────────────────────────────────────────────────────────────

/**
 * Carga el snapshot más reciente del negocio del usuario logueado.
 * Devuelve [] si no hay historial (primera vez).
 */
export async function loadLastSnapshot(): Promise<RawProduct[]> {
  const businessId = await getBusinessId()
  if (!businessId) return []

  const sb = createClient()

  // Fecha del snapshot más reciente
  const { data: latest } = await sb
    .from('price_snapshots')
    .select('snapshot_date')
    .eq('business_id', businessId)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single()

  if (!latest) return []

  const { data: rows, error } = await sb
    .from('price_snapshots')
    .select('*')
    .eq('business_id', businessId)
    .eq('snapshot_date', latest.snapshot_date)

  if (error || !rows) return []
  return rows.map(fromDbRow)
}

/**
 * Guarda el snapshot de hoy y actualiza el catálogo de productos.
 * Llámalo DESPUÉS de que el usuario confirma el archivo.
 */
export async function saveSnapshot(products: RawProduct[]): Promise<void> {
  const businessId = await getBusinessId()
  if (!businessId || products.length === 0) return

  const sb = createClient()
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  // 1) Upsert en products (catálogo actual)
  const productRows = products.map((p) => ({
    ...toDbRow(p, businessId),
    updated_at: new Date().toISOString(),
  }))
  await sb.from('products').upsert(productRows, { onConflict: 'business_id,sku' })

  // 2) Insert en price_snapshots (historial)
  const snapshotRows = products.map((p) => ({
    ...toDbRow(p, businessId),
    snapshot_date: today,
  }))
  await sb
    .from('price_snapshots')
    .upsert(snapshotRows, { onConflict: 'business_id,snapshot_date,sku' })
}

/**
 * Devuelve cuántos snapshots (filas totales) tiene el negocio.
 * Útil para saber si es "primera carga".
 */
export async function getSnapshotCount(): Promise<number> {
  const businessId = await getBusinessId()
  if (!businessId) return 0
  const sb = createClient()
  const { count } = await sb
    .from('price_snapshots')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId)
  return count ?? 0
}

export interface SnapshotSummary {
  date: string        // YYYY-MM-DD
  productCount: number
}

/**
 * Lista todas las fechas de subida con cantidad de productos.
 * Devuelve las más recientes primero.
 */
export async function listSnapshots(): Promise<SnapshotSummary[]> {
  const businessId = await getBusinessId()
  if (!businessId) return []
  const sb = createClient()

  // Traemos las filas y agrupamos en JS (Supabase JS no soporta GROUP BY nativo)
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
    .map(([date, productCount]) => ({ date, productCount }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

/**
 * Carga los productos de una fecha específica del historial.
 */
export async function loadSnapshotByDate(date: string): Promise<RawProduct[]> {
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
 * Elimina todos los registros de un snapshot por fecha.
 */
export async function deleteSnapshot(date: string): Promise<void> {
  const businessId = await getBusinessId()
  if (!businessId) return
  const sb = createClient()
  await sb
    .from('price_snapshots')
    .delete()
    .eq('business_id', businessId)
    .eq('snapshot_date', date)
}

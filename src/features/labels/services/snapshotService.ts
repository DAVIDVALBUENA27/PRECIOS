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

/** Fecha local YYYY-MM-DD (no UTC: en Colombia después de las 7 pm UTC ya es "mañana"). */
function localDate(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Un producto por código; el último gana. Sin código no se puede comparar. */
function dedupeBySku(products: RawProduct[]): RawProduct[] {
  const map = new Map<string, RawProduct>()
  for (const p of products) if (p.sku) map.set(p.sku, p)
  return Array.from(map.values())
}

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

/**
 * Guarda el día. Si ese mismo día ya se subió otro archivo, se SUMAN los
 * productos (el archivo nuevo manda en precio) en vez de borrar el anterior.
 */
function lsUpsertSnapshot(date: string, products: RawProduct[]): void {
  const all = lsGetAll()
  const sameDay = all.find((s) => s.date === date)
  const merged = dedupeBySku([...(sameDay?.products ?? []), ...products])
  const snaps = all.filter((s) => s.date !== date)
  snaps.unshift({ date, productCount: merged.length, products: merged })
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
    // Columnas propias del archivo del negocio (inventario, ubicación…)
    extra: p.extra && Object.keys(p.extra).length > 0 ? p.extra : null,
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
    extra: (row.extra as Record<string, string> | null) ?? undefined,
  }
}

const CHUNK = 500

async function sbSaveSnapshot(products: RawProduct[]): Promise<void> {
  const businessId = await getBusinessId()
  if (!businessId) return

  const sb = createClient()
  const today = localDate()
  const now = new Date().toISOString()
  // Códigos repetidos o vacíos hacen fallar el upsert COMPLETO en Postgres
  // ("cannot affect row a second time"), y el archivo no quedaba guardado.
  const unique = dedupeBySku(products)

  for (let i = 0; i < unique.length; i += CHUNK) {
    const part = unique.slice(i, i + CHUNK)
    const { error: e1 } = await sb
      .from('products')
      .upsert(part.map((p) => ({ ...toDbRow(p, businessId), updated_at: now })), {
        onConflict: 'business_id,sku',
      })
    if (e1) throw e1
    const { error: e2 } = await sb
      .from('price_snapshots')
      .upsert(part.map((p) => ({ ...toDbRow(p, businessId), snapshot_date: today })), {
        onConflict: 'business_id,snapshot_date,sku',
      })
    if (e2) throw e2
  }
}

/** Supabase devuelve máximo 1000 filas por consulta: se pide por páginas. */
async function fetchAllRows(
  build: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1)
    if (error || !data) break
    out.push(...(data as Record<string, unknown>[]))
    if (data.length < PAGE) break
  }
  return out
}

// ─── API pública ─────────────────────────────────────────────────────────────

/**
 * Guarda snapshot: localStorage SIEMPRE + Supabase en segundo plano.
 */
export async function saveSnapshot(products: RawProduct[]): Promise<void> {
  if (products.length === 0) return
  const today = localDate()

  // 1) localStorage: rápido, siempre funciona
  lsUpsertSnapshot(today, products)

  // 2) Supabase: best-effort, sin bloquear
  sbSaveSnapshot(products).catch((err) =>
    console.warn('[SnapshotService] Supabase save failed (no crítico):', err)
  )
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

/**
 * Último precio conocido de CADA código, juntando todo el historial.
 *
 * Antes se comparaba solo contra el último archivo subido: si ese día se subió
 * un archivo parcial (ej. 91 productos), todo lo que vino en archivos de días
 * anteriores salía como "nuevo" y no se veía si subió o bajó.
 *
 * Fuentes (gana el dato más reciente de cada código):
 *   - todos los snapshots de localStorage
 *   - Supabase: tabla `products` (último precio por código) o, si se pide
 *     `beforeDate`, los snapshots anteriores a esa fecha.
 *
 * @param beforeDate  YYYY-MM-DD. Si se pasa, solo cuenta lo anterior a ese día.
 */
export async function loadPriceReference(beforeDate?: string): Promise<RawProduct[]> {
  const ref = new Map<string, { p: RawProduct; date: string }>()
  const put = (p: RawProduct, date: string) => {
    if (!p.sku) return
    const cur = ref.get(p.sku)
    if (!cur || date >= cur.date) ref.set(p.sku, { p, date })
  }

  for (const snap of lsGetAll()) {
    if (beforeDate && snap.date >= beforeDate) continue
    for (const p of snap.products) put(p, snap.date)
  }

  try {
    const businessId = await getBusinessId()
    if (businessId) {
      const sb = createClient()
      const rows = beforeDate
        ? await fetchAllRows((from, to) =>
            sb
              .from('price_snapshots')
              .select('*')
              .eq('business_id', businessId)
              .lt('snapshot_date', beforeDate)
              .order('snapshot_date', { ascending: true })
              .range(from, to)
          )
        : await fetchAllRows((from, to) =>
            sb.from('products').select('*').eq('business_id', businessId).range(from, to)
          )
      for (const row of rows) {
        const date = beforeDate
          ? String(row.snapshot_date)
          : row.updated_at ? localDate(new Date(String(row.updated_at))) : ''
        put(fromDbRow(row), date)
      }
    }
  } catch { /* Supabase no disponible: se usa solo lo local */ }

  return Array.from(ref.values()).map((v) => v.p)
}

/** Une un archivo recién subido a la referencia (el archivo nuevo manda). */
export function mergeIntoReference(reference: RawProduct[], products: RawProduct[]): RawProduct[] {
  return dedupeBySku([...reference, ...products])
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
  const rows = await fetchAllRows((from, to) =>
    sb
      .from('price_snapshots')
      .select('*')
      .eq('business_id', businessId)
      .eq('snapshot_date', date)
      .range(from, to)
  )
  return rows.map(fromDbRow)
}

export interface ResumableList {
  /** Productos del último día guardado. */
  products: RawProduct[]
  /** Último precio conocido ANTES de ese día, para volver a marcar los cambios. */
  previous: RawProduct[]
  date: string
}

/**
 * Última lista guardada, lista para retomarla sin volver a subir el archivo.
 * Se usa cuando no hay sesión local (ej: el usuario entra desde otro equipo).
 */
export async function loadResumableList(): Promise<ResumableList | null> {
  const dates = (await listSnapshots()).map((s) => s.date)
  if (dates.length === 0) return null

  const [products, previous] = await Promise.all([
    loadSnapshotByDate(dates[0]),
    loadPriceReference(dates[0]),
  ])
  if (products.length === 0) return null

  return { products, previous, date: dates[0] }
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

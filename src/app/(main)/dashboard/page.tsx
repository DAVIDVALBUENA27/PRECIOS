'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import {
  UploadZone,
  ColMapper,
  SummaryBar,
  LabChips,
  ProductTable,
  PrintPreview,
} from '@/features/labels/components'
import { ProductWithDiff, RawProduct } from '@/features/labels/types'
import { compareWithSnapshot } from '@/features/labels/lib/compareProducts'
import { useLabColors } from '@/features/labels/hooks/useLabColors'
import { DEMO_DAY1, DEMO_DAY2 } from '@/features/labels/lib/demoData'
import {
  loadPriceReference,
  mergeIntoReference,
  saveSnapshot,
  getSnapshotCount,
  loadResumableList,
} from '@/features/labels/services/snapshotService'
import {
  loadSession,
  saveSession,
  clearSession,
  describeWhen,
  type WorkSession,
} from '@/features/labels/services/sessionService'
import { getProfile } from '@/features/business/services/businessService'
import type { Business } from '@/features/business/types'

type Step = 'upload' | 'mapping' | 'review' | 'preview'

export default function DashboardPage() {
  const [step, setStep] = useState<Step>('upload')
  const [rows, setRows] = useState<string[][]>([])
  const [fileName, setFileName] = useState('')
  const [products, setProducts] = useState<ProductWithDiff[]>([])
  const [activeLab, setActiveLab] = useState<string | null>(null)

  // Historial de precios: último precio conocido de cada código (todos los días)
  const [lastSnapshot, setLastSnapshot] = useState<RawProduct[]>([])
  const [snapshotLoaded, setSnapshotLoaded] = useState(false)
  const [isFirstUpload, setIsFirstUpload] = useState(false)
  const [saving, setSaving] = useState(false)

  // Perfil del negocio (logo, color, NIT) para las etiquetas
  const [business, setBusiness] = useState<Business | null>(null)
  useEffect(() => {
    getProfile()
      .then(setBusiness)
      .catch(() => {
        /* sin sesión/negocio: etiquetas sin logo */
      })
  }, [])

  // Última sesión de trabajo: permite seguir imprimiendo sin volver a subir
  const [session, setSession] = useState<WorkSession | null>(null)
  const [resuming, setResuming] = useState(false)

  // Cargar el snapshot previo al montar (si el usuario está logueado)
  useEffect(() => {
    setSession(loadSession())
    async function init() {
      try {
        const [count, snap] = await Promise.all([getSnapshotCount(), loadPriceReference()])
        setIsFirstUpload(count === 0)
        setLastSnapshot(snap)
      } catch {
        // Si no hay sesión activa simplemente no hay historial
      } finally {
        setSnapshotLoaded(true)
      }
    }
    void init()
  }, [])

  // Ordenamiento y búsqueda de la tabla de revisión
  type SortOrder = 'default' | 'alpha' | 'new' | 'changed' | 'price-up' | 'price-down'
  const [sortOrder, setSortOrder] = useState<SortOrder>('changed')
  const [searchQuery, setSearchQuery] = useState('')
  const [showOnlyNew, setShowOnlyNew] = useState(false)

  const labs = useMemo(() => Array.from(new Set(products.map((p) => p.lab))).sort(), [products])
  const labColors = useLabColors(products.map((p) => p.lab))

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const byNew = showOnlyNew ? products.filter((p) => p.isNew) : products
    const byLab = activeLab ? byNew.filter((p) => p.lab === activeLab) : byNew
    const base = q ? byLab.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.extra != null && Object.values(p.extra).some((v) => String(v ?? '').toLowerCase().includes(q)))
    ) : byLab
    const arr = [...base]
    switch (sortOrder) {
      case 'alpha':
        return arr.sort((a, b) => a.name.localeCompare(b.name, 'es'))
      case 'new':
        return arr.sort((a, b) => Number(b.isNew) - Number(a.isNew))
      case 'changed':
        return arr.sort((a, b) => Number(b.changed) - Number(a.changed))
      case 'price-up':
        return arr.sort((a, b) => {
          const aUp = a.changed && a.oldPrice !== null && a.price !== null && a.price > a.oldPrice
          const bUp = b.changed && b.oldPrice !== null && b.price !== null && b.price > b.oldPrice
          return Number(bUp) - Number(aUp)
        })
      case 'price-down':
        return arr.sort((a, b) => {
          const aDown = a.changed && a.oldPrice !== null && a.price !== null && a.price < a.oldPrice
          const bDown = b.changed && b.oldPrice !== null && b.price !== null && b.price < b.oldPrice
          return Number(bDown) - Number(aDown)
        })
      default:
        return arr
    }
  }, [products, activeLab, sortOrder, searchQuery, showOnlyNew])

  const selectedProducts = products.filter((p) => p.selected)

  const changedCount = products.filter((p) => p.changed).length
  const newCount = products.filter((p) => p.isNew).length

  function startReview(today: RawProduct[], snapshot: RawProduct[]) {
    const diffed = compareWithSnapshot(today, snapshot).map((p) => ({ ...p, selected: p.changed }))
    setProducts(diffed)
    setActiveLab(null)
    setShowOnlyNew(false)
    setStep('review')
  }

  // Guardar la sesión mientras se trabaja, para poder retomarla al volver
  useEffect(() => {
    if (products.length === 0) return
    const id = setTimeout(() => {
      const current = { fileName, savedAt: new Date().toISOString(), products }
      saveSession(current)
      setSession(current)
    }, 600)
    return () => clearTimeout(id)
  }, [products, fileName])

  /** Retoma la última sesión de este equipo, con la selección tal como quedó. */
  function resumeSession() {
    if (!session) return
    setProducts(session.products)
    setFileName(session.fileName)
    setActiveLab(null)
    setShowOnlyNew(false)
    setStep('review')
  }

  /** Reabre la última lista guardada en el historial (sirve desde otro equipo). */
  async function resumeFromHistory() {
    setResuming(true)
    try {
      const last = await loadResumableList()
      if (!last) return
      const diffed = compareWithSnapshot(last.products, last.previous)
      // Si no hay cambios de precio contra el día anterior, se marcan todos
      // para que reimprimir la lista completa sea inmediato.
      const anyChanged = diffed.some((p) => p.changed)
      setProducts(diffed.map((p) => ({ ...p, selected: anyChanged ? p.changed : true })))
      setFileName(`Lista guardada del ${last.date}`)
      setActiveLab(null)
      setShowOnlyNew(false)
      setStep('review')
    } finally {
      setResuming(false)
    }
  }

  function discardSession() {
    clearSession()
    setSession(null)
  }

  function handleRows(parsedRows: string[][], name: string) {
    setRows(parsedRows)
    setFileName(name)
    setStep('mapping')
  }

  function handleDemo() {
    setFileName('Datos de prueba')
    startReview(DEMO_DAY2, DEMO_DAY1)
  }

  const handleConfirm = useCallback(async (parsed: RawProduct[]) => {
    // Comparar con el último precio conocido de cada código (todo el historial)
    startReview(parsed, lastSnapshot)

    // Guardar en Supabase en segundo plano
    setSaving(true)
    try {
      await saveSnapshot(parsed)
      // Refrescar para que la próxima carga tenga el snapshot actualizado
      setLastSnapshot((ref) => mergeIntoReference(ref, parsed))
      setIsFirstUpload(false)
    } catch (err) {
      console.error('Error al guardar snapshot:', err)
    } finally {
      setSaving(false)
    }
  }, [lastSnapshot])

  function toggleProduct(sku: string) {
    setProducts((ps) => ps.map((p) => (p.sku === sku ? { ...p, selected: !p.selected } : p)))
  }

  function toggleAll(selected: boolean) {
    const visible = new Set(filtered.map((p) => p.sku))
    setProducts((ps) => ps.map((p) => (visible.has(p.sku) ? { ...p, selected } : p)))
  }

  /** Filtra a solo-nuevos y los deja marcados para imprimir en un clic. */
  function focusNew() {
    const next = !showOnlyNew
    setShowOnlyNew(next)
    if (next) {
      setActiveLab(null)
      setSearchQuery('')
      setProducts((ps) => ps.map((p) => ({ ...p, selected: p.isNew })))
    }
  }

  /**
   * Procesa un código leído con el lector de código de barras.
   * El lector "teclea" el código muy rápido y termina en Enter; aquí lo
   * usamos para buscar y, si hay coincidencia exacta, marcar el producto.
   */
  const handleScan = useCallback((code: string) => {
    const raw = code.trim()
    if (!raw) return
    const cl = raw.toLowerCase()
    // Mostrar todo para que el producto escaneado no quede oculto por filtros
    setShowOnlyNew(false)
    setActiveLab(null)
    setSearchQuery(raw)
    setProducts((ps) => {
      const matches = ps.filter(
        (p) =>
          p.sku.toLowerCase() === cl ||
          (p.extra != null &&
            Object.values(p.extra).some((v) => String(v ?? '').trim().toLowerCase() === cl)),
      )
      if (matches.length === 0) return ps
      const ids = new Set(matches.map((m) => m.sku))
      return ps.map((p) => (ids.has(p.sku) ? { ...p, selected: true } : p))
    })
  }, [])

  // Lector de código de barras: escucha teclas rápidas terminadas en Enter,
  // funcione o no el campo de búsqueda enfocado.
  useEffect(() => {
    if (step !== 'review') return
    let buffer = ''
    let lastTime = 0
    function onKeyDown(e: KeyboardEvent) {
      const now = Date.now()
      // Si pasó mucho entre teclas, es un humano escribiendo: reiniciar.
      if (now - lastTime > 80) buffer = ''
      lastTime = now
      if (e.key === 'Enter') {
        const code = buffer
        buffer = ''
        if (code.length >= 3) {
          e.preventDefault()
          handleScan(code)
        }
        return
      }
      if (e.key.length === 1) buffer += e.key
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [step, handleScan])

  return (
    <div className="min-h-screen p-6 md:p-10">
      {step === 'upload' && (
        <>
          {/* Hero */}
          <div className="mx-auto mb-8 max-w-xl text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Generador de etiquetas
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Sube tu listado de productos para generar e imprimir etiquetas de góndola
            </p>
          </div>

          {/* Continuar donde ibas: la lista ya está guardada, no hay que resubirla */}
          {session && (
            <div className="mx-auto mb-5 max-w-xl rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">Continúa donde ibas</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{session.fileName}</span>
                    {' · '}
                    {session.products.length.toLocaleString('es-CO')} productos
                    {' · '}
                    {session.products.filter((p) => p.selected).length.toLocaleString('es-CO')} marcados
                    {' · '}
                    {describeWhen(session.savedAt)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={resumeSession}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                    >
                      Seguir imprimiendo
                    </button>
                    <button
                      type="button"
                      onClick={discardSession}
                      className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-700"
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sin sesión en este equipo, pero sí hay listas guardadas en el historial */}
          {!session && snapshotLoaded && lastSnapshot.length > 0 && (
            <div className="mx-auto mb-5 max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Reabrir la última lista</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Tienes {lastSnapshot.length.toLocaleString('es-CO')} productos guardados. Puedes
                reimprimir sin volver a subir el archivo.
              </p>
              <button
                type="button"
                onClick={resumeFromHistory}
                disabled={resuming}
                className="mt-3 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-400 hover:text-blue-700 disabled:opacity-50"
              >
                {resuming ? 'Abriendo…' : 'Abrir lista guardada'}
              </button>
            </div>
          )}

          {/* Banner primera carga */}
          {snapshotLoaded && isFirstUpload && (
            <div className="mx-auto mb-5 max-w-xl rounded-xl border border-blue-100 bg-blue-50 px-4 py-3.5">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-blue-800">Primera carga</p>
                  <p className="mt-0.5 text-xs text-blue-700">
                    A partir de la segunda subida el sistema comparará automáticamente y marcará los que subieron o bajaron de precio.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Banner historial activo */}
          {snapshotLoaded && !isFirstUpload && lastSnapshot.length > 0 && (
            <div className="mx-auto mb-5 max-w-xl rounded-xl border border-green-100 bg-green-50 px-4 py-3.5">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-green-800">Historial activo</p>
                  <p className="mt-0.5 text-xs text-green-700">
                    Compararemos con <strong>{lastSnapshot.length.toLocaleString('es-CO')} productos</strong> del último listado guardado y marcaremos los cambios automáticamente.
                  </p>
                </div>
              </div>
            </div>
          )}

          <UploadZone onRows={handleRows} onDemo={handleDemo} />
        </>
      )}

      {step === 'mapping' && (
        <ColMapper
          rows={rows}
          fileName={fileName}
          onConfirm={handleConfirm}
          onBack={() => setStep('upload')}
        />
      )}

      {step === 'review' && (
        <div className="mx-auto max-w-6xl space-y-5">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Revisa y selecciona
              </h1>
              <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                {fileName}
                {saving && (
                  <span className="flex items-center gap-1 text-xs text-blue-500">
                    <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Guardando…
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                ← Cargar otro archivo
              </button>
              <button
                type="button"
                onClick={() => setStep('preview')}
                disabled={selectedProducts.length === 0}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Imprimir {selectedProducts.length > 0 ? `(${selectedProducts.length})` : 'etiquetas'}
              </button>
            </div>
          </div>

          {/* Stats cards */}
          <SummaryBar
            total={products.length}
            changed={changedCount}
            isNew={newCount}
            selected={selectedProducts.length}
          />

          {/* Badges de cambios */}
          {!isFirstUpload && (changedCount > 0 || newCount > 0) && (
            <div className="flex flex-wrap gap-2">
              {changedCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setProducts((ps) => ps.map((p) => ({ ...p, selected: p.changed })))
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                  {changedCount} con cambio de precio · clic para seleccionar solo estos
                </button>
              )}
              {newCount > 0 && (
                <button
                  type="button"
                  onClick={focusNew}
                  aria-pressed={showOnlyNew}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    showOnlyNew
                      ? 'border-green-600 bg-green-600 text-white shadow-sm hover:bg-green-700'
                      : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                  {showOnlyNew
                    ? `Mostrando ${newCount} nuevos · clic para ver todos`
                    : `${newCount} productos nuevos · clic para imprimir solo estos`}
                </button>
              )}
              {changedCount === 0 && newCount === 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Sin cambios de precio respecto al listado anterior
                </span>
              )}
            </div>
          )}

          <LabChips labs={labs} labColors={labColors} activeLab={activeLab} onSelect={setActiveLab} />

          {/* Buscador */}
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, SKU, código… o escanea con el lector"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:max-w-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Pista del lector de código de barras */}
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5v15m3-15v15m3-15v15m4.5-15v15m3-15v15M6.75 4.5h.008v.008H6.75V4.5z" />
            </svg>
            Tienes el lector conectado: escanea cualquier producto y se busca y selecciona solo —
            no hace falta hacer clic en el buscador.
          </p>

          {/* Resultado de búsqueda */}
          {searchQuery.trim() && (
            <p className="text-xs text-slate-500">
              {filtered.length === 0
                ? 'Sin resultados para esa búsqueda.'
                : `${filtered.length} producto${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`}
            </p>
          )}

          {/* Ordenamiento */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Ordenar:
            </span>
            {([
              ['default',    'Por defecto'],
              ['alpha',      'A → Z'],
              ['new',        '✦ Nuevos primero'],
              ['changed',    'Cambiaron primero'],
              ['price-up',   '▲ Subieron primero'],
              ['price-down', '▼ Bajaron primero'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSortOrder(key)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  sortOrder === key
                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <ProductTable
            products={filtered}
            labColors={labColors}
            onToggle={toggleProduct}
            onToggleAll={toggleAll}
          />
        </div>
      )}

      {step === 'preview' && (
        <PrintPreview
          products={selectedProducts}
          labColors={labColors}
          logoUrl={business?.logoUrl ?? null}
          accentColor={business?.accentColor}
          taxId={business?.taxId ?? null}
          businessName={business?.name}
          onBack={() => setStep('review')}
        />
      )}
    </div>
  )
}

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
  loadLastSnapshot,
  saveSnapshot,
  getSnapshotCount,
} from '@/features/labels/services/snapshotService'

type Step = 'upload' | 'mapping' | 'review' | 'preview'

export default function DashboardPage() {
  const [step, setStep] = useState<Step>('upload')
  const [rows, setRows] = useState<string[][]>([])
  const [fileName, setFileName] = useState('')
  const [products, setProducts] = useState<ProductWithDiff[]>([])
  const [activeLab, setActiveLab] = useState<string | null>(null)

  // Historial de precios
  const [lastSnapshot, setLastSnapshot] = useState<RawProduct[]>([])
  const [snapshotLoaded, setSnapshotLoaded] = useState(false)
  const [isFirstUpload, setIsFirstUpload] = useState(false)
  const [saving, setSaving] = useState(false)

  // Cargar el snapshot previo al montar (si el usuario está logueado)
  useEffect(() => {
    async function init() {
      try {
        const [count, snap] = await Promise.all([getSnapshotCount(), loadLastSnapshot()])
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

  // Ordenamiento de la tabla de revisión
  type SortOrder = 'default' | 'alpha' | 'changed' | 'price-up' | 'price-down'
  const [sortOrder, setSortOrder] = useState<SortOrder>('changed')

  const labs = useMemo(() => Array.from(new Set(products.map((p) => p.lab))).sort(), [products])
  const labColors = useLabColors(products.map((p) => p.lab))

  const filtered = useMemo(() => {
    const base = activeLab ? products.filter((p) => p.lab === activeLab) : products
    const arr = [...base]
    switch (sortOrder) {
      case 'alpha':
        return arr.sort((a, b) => a.name.localeCompare(b.name, 'es'))
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
  }, [products, activeLab, sortOrder])

  const selectedProducts = products.filter((p) => p.selected)

  const changedCount = products.filter((p) => p.changed).length
  const newCount = products.filter((p) => p.oldPrice === null && !isFirstUpload).length

  function startReview(today: RawProduct[], snapshot: RawProduct[]) {
    const diffed = compareWithSnapshot(today, snapshot).map((p) => ({ ...p, selected: p.changed }))
    setProducts(diffed)
    setActiveLab(null)
    setStep('review')
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
    // Comparar con el último snapshot cargado (o vacío si es primera vez)
    startReview(parsed, lastSnapshot)

    // Guardar en Supabase en segundo plano
    setSaving(true)
    try {
      await saveSnapshot(parsed)
      // Refrescar para que la próxima carga tenga el snapshot actualizado
      setLastSnapshot(parsed)
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
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  {newCount} productos nuevos
                </span>
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

          {/* Ordenamiento */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Ordenar:
            </span>
            {([
              ['default',    'Por defecto'],
              ['alpha',      'A → Z'],
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
          logoUrl={null}
          onBack={() => setStep('review')}
        />
      )}
    </div>
  )
}

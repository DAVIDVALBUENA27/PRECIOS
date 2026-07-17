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
    <div className="min-h-screen p-8">
      {step === 'upload' && (
        <>
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Etiquetas de góndola</h1>
            <p className="mt-1 text-gray-500">
              Sube el listado de productos de tu sistema para generar las etiquetas
            </p>
          </div>

          {/* Banner primera carga */}
          {snapshotLoaded && isFirstUpload && (
            <div className="mx-auto mb-6 max-w-xl rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <strong>Primera carga</strong> — Sube tu listado de precios. A partir de la segunda subida
              el sistema comparará automáticamente y marcará los que subieron o bajaron de precio. 📊
            </div>
          )}

          {/* Banner historial activo */}
          {snapshotLoaded && !isFirstUpload && lastSnapshot.length > 0 && (
            <div className="mx-auto mb-6 max-w-xl rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              ✅ <strong>Historial activo</strong> — Al subir, compararemos con{' '}
              <strong>{lastSnapshot.length} productos</strong> del último listado guardado y marcaremos
              los cambios de precio automáticamente.
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
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Revisa y selecciona</h1>
              <p className="mt-1 text-sm text-gray-500 flex items-center gap-2">
                {fileName}
                {saving && <span className="text-xs text-blue-500 animate-pulse">Guardando historial…</span>}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← Cargar otro archivo
              </button>
              <button
                type="button"
                onClick={() => setStep('preview')}
                disabled={selectedProducts.length === 0}
                className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Imprimir etiquetas ({selectedProducts.length})
              </button>
            </div>
          </div>

          {/* Badges de cambios */}
          {!isFirstUpload && (changedCount > 0 || newCount > 0) && (
            <div className="flex flex-wrap gap-3">
              {changedCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    // Seleccionar solo los que cambiaron
                    setProducts((ps) => ps.map((p) => ({ ...p, selected: p.changed })))
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-orange-300 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
                >
                  🔄 {changedCount} con cambio de precio — clic para seleccionar solo estos
                </button>
              )}
              {newCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  🆕 {newCount} productos nuevos (no estaban en el listado anterior)
                </span>
              )}
              {changedCount === 0 && newCount === 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-500">
                  ✅ Sin cambios de precio respecto al listado anterior
                </span>
              )}
            </div>
          )}

          <SummaryBar
            total={products.length}
            changed={changedCount}
            selected={selectedProducts.length}
          />

          <LabChips labs={labs} labColors={labColors} activeLab={activeLab} onSelect={setActiveLab} />

          {/* Ordenamiento */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ordenar:</span>
            {([
              ['default',    'Por defecto'],
              ['alpha',      'A → Z'],
              ['changed',    '🔄 Cambiaron primero'],
              ['price-up',   '▲ Subieron primero'],
              ['price-down', '▼ Bajaron primero'],
            ] as const).map(([key, label]) => (
              <button
                key={key} type="button"
                onClick={() => setSortOrder(key)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  sortOrder === key
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600'
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

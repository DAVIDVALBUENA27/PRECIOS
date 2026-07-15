'use client'

import { useMemo, useState } from 'react'
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

type Step = 'upload' | 'mapping' | 'review' | 'preview'

export default function DashboardPage() {
  const [step, setStep] = useState<Step>('upload')
  const [rows, setRows] = useState<string[][]>([])
  const [fileName, setFileName] = useState('')
  const [products, setProducts] = useState<ProductWithDiff[]>([])
  const [activeLab, setActiveLab] = useState<string | null>(null)

  const labs = useMemo(() => Array.from(new Set(products.map((p) => p.lab))).sort(), [products])
  const labColors = useLabColors(products.map((p) => p.lab))
  const filtered = activeLab ? products.filter((p) => p.lab === activeLab) : products
  const selectedProducts = products.filter((p) => p.selected)

  function startReview(today: RawProduct[], snapshot: RawProduct[]) {
    // Preselección automática de los que cambiaron de precio (regla de negocio 8)
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

  function handleConfirm(parsed: RawProduct[]) {
    // Sin snapshot previo todavía (llega en Fase 5): comparación contra vacío
    startReview(parsed, [])
  }

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
              <p className="mt-1 text-sm text-gray-500">{fileName}</p>
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

          <SummaryBar
            total={products.length}
            changed={products.filter((p) => p.changed).length}
            selected={selectedProducts.length}
          />

          <LabChips labs={labs} labColors={labColors} activeLab={activeLab} onSelect={setActiveLab} />

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

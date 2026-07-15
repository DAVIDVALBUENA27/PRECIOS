'use client'

import { useState } from 'react'
import { ProductWithDiff } from '@/features/labels/types'
import { formatUnitPrice } from '@/features/labels/lib/unitPrice'
import { LabColor } from '@/features/labels/hooks/useLabColors'

type PaperSize = 'carta' | 'oficio'

/* margin vertical calculado para que quepan filas completas de 36mm */
const PAPER: Record<PaperSize, { label: string; page: string; margin: string; perSheet: number }> = {
  carta: { label: 'Carta (14 por hoja)', page: 'letter', margin: '13.7mm 8mm', perSheet: 14 },
  oficio: { label: 'Oficio (16 por hoja)', page: '216mm 330mm', margin: '21mm 8mm', perSheet: 16 },
}

interface PrintPreviewProps {
  products: ProductWithDiff[]
  labColors: Map<string, LabColor>
  logoUrl?: string | null
  onBack: () => void
}

export function PrintPreview({ products, labColors, logoUrl, onBack }: PrintPreviewProps) {
  const [paper, setPaper] = useState<PaperSize>('carta')
  const sheets = Math.ceil(products.length / PAPER[paper].perSheet)

  return (
    <div className="mx-auto max-w-4xl">
      <style>{`@page { size: ${PAPER[paper].page}; margin: ${PAPER[paper].margin}; }`}</style>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vista de impresión</h1>
          <p className="mt-1 text-sm text-gray-500">
            {products.length} etiquetas · {sheets} hoja{sheets !== 1 ? 's' : ''} tamaño {paper}
          </p>
        </div>
        <button type="button" onClick={onBack} className="text-sm text-gray-600 hover:text-gray-900">
          ← Volver a la selección
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 print:hidden">
        <div className="flex gap-2">
          {(Object.keys(PAPER) as PaperSize[]).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setPaper(size)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                paper === size
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-gray-500'
              }`}
            >
              {PAPER[size].label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={products.length === 0}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Imprimir
        </button>
        <p className="text-xs text-gray-500">
          En el diálogo de impresión usa <strong>escala 100%</strong> (no &quot;ajustar a página&quot;) para que
          cada etiqueta mida exactamente 8 × 3.6 cm.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-100 p-6 print:overflow-visible print:rounded-none print:border-0 print:bg-white print:p-0">
        <div id="print-area" className="print-grid mx-auto w-fit bg-white shadow-sm print:shadow-none">
          {products.map((p) => {
            const color = labColors.get(p.lab)
            const unitPrice = formatUnitPrice(p.unitPrice, p.contentParsed?.normalizedUnit ?? null)
            return (
              <div key={p.sku} className="print-tag">
                {logoUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element -- tamaño en mm para impresión, sin optimizador */
                  <img src={logoUrl} alt="" className="tag-logo" loading="eager" />
                )}
                <span className="tag-lab" style={color ? { color: color.fg } : undefined}>
                  {p.lab}
                </span>
                <span className="tag-name">{p.name}</span>
                <span className="tag-sku">{p.sku}</span>
                <div className="tag-price-row">
                  <span className="tag-price">
                    {p.price !== null ? `$${p.price.toLocaleString('es-CO')}` : '—'}
                  </span>
                  {unitPrice && <span className="tag-unit-price">{unitPrice}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

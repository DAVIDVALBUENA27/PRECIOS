'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { ProductWithDiff } from '@/features/labels/types'
import { LabColor } from '@/features/labels/hooks/useLabColors'
import { LabelStylePanel } from './LabelStylePanel'
import { DEFAULT_STYLE, type LabelStyle, type PaperSize } from '@/features/labels/types/labelStyle'
import { SingleTag } from './tags/SingleTag'
import { GroupedTag } from './tags/GroupedTag'
import { DoubleTag } from './tags/DoubleTag'
import { getBaseNameAndSize } from './tags/shared'

// ──────────────────────────────────────────────────────────────
// Tamaño de papel y cálculo dinámico de filas/columnas
// ──────────────────────────────────────────────────────────────

const PAPER_CFG: Record<PaperSize, { page: string; usableW: number; usableH: number; margin: string }> = {
  carta:  { page: 'letter',      usableW: 200, usableH: 240, margin: '19.7mm 8mm' },
  oficio: { page: '216mm 330mm', usableW: 200, usableH: 305, margin: '25mm 8mm'   },
}

function calcGrid(style: LabelStyle) {
  const cfg = PAPER_CFG[style.paper]
  const cols = Math.max(1, Math.floor(cfg.usableW / style.labelWidth))
  const rows = Math.max(1, Math.floor(cfg.usableH / style.labelHeight))
  return { cols, perSheet: cols * rows, ...cfg }
}

export type PrintMode = 'individual' | 'agrupado-tamanos' | 'doble-independiente'

const PRINT_MODES: { mode: PrintMode; label: string; hint: string }[] = [
  { mode: 'individual', label: '1 × Etiqueta', hint: 'Un producto por etiqueta' },
  { mode: 'agrupado-tamanos', label: 'Agrupar Tamaños', hint: 'Mismo producto, 2 presentaciones' },
  { mode: 'doble-independiente', label: '2 Diferentes', hint: 'Dos productos con línea de corte' },
]

interface PrintPreviewProps {
  products: ProductWithDiff[]
  labColors: Map<string, LabColor>
  logoUrl?: string | null
  accentColor?: string
  taxId?: string | null
  businessName?: string
  onBack: () => void
}

export function PrintPreview({
  products,
  labColors,
  logoUrl,
  accentColor = '#2563EB',
  taxId,
  businessName,
  onBack,
}: PrintPreviewProps) {
  const [printMode, setPrintMode] = useState<PrintMode>('individual')
  const [labelStyle, setLabelStyle] = useState<LabelStyle>(DEFAULT_STYLE)

  // Drag & drop — orden en modo doble-independiente
  const [dndOrder, setDndOrder] = useState<number[]>(() => products.map((_, i) => i))
  const draggingRef = useRef<number | null>(null)
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  useEffect(() => {
    setDndOrder(products.map((_, i) => i))
  }, [products])

  // Columnas dinámicas del CSV (excluyendo barcode)
  const allExtraFields = useMemo(() => {
    const fields = new Set<string>()
    products.forEach((p) => {
      if (p.extra) {
        Object.keys(p.extra).forEach((k) => {
          if (!k.toLowerCase().includes('barra') && !k.toLowerCase().includes('barcode')) {
            fields.add(k)
          }
        })
      }
    })
    return Array.from(fields)
  }, [products])

  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>(() => ({
    lab: true, sku: true, barcode: true, unitPrice: true,
    logo: !!logoUrl, priceChange: false,
  }))

  function toggleField(field: string) {
    setVisibleFields((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  const grid = useMemo(() => calcGrid(labelStyle), [labelStyle])

  // Agrupación según el modo
  const tagsToPrint = useMemo(() => {
    if (printMode === 'individual') {
      return products.map((p) => ({
        isGrouped: false, isIndependentDouble: false, baseName: p.name, products: [p],
      }))
    }

    if (printMode === 'doble-independiente') {
      const orderedProds = dndOrder.length === products.length
        ? dndOrder.map((i) => products[i])
        : products
      const list: { isGrouped: boolean; isIndependentDouble: boolean; baseName: string; products: ProductWithDiff[] }[] = []
      for (let i = 0; i < orderedProds.length; i += 2) {
        list.push({ isGrouped: false, isIndependentDouble: true, baseName: '', products: orderedProds.slice(i, i + 2) })
      }
      return list
    }

    // agrupado-tamanos
    const groups: Record<string, ProductWithDiff[]> = {}
    products.forEach((p) => {
      const { base } = getBaseNameAndSize(p.name)
      if (!groups[base]) groups[base] = []
      groups[base].push(p)
    })

    const list: { isGrouped: boolean; isIndependentDouble: boolean; baseName: string; products: ProductWithDiff[] }[] = []
    Object.entries(groups).forEach(([base, prods]) => {
      if (prods.length <= 1) {
        list.push({ isGrouped: false, isIndependentDouble: false, baseName: prods[0].name, products: prods })
      } else {
        for (let i = 0; i < prods.length; i += 2) {
          list.push({ isGrouped: true, isIndependentDouble: false, baseName: base, products: prods.slice(i, i + 2) })
        }
      }
    })
    return list
  }, [products, printMode, dndOrder])

  const sheets = Math.ceil(tagsToPrint.length / grid.perSheet)

  const tagStyle: React.CSSProperties = {
    backgroundColor: labelStyle.bgColor,
    borderColor: labelStyle.borderColor,
    borderWidth: `${labelStyle.borderWidth}pt`,
    borderStyle: 'solid',
    borderRadius: `${labelStyle.borderRadius}mm`,
  }

  const dynamicCSS = `
    @page {
      size: ${grid.page};
      margin: ${grid.margin};
    }
    .print-grid {
      grid-template-columns: repeat(${grid.cols}, ${labelStyle.labelWidth}mm);
      grid-auto-rows: ${labelStyle.labelHeight}mm;
    }
    .print-tag {
      width: ${labelStyle.labelWidth}mm !important;
      height: ${labelStyle.labelHeight}mm !important;
    }
  `

  const dnd = {
    dragOver,
    draggingIdx,
    onDragStart: (i: number) => { draggingRef.current = i; setDraggingIdx(i) },
    onDragOver: (i: number) => setDragOver(i),
    onDragLeave: () => setDragOver(null),
    onDrop: (i: number) => {
      const from = draggingRef.current
      if (from === null || from === i) { setDragOver(null); return }
      setDndOrder((prev) => {
        const next = [...prev]
        const tmp = next[from]; next[from] = next[i]; next[i] = tmp
        return next
      })
      draggingRef.current = null
      setDraggingIdx(null)
      setDragOver(null)
    },
    onDragEnd: () => { draggingRef.current = null; setDraggingIdx(null); setDragOver(null) },
  }

  const baseFieldToggles = [
    { key: 'lab', label: 'Laboratorio' },
    { key: 'sku', label: 'SKU' },
    { key: 'barcode', label: 'Código de barras' },
    { key: 'unitPrice', label: 'Precio por unidad' },
    { key: 'priceChange', label: '▲▼ Cambio de precio' },
    ...(logoUrl ? [{ key: 'logo', label: 'Logo del negocio' }] : []),
  ]

  return (
    <div className="mx-auto max-w-[1800px] text-gray-900">
      <style>{dynamicCSS}</style>

      {/* ── Cabecera ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vista de impresión</h1>
          <p className="mt-1 text-sm text-gray-500">
            {tagsToPrint.length} etiquetas · {sheets} hoja{sheets !== 1 ? 's' : ''} {labelStyle.paper} ·{' '}
            {labelStyle.labelWidth}×{labelStyle.labelHeight} mm
          </p>
        </div>
        <button type="button" onClick={onBack} className="text-sm text-gray-600 hover:text-gray-900">
          ← Volver a la selección
        </button>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(300px,340px)_minmax(0,1fr)]">

        {/* ── Columna izquierda: controles ── */}
        <aside className="space-y-4 print:hidden lg:sticky lg:top-4 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:pr-1 lg:pb-4">

          <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
            <button
              type="button"
              onClick={() => window.print()}
              disabled={products.length === 0}
              className="w-full rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Imprimir {tagsToPrint.length} etiquetas
            </button>
            <p className="text-[11px] leading-snug text-gray-500">
              En el diálogo de impresión usa <strong>escala 100%</strong> (no «ajustar a página»)
              para que salgan al tamaño exacto.
            </p>

            <div className="space-y-1.5 border-t border-gray-100 pt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Modo</p>
              {PRINT_MODES.map(({ mode, label, hint }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPrintMode(mode)}
                  className={`w-full rounded-md border px-3 py-1.5 text-left transition-colors ${
                    printMode === mode
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-400'
                  }`}
                >
                  <span className={`block text-xs font-semibold ${printMode === mode ? 'text-blue-700' : 'text-gray-700'}`}>
                    {label}
                  </span>
                  <span className="block text-[10px] text-gray-400">{hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Campos visibles */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-700">
              Qué mostrar
            </h3>
            <div className="space-y-1.5">
              {baseFieldToggles.map(({ key, label }) => (
                <label key={key} className={`flex cursor-pointer items-center gap-2 text-xs font-medium ${
                  key === 'priceChange' ? 'text-orange-700' : 'text-gray-700'
                }`}>
                  <input
                    type="checkbox" checked={!!visibleFields[key]}
                    onChange={() => toggleField(key)}
                    className="accent-blue-600 rounded"
                  />
                  <span>{label}</span>
                </label>
              ))}
              {allExtraFields.length > 0 && (
                <div className="mt-2 space-y-1.5 border-t border-gray-100 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Columnas de tu archivo
                  </p>
                  {allExtraFields.map((field) => (
                    <label key={field} className="flex cursor-pointer items-center gap-2 text-xs font-medium text-blue-700">
                      <input
                        type="checkbox" checked={!!visibleFields[field]}
                        onChange={() => toggleField(field)}
                        className="accent-blue-600 rounded"
                      />
                      <span className="truncate">{field}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <LabelStylePanel
            style={labelStyle}
            onChange={setLabelStyle}
            extraFields={allExtraFields.filter((f) => visibleFields[f])}
            hasLogo={Boolean(logoUrl && visibleFields.logo)}
          />
        </aside>

        {/* ── Columna derecha: vista previa ── */}
        <section className="min-w-0 lg:sticky lg:top-4">
          {printMode === 'doble-independiente' && (
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-blue-600 print:hidden">
              <span>⠿</span>
              <span>Arrastra cualquier media-etiqueta para reordenarlas antes de imprimir</span>
            </p>
          )}

          <div className="overflow-auto rounded-lg border border-gray-200 bg-gray-100 p-6 lg:max-h-[calc(100vh-5rem)] print:max-h-none print:overflow-visible print:rounded-none print:border-0 print:bg-white print:p-0">
            <div id="print-area" className="print-grid mx-auto w-fit bg-white shadow-sm print:shadow-none">
              {tagsToPrint.map((tag, tagIdx) => {
                if (tag.isIndependentDouble) {
                  return (
                    <DoubleTag
                      key={`double-${tagIdx}`}
                      products={tag.products}
                      tagIdx={tagIdx}
                      style={labelStyle}
                      tagStyle={tagStyle}
                      visibleFields={visibleFields}
                      extraFields={allExtraFields}
                      labColors={labColors}
                      logoUrl={logoUrl}
                      {...dnd}
                    />
                  )
                }

                if (tag.isGrouped) {
                  return (
                    <GroupedTag
                      key={`grouped-${tag.baseName}-${tagIdx}`}
                      products={tag.products}
                      baseName={tag.baseName}
                      style={labelStyle}
                      tagStyle={tagStyle}
                      visibleFields={visibleFields}
                      extraFields={allExtraFields}
                      labColors={labColors}
                      logoUrl={logoUrl}
                    />
                  )
                }

                return (
                  <SingleTag
                    key={`${tag.products[0].sku}-${tagIdx}`}
                    product={tag.products[0]}
                    style={labelStyle}
                    tagStyle={tagStyle}
                    visibleFields={visibleFields}
                    extraFields={allExtraFields}
                    labColors={labColors}
                    logoUrl={logoUrl}
                    accentColor={accentColor}
                    taxId={taxId}
                    businessName={businessName}
                  />
                )
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

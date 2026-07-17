'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { ProductWithDiff } from '@/features/labels/types'
import { formatUnitPrice } from '@/features/labels/lib/unitPrice'
import { LabColor } from '@/features/labels/hooks/useLabColors'

type PaperSize = 'carta' | 'oficio'

/* margin vertical calculado para que quepan filas completas de 40mm */
const PAPER: Record<PaperSize, { label: string; page: string; margin: string; perSheet: number }> = {
  carta: { label: 'Carta (12 por hoja)', page: 'letter', margin: '19.7mm 8mm', perSheet: 12 },
  oficio: { label: 'Oficio (14 por hoja)', page: '216mm 330mm', margin: '25mm 8mm', perSheet: 14 },
}

interface PrintPreviewProps {
  products: ProductWithDiff[]
  labColors: Map<string, LabColor>
  logoUrl?: string | null
  onBack: () => void
}

function getBarcode(p: ProductWithDiff): string | null {
  if (!p.extra) return null
  const key = Object.keys(p.extra).find(
    (k) => k.toLowerCase().includes('barra') || k.toLowerCase().includes('barcode')
  )
  return key ? p.extra[key] : null
}

function getBaseNameAndSize(fullName: string): { base: string; size: string } {
  // Expresión regular para detectar tamaños (ej. "110 GR", "220 ML", "500GR", "1L", etc.) al final
  const sizeRegex = /\s+(\d+(?:\.\d+)?\s*(?:gr|ml|kg|l|un|g|ml))\b/i
  const match = fullName.match(sizeRegex)
  if (match) {
    const size = match[1]
    const base = fullName.replace(sizeRegex, '').trim()
    return { base, size }
  }
  return { base: fullName, size: '' }
}

export type PrintMode = 'individual' | 'agrupado-tamanos' | 'doble-independiente'

export function PrintPreview({ products, labColors, logoUrl, onBack }: PrintPreviewProps) {
  const [paper, setPaper] = useState<PaperSize>('carta')
  const [printMode, setPrintMode] = useState<PrintMode>('individual')

  // Drag & drop — orden de productos en modo doble-independiente
  const [dndOrder, setDndOrder] = useState<number[]>(() => products.map((_, i) => i))
  const draggingRef = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  useEffect(() => {
    setDndOrder(products.map((_, i) => i))
  }, [products])

  // Extraer todas las columnas extra disponibles (excluyendo código de barras que ya manejamos de forma estándar)
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

  // Campos visibles por defecto en la etiqueta
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {
      lab: true,
      sku: true,
      barcode: true,
      unitPrice: true,
      logo: !!logoUrl,
    }
    return initial
  })

  function toggleField(field: string) {
    setVisibleFields((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  // Agrupación y estructuración de etiquetas según el modo
  const tagsToPrint = useMemo(() => {
    if (printMode === 'individual') {
      return products.map((p) => ({
        isGrouped: false,
        isIndependentDouble: false,
        baseName: p.name,
        products: [p],
      }))
    }

    if (printMode === 'doble-independiente') {
      // Usar orden DnD; fallback si aún no sincronizó
      const orderedProds = dndOrder.length === products.length
        ? dndOrder.map((i) => products[i])
        : products
      const list: { isGrouped: boolean; isIndependentDouble: boolean; baseName: string; products: ProductWithDiff[] }[] = []
      for (let i = 0; i < orderedProds.length; i += 2) {
        const chunk = orderedProds.slice(i, i + 2)
        list.push({
          isGrouped: false,
          isIndependentDouble: true,
          baseName: '',
          products: chunk,
        })
      }
      return list
    }

    // Modo: agrupado-tamanos
    const groups: Record<string, ProductWithDiff[]> = {}
    products.forEach((p) => {
      const { base } = getBaseNameAndSize(p.name)
      if (!groups[base]) {
        groups[base] = []
      }
      groups[base].push(p)
    })

    const list: { isGrouped: boolean; isIndependentDouble: boolean; baseName: string; products: ProductWithDiff[] }[] = []
    Object.entries(groups).forEach(([base, prods]) => {
      if (prods.length <= 1) {
        list.push({
          isGrouped: false,
          isIndependentDouble: false,
          baseName: prods[0].name,
          products: prods,
        })
      } else {
        // Dividir en parejas
        for (let i = 0; i < prods.length; i += 2) {
          const chunk = prods.slice(i, i + 2)
          list.push({
            isGrouped: true,
            isIndependentDouble: false,
            baseName: base,
            products: chunk,
          })
        }
      }
    })
    return list
  }, [products, printMode, dndOrder])

  const sheets = Math.ceil(tagsToPrint.length / PAPER[paper].perSheet)

  return (
    <div className="mx-auto max-w-4xl text-gray-900">
      <style>{`@page { size: ${PAPER[paper].page}; margin: ${PAPER[paper].margin}; }`}</style>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vista de impresión</h1>
          <p className="mt-1 text-sm text-gray-500">
            {tagsToPrint.length} etiquetas · {sheets} hoja{sheets !== 1 ? 's' : ''} tamaño {paper}
          </p>
        </div>
        <button type="button" onClick={onBack} className="text-sm text-gray-600 hover:text-gray-900">
          ← Volver a la selección
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 print:hidden">
        <div className="flex flex-wrap items-center gap-4">
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

          <div className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white p-1">
            <button
              type="button"
              onClick={() => setPrintMode('individual')}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                printMode === 'individual' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              1 x Etiqueta
            </button>
            <button
              type="button"
              onClick={() => setPrintMode('agrupado-tamanos')}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                printMode === 'agrupado-tamanos' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Agrupar Tamaños
            </button>
            <button
              type="button"
              onClick={() => setPrintMode('doble-independiente')}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                printMode === 'doble-independiente' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              2 Diferentes (Con Corte)
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          disabled={products.length === 0}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Imprimir
        </button>
      </div>

      {/* Panel de personalización dinámica de la etiqueta */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 print:hidden space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Ajustar Ticket Final: Selecciona qué mostrar en la etiqueta</h3>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
            <input
              type="checkbox"
              checked={visibleFields.lab}
              onChange={() => toggleField('lab')}
              className="accent-blue-600 rounded"
            />
            <span>Laboratorio</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
            <input
              type="checkbox"
              checked={visibleFields.sku}
              onChange={() => toggleField('sku')}
              className="accent-blue-600 rounded"
            />
            <span>SKU</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
            <input
              type="checkbox"
              checked={visibleFields.barcode}
              onChange={() => toggleField('barcode')}
              className="accent-blue-600 rounded"
            />
            <span>Código de Barras</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
            <input
              type="checkbox"
              checked={visibleFields.unitPrice}
              onChange={() => toggleField('unitPrice')}
              className="accent-blue-600 rounded"
            />
            <span>Precio por Unidad</span>
          </label>
          {logoUrl && (
            <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
              <input
                type="checkbox"
                checked={visibleFields.logo}
                onChange={() => toggleField('logo')}
                className="accent-blue-600 rounded"
              />
              <span>Logo</span>
            </label>
          )}

          {/* Mostrar opciones para cada columna dinámica subida en el archivo */}
          {allExtraFields.map((field) => (
            <label key={field} className="flex items-center gap-2 cursor-pointer font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              <input
                type="checkbox"
                checked={!!visibleFields[field]}
                onChange={() => toggleField(field)}
                className="accent-blue-600 rounded"
              />
              <span>Mostrar {field}</span>
            </label>
          ))}
        </div>
      </div>

      <p className="mb-3 text-xs text-gray-500 print:hidden">
        En el diálogo de impresión usa <strong>escala 100%</strong> (no &quot;ajustar a página&quot;) para que
        cada etiqueta mida exactamente 8 × 4 cm.
      </p>

      {printMode === 'doble-independiente' && (
        <p className="mb-4 flex items-center gap-1.5 text-xs text-blue-600 font-medium print:hidden">
          <span>⠿</span>
          <span>Arrastra cualquier media-etiqueta para reordenarlas antes de imprimir</span>
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-100 p-6 print:overflow-visible print:rounded-none print:border-0 print:bg-white print:p-0">
        <div id="print-area" className="print-grid mx-auto w-fit bg-white shadow-sm print:shadow-none">
          {tagsToPrint.map((tag, tagIdx) => {
            if (!tag.isGrouped && !tag.isIndependentDouble) {
              const p = tag.products[0]
              const color = labColors.get(p.lab)
              const unitPrice = formatUnitPrice(p.unitPrice, p.contentParsed?.normalizedUnit ?? null)
              const barcode = getBarcode(p)

              // Filtrar qué campos extra dinámicos renderizar
              const activeExtraData = allExtraFields
                .filter((f) => visibleFields[f] && p.extra?.[f])
                .map((f) => `${f}: ${p.extra?.[f]}`)

              return (
                <div key={`${p.sku}-${tagIdx}`} className="print-tag flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    {visibleFields.lab && (
                      <span className="tag-lab" style={color ? { color: color.fg } : undefined}>
                        {p.lab}
                      </span>
                    )}
                    {visibleFields.logo && logoUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element -- tamaño en mm para impresión, sin optimizador */
                      <img src={logoUrl} alt="" className="tag-logo-small" loading="eager" />
                    )}
                  </div>
                  <span className="tag-name">{p.name}</span>

                  {/* Renderizado dinámico de las columnas extra configuradas */}
                  {activeExtraData.length > 0 && (
                    <div className="text-[6px] text-gray-600 font-semibold leading-none truncate mt-0.5">
                      {activeExtraData.join(' | ')}
                    </div>
                  )}

                  <div className="tag-sku-row flex justify-between items-center text-[7px] text-gray-500 mt-0.5">
                    {visibleFields.sku && <span className="tag-sku">SKU: {p.sku}</span>}
                    {visibleFields.barcode && barcode && <span className="tag-barcode font-mono">Barras: {barcode}</span>}
                  </div>
                  <div className="tag-price-row mt-auto">
                    <span className="tag-price">
                      {p.price !== null
                        ? `$${p.price.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                        : '—'}
                    </span>
                    {visibleFields.unitPrice && unitPrice && <span className="tag-unit-price">{unitPrice}</span>}
                  </div>
                </div>
              )
            } else if (tag.isGrouped) {
              // Diseño agrupado de 2 columnas (mismo producto, diferente tamaño)
              const color = labColors.get(tag.products[0].lab)

              return (
                <div key={`grouped-${tag.baseName}-${tagIdx}`} className="print-tag tag-grouped flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    {visibleFields.lab && (
                      <span className="tag-lab" style={color ? { color: color.fg } : undefined}>
                        {tag.products[0].lab}
                      </span>
                    )}
                    {visibleFields.logo && logoUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element -- tamaño en mm para impresión, sin optimizador */
                      <img src={logoUrl} alt="" className="tag-logo-small" loading="eager" />
                    )}
                  </div>
                  
                  {/* Nombre centrado y más grande */}
                  <span className="tag-name tag-name-grouped text-center text-[10px] font-black">{tag.baseName}</span>

                  <div className="grid grid-cols-2 gap-2 border-t border-gray-200 pt-1 mt-0.5">
                    {tag.products.map((p, subIdx) => {
                      const { size } = getBaseNameAndSize(p.name)
                      const unitPrice = formatUnitPrice(p.unitPrice, p.contentParsed?.normalizedUnit ?? null)
                      const barcode = getBarcode(p)

                      // Filtrar columnas extra a renderizar
                      const activeExtraData = allExtraFields
                        .filter((f) => visibleFields[f] && p.extra?.[f])
                        .map((f) => p.extra?.[f])

                      return (
                        <div key={p.sku} className={`flex flex-col justify-between text-center items-center ${subIdx === 0 ? 'border-r border-gray-100 pr-1' : 'pl-1'}`}>
                          <span className="font-extrabold text-[8px] text-blue-700">{size || p.contentRaw || 'OPC'}</span>
                          
                          <span className="text-[16px] font-black text-gray-900 my-0.5">
                            {p.price !== null
                              ? `$${p.price.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                              : '—'}
                          </span>

                          {/* Extra dinámico compacto */}
                          {activeExtraData.length > 0 && (
                            <div className="text-[5px] text-gray-600 leading-none truncate max-w-full">
                              {activeExtraData.join(' | ')}
                            </div>
                          )}

                          <div className="flex flex-col text-[5px] text-gray-500 leading-tight">
                            {visibleFields.sku && <span className="truncate max-w-full">SKU: {p.sku}</span>}
                            {visibleFields.barcode && barcode && <span className="truncate max-w-full font-mono font-bold">Bar: {barcode}</span>}
                            {visibleFields.unitPrice && unitPrice && <span className="font-semibold text-gray-600">{unitPrice}</span>}
                          </div>
                        </div>
                      )
                    })}

                    {tag.products.length === 1 && (
                      <div className="flex items-center justify-center text-[7px] text-gray-300 italic">
                        Sin otro tamaño
                      </div>
                    )}
                  </div>
                </div>
              )
            } else {
              // Modo: doble-independiente (2 productos diferentes con línea de corte en el medio)
              return (
                <div key={`double-indep-${tagIdx}`} className="print-tag tag-double-independent">
                  {tag.products.map((p, subIdx) => {
                    const flatIdx = tagIdx * 2 + subIdx
                    const color = labColors.get(p.lab)
                    const unitPrice = formatUnitPrice(p.unitPrice, p.contentParsed?.normalizedUnit ?? null)
                    const barcode = getBarcode(p)

                    // Filtrar columnas extra a renderizar
                    const activeExtraData = allExtraFields
                      .filter((f) => visibleFields[f] && p.extra?.[f])
                      .map((f) => p.extra?.[f])

                    return (
                      <div
                        key={p.sku}
                        className={`mini-tag-col ${dragOver === flatIdx ? 'dnd-over' : ''} ${draggingRef.current === flatIdx ? 'dnd-dragging' : ''}`}
                        draggable
                        onDragStart={() => { draggingRef.current = flatIdx }}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(flatIdx) }}
                        onDragLeave={() => setDragOver(null)}
                        onDrop={(e) => {
                          e.preventDefault()
                          const from = draggingRef.current
                          if (from === null || from === flatIdx) { setDragOver(null); return }
                          setDndOrder((prev) => {
                            const next = [...prev]
                            const tmp = next[from]
                            next[from] = next[flatIdx]
                            next[flatIdx] = tmp
                            return next
                          })
                          draggingRef.current = null
                          setDragOver(null)
                        }}
                        onDragEnd={() => { draggingRef.current = null; setDragOver(null) }}
                      >
                        <div className="w-full flex justify-between items-center text-[5.5px]">
                          {visibleFields.lab && (
                            <span className="mini-lab truncate max-w-[25px]" style={color ? { color: color.fg } : undefined}>
                              {p.lab}
                            </span>
                          )}
                          {visibleFields.logo && logoUrl && (
                            /* eslint-disable-next-line @next/next/no-img-element -- tamaño en mm para impresión, sin optimizador */
                            <img src={logoUrl} alt="" className="w-2.5 h-2.5 object-contain" loading="eager" />
                          )}
                        </div>

                        <span className="mini-name">{p.name}</span>

                        <span className="mini-price">
                          {p.price !== null
                            ? `$${p.price.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                            : '—'}
                        </span>

                        {activeExtraData.length > 0 && (
                          <div className="text-[4.5px] text-gray-600 leading-none truncate max-w-full font-semibold">
                            {activeExtraData.join(' | ')}
                          </div>
                        )}

                        <div className="mini-details">
                          {visibleFields.sku && <div className="truncate max-w-full">SKU: {p.sku}</div>}
                          {visibleFields.barcode && barcode && <div className="truncate max-w-full font-mono font-bold">Bar: {barcode}</div>}
                          {visibleFields.unitPrice && unitPrice && <div className="font-semibold text-gray-600">{unitPrice}</div>}
                        </div>
                      </div>
                    )
                  })}

                  {tag.products.length === 1 && (
                    <div className="mini-tag-col flex items-center justify-center text-[7px] text-gray-300 italic">
                      Vacío
                    </div>
                  )}
                </div>
              )
            }
          })}
        </div>
      </div>
    </div>
  )
}

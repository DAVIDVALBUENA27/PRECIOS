'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { ProductWithDiff } from '@/features/labels/types'
import { formatUnitPrice } from '@/features/labels/lib/unitPrice'
import { LabColor } from '@/features/labels/hooks/useLabColors'
import { LabelStylePanel, DEFAULT_STYLE, type LabelStyle } from './LabelStylePanel'

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
  const sizeRegex = /\s+(\d+(?:\.\d+)?\s*(?:gr|ml|kg|l|un|g|ml))\b/i
  const match = fullName.match(sizeRegex)
  if (match) {
    return { base: fullName.replace(sizeRegex, '').trim(), size: match[1] }
  }
  return { base: fullName, size: '' }
}

/** Badge de cambio de precio para mostrar en el ticket */
function PriceChangeBadge({ p, mini = false }: { p: ProductWithDiff; mini?: boolean }) {
  if (!p.changed || p.oldPrice === null || p.price === null) return null
  const up = p.price > p.oldPrice
  const diff = Math.abs(p.price - p.oldPrice)
  const color = up ? '#dc2626' : '#16a34a'
  const fs = mini ? '4.5px' : '6px'
  return (
    <span style={{ fontSize: fs, fontWeight: 700, color, display: 'block', lineHeight: 1.2 }}>
      {up ? '▲' : '▼'} Ant:{' '}
      ${p.oldPrice.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      {' '}({up ? '+' : '-'}${diff.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
    </span>
  )
}

export type PrintMode = 'individual' | 'agrupado-tamanos' | 'doble-independiente'

export function PrintPreview({ products, labColors, logoUrl, onBack }: PrintPreviewProps) {
  const [paper, setPaper] = useState<PaperSize>('carta')
  const [printMode, setPrintMode] = useState<PrintMode>('individual')
  const [labelStyle, setLabelStyle] = useState<LabelStyle>(DEFAULT_STYLE)

  // Drag & drop — orden en modo doble-independiente
  const [dndOrder, setDndOrder] = useState<number[]>(() => products.map((_, i) => i))
  const draggingRef = useRef<number | null>(null)
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

  const sheets = Math.ceil(tagsToPrint.length / PAPER[paper].perSheet)

  // Estilo del ticket base
  const tagStyle: React.CSSProperties = {
    backgroundColor: labelStyle.bgColor,
    borderColor: labelStyle.borderColor,
    borderWidth: `${labelStyle.borderWidth}pt`,
    borderStyle: 'solid',
    borderRadius: `${labelStyle.borderRadius}mm`,
  }

  // Estilo de campos extra (columnas dinámicas CSV)
  const extraStyle: React.CSSProperties = {
    fontSize: `${labelStyle.extraFontSize}px`,
    color: labelStyle.extraColor,
    fontWeight: 600,
    lineHeight: 1.2,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    marginTop: '0.5mm',
  }

  return (
    <div className="mx-auto max-w-4xl text-gray-900">
      <style>{`@page { size: ${PAPER[paper].page}; margin: ${PAPER[paper].margin}; }`}</style>

      {/* ── Cabecera ── */}
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

      {/* ── Papel + modo + imprimir ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            {(Object.keys(PAPER) as PaperSize[]).map((size) => (
              <button key={size} type="button" onClick={() => setPaper(size)}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  paper === size ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-600 hover:border-gray-500'
                }`}>
                {PAPER[size].label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white p-1">
            {([
              ['individual', '1 x Etiqueta'],
              ['agrupado-tamanos', 'Agrupar Tamaños'],
              ['doble-independiente', '2 Diferentes (Con Corte)'],
            ] as const).map(([mode, label]) => (
              <button key={mode} type="button" onClick={() => setPrintMode(mode)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  printMode === mode ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => window.print()}
          disabled={products.length === 0}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          Imprimir
        </button>
      </div>

      {/* ── Campos visibles ── */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 print:hidden space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Selecciona qué mostrar en la etiqueta</h3>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
          {[
            { key: 'lab', label: 'Laboratorio' },
            { key: 'sku', label: 'SKU' },
            { key: 'barcode', label: 'Código de Barras' },
            { key: 'unitPrice', label: 'Precio por Unidad' },
            { key: 'priceChange', label: '▲▼ Cambio de precio (informa al cliente)' },
            ...(logoUrl ? [{ key: 'logo', label: 'Logo' }] : []),
          ].map(({ key, label }) => (
            <label key={key} className={`flex items-center gap-2 cursor-pointer font-medium ${
              key === 'priceChange' ? 'text-orange-700' : 'text-gray-700'
            }`}>
              <input type="checkbox" checked={!!visibleFields[key]} onChange={() => toggleField(key)} className="accent-blue-600 rounded" />
              <span>{label}</span>
            </label>
          ))}
          {/* Columnas dinámicas del CSV */}
          {allExtraFields.map((field) => (
            <label key={field} className="flex items-center gap-2 cursor-pointer font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              <input type="checkbox" checked={!!visibleFields[field]} onChange={() => toggleField(field)} className="accent-blue-600 rounded" />
              <span>Mostrar {field}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ── Panel diseño ── */}
      <div className="mb-4">
        <LabelStylePanel style={labelStyle} onChange={setLabelStyle} />
      </div>

      <p className="mb-3 text-xs text-gray-500 print:hidden">
        En el diálogo de impresión usa <strong>escala 100%</strong> (no &quot;ajustar a página&quot;) para que cada etiqueta mida exactamente 8 × 4 cm.
      </p>

      {printMode === 'doble-independiente' && (
        <p className="mb-4 flex items-center gap-1.5 text-xs text-blue-600 font-medium print:hidden">
          <span>⠿</span>
          <span>Arrastra cualquier media-etiqueta para reordenarlas antes de imprimir</span>
        </p>
      )}

      {/* ── Área de impresión ── */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-100 p-6 print:overflow-visible print:rounded-none print:border-0 print:bg-white print:p-0">
        <div id="print-area" className="print-grid mx-auto w-fit bg-white shadow-sm print:shadow-none">
          {tagsToPrint.map((tag, tagIdx) => {

            // ── INDIVIDUAL ──────────────────────────────────────────────────
            if (!tag.isGrouped && !tag.isIndependentDouble) {
              const p = tag.products[0]
              const color = labColors.get(p.lab)
              const unitPrice = formatUnitPrice(p.unitPrice, p.contentParsed?.normalizedUnit ?? null)
              const barcode = getBarcode(p)
              const activeExtraData = allExtraFields.filter((f) => visibleFields[f] && p.extra?.[f])

              return (
                <div key={`${p.sku}-${tagIdx}`} className="print-tag flex flex-col" style={tagStyle}>
                  {/* Fila superior: lab + logo */}
                  <div className="flex justify-between items-start gap-1 min-h-0">
                    {visibleFields.lab && (
                      <span className="tag-lab flex-1 overflow-hidden" style={{
                        color: color?.fg, fontSize: `${labelStyle.labFontSize}px`,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {p.lab}
                      </span>
                    )}
                    {visibleFields.logo && logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="" className="tag-logo-small shrink-0" loading="eager" />
                    )}
                  </div>

                  {/* Nombre */}
                  <span className="tag-name" style={{ fontSize: `${labelStyle.nameFontSize}px`, color: labelStyle.nameColor }}>
                    {p.name}
                  </span>

                  {/* Columnas extra del CSV */}
                  {activeExtraData.length > 0 && (
                    <div style={extraStyle}>
                      {activeExtraData.map((f) => `${f}: ${p.extra?.[f]}`).join(' | ')}
                    </div>
                  )}

                  {/* SKU + Barras */}
                  <div className="tag-sku-row flex justify-between items-center mt-0.5">
                    {visibleFields.sku && (
                      <span className="tag-sku" style={{ fontSize: `${labelStyle.skuFontSize}px`, color: labelStyle.skuColor }}>
                        SKU: {p.sku}
                      </span>
                    )}
                    {visibleFields.barcode && barcode && (
                      <span className="tag-barcode font-mono" style={{ fontSize: `${labelStyle.skuFontSize}px`, color: labelStyle.skuColor }}>
                        Barras: {barcode}
                      </span>
                    )}
                  </div>

                  {/* Precio + cambio */}
                  <div className="tag-price-row mt-auto">
                    <div className="flex items-baseline gap-2">
                      <span className="tag-price" style={{ fontSize: `${labelStyle.priceFontSize}px`, color: labelStyle.priceColor }}>
                        {p.price !== null
                          ? `$${p.price.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                          : '—'}
                      </span>
                      {visibleFields.unitPrice && unitPrice && (
                        <span className="tag-unit-price">{unitPrice}</span>
                      )}
                    </div>
                    {visibleFields.priceChange && <PriceChangeBadge p={p} />}
                  </div>
                </div>
              )
            }

            // ── AGRUPADO ────────────────────────────────────────────────────
            if (tag.isGrouped) {
              const color = labColors.get(tag.products[0].lab)
              return (
                <div key={`grouped-${tag.baseName}-${tagIdx}`} className="print-tag tag-grouped flex flex-col" style={tagStyle}>
                  {/* Lab + logo */}
                  <div className="flex justify-between items-start gap-1 min-h-0">
                    {visibleFields.lab && (
                      <span className="tag-lab flex-1 overflow-hidden" style={{
                        color: color?.fg, fontSize: `${labelStyle.labFontSize}px`,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {tag.products[0].lab}
                      </span>
                    )}
                    {visibleFields.logo && logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="" className="tag-logo-small shrink-0" loading="eager" />
                    )}
                  </div>

                  {/* Nombre base centrado */}
                  <span className="tag-name tag-name-grouped text-center font-black mt-0.5" style={{
                    fontSize: `${Math.min(labelStyle.nameFontSize + 0.5, 12)}px`,
                    color: labelStyle.nameColor,
                  }}>
                    {tag.baseName}
                  </span>

                  {/* Sub-columnas */}
                  <div className="grid grid-cols-2 gap-x-1 border-t border-gray-200 pt-1 mt-0.5 flex-1">
                    {tag.products.map((p, subIdx) => {
                      const { size } = getBaseNameAndSize(p.name)
                      const unitPrice = formatUnitPrice(p.unitPrice, p.contentParsed?.normalizedUnit ?? null)
                      const barcode = getBarcode(p)
                      const activeExtraData = allExtraFields.filter((f) => visibleFields[f] && p.extra?.[f])

                      return (
                        <div key={p.sku} className={`flex flex-col items-center text-center overflow-hidden ${subIdx === 0 ? 'border-r border-gray-100 pr-1' : 'pl-1'}`}>
                          <span className="font-extrabold text-[8px] text-blue-700">{size || p.contentRaw || 'OPC'}</span>
                          <span className="font-black my-0.5" style={{
                            fontSize: `${Math.max(labelStyle.priceFontSize * 0.6, 13)}px`,
                            color: labelStyle.priceColor,
                          }}>
                            {p.price !== null
                              ? `$${p.price.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                              : '—'}
                          </span>
                          {visibleFields.priceChange && <PriceChangeBadge p={p} mini />}
                          {activeExtraData.length > 0 && (
                            <div style={{ ...extraStyle, fontSize: `${Math.max(labelStyle.extraFontSize - 1, 4)}px` }}>
                              {activeExtraData.map((f) => p.extra?.[f]).join(' | ')}
                            </div>
                          )}
                          <div className="flex flex-col" style={{ fontSize: `${labelStyle.skuFontSize}px`, color: labelStyle.skuColor }}>
                            {visibleFields.sku && <span className="truncate max-w-full">SKU: {p.sku}</span>}
                            {visibleFields.barcode && barcode && <span className="truncate max-w-full font-mono font-bold">Bar: {barcode}</span>}
                            {visibleFields.unitPrice && unitPrice && <span className="font-semibold">{unitPrice}</span>}
                          </div>
                        </div>
                      )
                    })}
                    {tag.products.length === 1 && (
                      <div className="flex items-center justify-center text-[7px] text-gray-300 italic">Sin otro tamaño</div>
                    )}
                  </div>
                </div>
              )
            }

            // ── DOBLE INDEPENDIENTE ─────────────────────────────────────────
            return (
              <div key={`double-indep-${tagIdx}`} className="print-tag tag-double-independent" style={tagStyle}>
                {tag.products.map((p, subIdx) => {
                  const flatIdx = tagIdx * 2 + subIdx
                  const color = labColors.get(p.lab)
                  const unitPrice = formatUnitPrice(p.unitPrice, p.contentParsed?.normalizedUnit ?? null)
                  const barcode = getBarcode(p)
                  const activeExtraData = allExtraFields.filter((f) => visibleFields[f] && p.extra?.[f])

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
                          const tmp = next[from]; next[from] = next[flatIdx]; next[flatIdx] = tmp
                          return next
                        })
                        draggingRef.current = null; setDragOver(null)
                      }}
                      onDragEnd={() => { draggingRef.current = null; setDragOver(null) }}
                    >
                      {/* Lab + logo: flex-1 para que el lab tome el espacio disponible */}
                      <div className="w-full flex justify-between items-center gap-0.5 overflow-hidden">
                        {visibleFields.lab && (
                          <span className="mini-lab flex-1 overflow-hidden" style={{
                            color: color?.fg, fontSize: `${labelStyle.labFontSize}px`,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {p.lab}
                          </span>
                        )}
                        {visibleFields.logo && logoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logoUrl} alt="" className="w-2.5 h-2.5 object-contain shrink-0" loading="eager" />
                        )}
                      </div>

                      <span className="mini-name" style={{
                        fontSize: `${Math.max(labelStyle.nameFontSize - 2, 6)}px`,
                        color: labelStyle.nameColor,
                      }}>
                        {p.name}
                      </span>

                      <span className="mini-price" style={{
                        fontSize: `${Math.max(labelStyle.priceFontSize * 0.62, 12)}px`,
                        color: labelStyle.priceColor,
                      }}>
                        {p.price !== null
                          ? `$${p.price.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                          : '—'}
                      </span>

                      {visibleFields.priceChange && <PriceChangeBadge p={p} mini />}

                      {activeExtraData.length > 0 && (
                        <div style={{ ...extraStyle, fontSize: `${Math.max(labelStyle.extraFontSize - 1.5, 4)}px` }}>
                          {activeExtraData.map((f) => p.extra?.[f]).join(' | ')}
                        </div>
                      )}

                      <div className="mini-details" style={{ fontSize: `${labelStyle.skuFontSize}px`, color: labelStyle.skuColor }}>
                        {visibleFields.sku && <div className="truncate max-w-full">SKU: {p.sku}</div>}
                        {visibleFields.barcode && barcode && <div className="truncate max-w-full font-mono font-bold">Bar: {barcode}</div>}
                        {visibleFields.unitPrice && unitPrice && <div className="font-semibold">{unitPrice}</div>}
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
          })}
        </div>
      </div>
    </div>
  )
}

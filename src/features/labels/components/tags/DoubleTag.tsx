'use client'

import { ProductWithDiff } from '@/features/labels/types'
import { formatUnitPrice } from '@/features/labels/lib/unitPrice'
import { LabColor } from '@/features/labels/hooks/useLabColors'
import type { LabelStyle } from '@/features/labels/types/labelStyle'
import {
  ExtraFields, LogoOverlay, PriceChangeBadge, formatPrice, getBarcode,
} from './shared'

interface Props {
  products: ProductWithDiff[]
  tagIdx: number
  style: LabelStyle
  tagStyle: React.CSSProperties
  visibleFields: Record<string, boolean>
  extraFields: string[]
  labColors: Map<string, LabColor>
  logoUrl?: string | null
  dragOver: number | null
  draggingIdx: number | null
  onDragStart: (flatIdx: number) => void
  onDragOver: (flatIdx: number) => void
  onDragLeave: () => void
  onDrop: (flatIdx: number) => void
  onDragEnd: () => void
}

/** Etiqueta con dos productos distintos y línea de corte (modo "2 Diferentes"). */
export function DoubleTag({
  products, tagIdx, style, tagStyle, visibleFields, extraFields, labColors, logoUrl,
  dragOver, draggingIdx, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
}: Props) {
  const activeExtras = extraFields.filter((f) => visibleFields[f])

  return (
    <div className="print-tag tag-double-independent" style={tagStyle}>
      {products.map((p, subIdx) => {
        const flatIdx = tagIdx * 2 + subIdx
        const labAuto = labColors.get(p.lab)
        const labColor = style.labColorMode === 'custom' ? style.labColor : labAuto?.fg
        const unitPrice = formatUnitPrice(p.unitPrice, p.contentParsed?.normalizedUnit ?? null)
        const barcode = getBarcode(p)

        return (
          <div
            key={p.sku}
            className={`mini-tag-col ${dragOver === flatIdx ? 'dnd-over' : ''} ${
              draggingIdx === flatIdx ? 'dnd-dragging' : ''
            }`}
            style={{ position: 'relative' }}
            draggable
            onDragStart={() => onDragStart(flatIdx)}
            onDragOver={(e) => { e.preventDefault(); onDragOver(flatIdx) }}
            onDragLeave={onDragLeave}
            onDrop={(e) => { e.preventDefault(); onDrop(flatIdx) }}
            onDragEnd={onDragEnd}
          >
            {visibleFields.logo && logoUrl && (
              <LogoOverlay logoUrl={logoUrl} style={style} scale={0.55} />
            )}

            {visibleFields.lab && (
              <span className="mini-lab w-full overflow-hidden" style={{
                color: labColor, fontSize: `${style.labFontSize}px`,
                whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              }}>
                {p.lab}
              </span>
            )}

            <span className="mini-name" style={{
              fontSize: `${Math.max(style.nameFontSize - 2, 5)}px`,
              color: style.nameColor,
            }}>
              {p.name}
            </span>

            <span className="mini-price" style={{
              fontSize: `${Math.max(style.priceFontSize * 0.62, 12)}px`,
              color: style.priceColor,
            }}>
              {formatPrice(p.price)}
            </span>

            {visibleFields.priceChange && <PriceChangeBadge p={p} style={style} mini />}

            <ExtraFields product={p} fields={activeExtras} style={style} sizeDelta={-1.5} />

            <div className="mini-details" style={{ fontSize: `${style.skuFontSize}px`, color: style.skuColor }}>
              {visibleFields.sku && <div className="truncate max-w-full">SKU: {p.sku}</div>}
              {visibleFields.barcode && barcode && (
                <div className="truncate max-w-full font-mono font-bold">Bar: {barcode}</div>
              )}
              {visibleFields.unitPrice && unitPrice && (
                <div className="font-semibold" style={{
                  fontSize: `${Math.max(style.unitPriceFontSize - 2, 4)}px`,
                  color: style.unitPriceColor,
                }}>
                  {unitPrice}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {products.length === 1 && (
        <div className="mini-tag-col flex items-center justify-center text-[7px] text-gray-300 italic">
          Vacío
        </div>
      )}
    </div>
  )
}

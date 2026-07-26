'use client'

import { ProductWithDiff } from '@/features/labels/types'
import { formatUnitPrice } from '@/features/labels/lib/unitPrice'
import { LabColor } from '@/features/labels/hooks/useLabColors'
import type { LabelStyle } from '@/features/labels/types/labelStyle'
import {
  ExtraFields, LogoOverlay, PriceChangeBadge, formatPrice, getBarcode, getBaseNameAndSize,
} from './shared'

interface Props {
  products: ProductWithDiff[]
  baseName: string
  style: LabelStyle
  tagStyle: React.CSSProperties
  visibleFields: Record<string, boolean>
  extraFields: string[]
  labColors: Map<string, LabColor>
  logoUrl?: string | null
}

/** Etiqueta con dos presentaciones del mismo producto (modo "Agrupar Tamaños"). */
export function GroupedTag({
  products, baseName, style, tagStyle, visibleFields, extraFields, labColors, logoUrl,
}: Props) {
  const labAuto = labColors.get(products[0].lab)
  const labColor = style.labColorMode === 'custom' ? style.labColor : labAuto?.fg
  const activeExtras = extraFields.filter((f) => visibleFields[f])

  return (
    <div className="print-tag tag-grouped flex flex-col" style={tagStyle}>
      {visibleFields.logo && logoUrl && <LogoOverlay logoUrl={logoUrl} style={style} scale={0.8} />}

      {visibleFields.lab && (
        <span className="tag-lab overflow-hidden" style={{
          color: labColor, fontSize: `${style.labFontSize}px`,
          whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        }}>
          {products[0].lab}
        </span>
      )}

      <span className="tag-name tag-name-grouped text-center font-black mt-0.5" style={{
        fontSize: `${Math.min(style.nameFontSize + 0.5, 14)}px`,
        color: style.nameColor,
      }}>
        {baseName}
      </span>

      <div className="grid grid-cols-2 gap-x-1 border-t border-gray-200 pt-1 mt-0.5 flex-1">
        {products.map((p, subIdx) => {
          const { size } = getBaseNameAndSize(p.name)
          const unitPrice = formatUnitPrice(p.unitPrice, p.contentParsed?.normalizedUnit ?? null)
          const barcode = getBarcode(p)

          return (
            <div
              key={p.sku}
              className={`flex flex-col items-center text-center overflow-hidden ${
                subIdx === 0 ? 'border-r border-gray-100 pr-1' : 'pl-1'
              }`}
            >
              <span className="font-extrabold text-[8px] text-blue-700">
                {size || p.contentRaw || 'OPC'}
              </span>
              <span className="font-black my-0.5" style={{
                fontSize: `${Math.max(style.priceFontSize * 0.6, 13)}px`,
                color: style.priceColor,
              }}>
                {formatPrice(p.price)}
              </span>
              {visibleFields.priceChange && <PriceChangeBadge p={p} style={style} mini />}
              <ExtraFields product={p} fields={activeExtras} style={style} sizeDelta={-1} />
              <div className="flex flex-col" style={{ fontSize: `${style.skuFontSize}px`, color: style.skuColor }}>
                {visibleFields.sku && <span className="truncate max-w-full">SKU: {p.sku}</span>}
                {visibleFields.barcode && barcode && (
                  <span className="truncate max-w-full font-mono font-bold">Bar: {barcode}</span>
                )}
                {visibleFields.unitPrice && unitPrice && (
                  <span className="font-semibold" style={{
                    fontSize: `${Math.max(style.unitPriceFontSize - 2, 4)}px`,
                    color: style.unitPriceColor,
                  }}>
                    {unitPrice}
                  </span>
                )}
              </div>
            </div>
          )
        })}
        {products.length === 1 && (
          <div className="flex items-center justify-center text-[7px] text-gray-300 italic">
            Sin otro tamaño
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { ProductWithDiff } from '@/features/labels/types'
import { formatUnitPrice } from '@/features/labels/lib/unitPrice'
import { LabColor } from '@/features/labels/hooks/useLabColors'
import type { LabelStyle } from '@/features/labels/types/labelStyle'
import {
  ExtraFields, LogoOverlay, PriceChangeBadge, formatPrice, getBarcode,
} from './shared'

interface Props {
  product: ProductWithDiff
  style: LabelStyle
  tagStyle: React.CSSProperties
  visibleFields: Record<string, boolean>
  extraFields: string[]
  labColors: Map<string, LabColor>
  logoUrl?: string | null
  accentColor: string
  taxId?: string | null
  businessName?: string
}

/** Etiqueta de un solo producto (modo "1 × Etiqueta"). */
export function SingleTag({
  product: p, style, tagStyle, visibleFields, extraFields,
  labColors, logoUrl, accentColor, taxId, businessName,
}: Props) {
  const labAuto = labColors.get(p.lab)
  const labColor = style.labColorMode === 'custom' ? style.labColor : labAuto?.fg
  const unitPrice = formatUnitPrice(p.unitPrice, p.contentParsed?.normalizedUnit ?? null)
  const barcode = getBarcode(p)
  const activeExtras = extraFields.filter((f) => visibleFields[f])

  // Si el logo va arriba y opaco, el texto de la cabecera le cede el espacio
  // para que no se monte encima. Como marca de agua (opacidad baja) no aparta nada.
  const showLogo = Boolean(visibleFields.logo && logoUrl)
  const logoOnTop = showLogo && style.logoY < 35 && style.logoOpacity > 0.5
  const headerSpace: React.CSSProperties = {
    paddingRight: logoOnTop && style.logoX > 65 ? `${style.logoSize}mm` : undefined,
    paddingLeft: logoOnTop && style.logoX < 35 ? `${style.logoSize}mm` : undefined,
  }

  return (
    <div className="print-tag flex flex-col" style={tagStyle}>
      {showLogo && logoUrl && <LogoOverlay logoUrl={logoUrl} style={style} />}

      {visibleFields.lab && (
        <span className="tag-lab overflow-hidden" style={{
          color: labColor, fontSize: `${style.labFontSize}px`,
          whiteSpace: 'nowrap', textOverflow: 'ellipsis', ...headerSpace,
        }}>
          {p.lab}
        </span>
      )}

      <span className="tag-name" style={{
        fontSize: `${style.nameFontSize}px`, color: style.nameColor, ...headerSpace,
      }}>
        {p.name}
      </span>

      <ExtraFields product={p} fields={activeExtras} style={style} />

      <div className="tag-sku-row flex justify-between items-center mt-0.5">
        {visibleFields.sku && (
          <span className="tag-sku" style={{ fontSize: `${style.skuFontSize}px`, color: style.skuColor }}>
            SKU: {p.sku}
          </span>
        )}
        {visibleFields.barcode && barcode && (
          <span className="tag-barcode font-mono" style={{ fontSize: `${style.skuFontSize}px`, color: style.skuColor }}>
            Barras: {barcode}
          </span>
        )}
      </div>

      <div className="tag-price-row mt-auto">
        <div className="flex items-baseline gap-2">
          <span className="tag-price" style={{ fontSize: `${style.priceFontSize}px`, color: style.priceColor }}>
            {formatPrice(p.price)}
          </span>
          {visibleFields.unitPrice && unitPrice && (
            <span className="tag-unit-price" style={{
              fontSize: `${style.unitPriceFontSize}px`, color: style.unitPriceColor,
            }}>
              {unitPrice}
            </span>
          )}
        </div>
        {visibleFields.priceChange && <PriceChangeBadge p={p} style={style} />}
      </div>

      {Boolean(taxId) && (
        <div style={{ fontSize: `${style.footerFontSize}px`, lineHeight: 1.2, marginTop: '1mm' }}>
          {businessName && (
            <span style={{ fontWeight: 700, color: accentColor }}>{businessName} · </span>
          )}
          <span style={{ color: style.footerColor }}>NIT {taxId}</span>
        </div>
      )}
    </div>
  )
}

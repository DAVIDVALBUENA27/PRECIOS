'use client'

/** Piezas compartidas por los tres modos de etiqueta. */

import { ProductWithDiff } from '@/features/labels/types'
import { resolveExtraField, orderExtraFields, type LabelStyle } from '@/features/labels/types/labelStyle'

export function getBarcode(p: ProductWithDiff): string | null {
  if (!p.extra) return null
  const key = Object.keys(p.extra).find(
    (k) => k.toLowerCase().includes('barra') || k.toLowerCase().includes('barcode')
  )
  return key ? p.extra[key] : null
}

export function getBaseNameAndSize(fullName: string): { base: string; size: string } {
  const sizeRegex = /\s+(\d+(?:\.\d+)?\s*(?:gr|ml|kg|l|un|g|ml))\b/i
  const match = fullName.match(sizeRegex)
  if (match) {
    return { base: fullName.replace(sizeRegex, '').trim(), size: match[1] }
  }
  return { base: fullName, size: '' }
}

export function formatPrice(price: number | null): string {
  return price !== null
    ? `$${price.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : '—'
}

/** Logo flotante: posición, tamaño y opacidad configurables por el negocio. */
export function LogoOverlay({
  logoUrl, style, scale = 1,
}: { logoUrl: string; style: LabelStyle; scale?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt=""
      loading="eager"
      style={{
        position: 'absolute',
        left: `${style.logoX}%`,
        top: `${style.logoY}%`,
        transform: 'translate(-50%, -50%)',
        width: `${style.logoSize * scale}mm`,
        height: `${style.logoSize * scale}mm`,
        objectFit: 'contain',
        opacity: style.logoOpacity,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  )
}

/** Badge de cambio de precio (informa al cliente qué subió o bajó). */
export function PriceChangeBadge({
  p, style, mini = false,
}: { p: ProductWithDiff; style: LabelStyle; mini?: boolean }) {
  if (!p.changed || p.oldPrice === null || p.price === null) return null
  const up = p.price > p.oldPrice
  const diff = Math.abs(p.price - p.oldPrice)
  const size = mini ? Math.max(style.changeFontSize - 1.5, 3.5) : style.changeFontSize
  return (
    <span style={{
      fontSize: `${size}px`, fontWeight: 700,
      color: up ? '#dc2626' : '#16a34a',
      display: 'block', lineHeight: 1.2,
    }}>
      {up ? '▲' : '▼'} Ant: {formatPrice(p.oldPrice)} ({up ? '+' : '-'}{formatPrice(diff)})
    </span>
  )
}

/**
 * Columnas dinámicas del CSV, cada una con su tamaño y color propios.
 * Por defecto van una debajo de otra (Ubicación arriba del código); el
 * negocio puede cambiar el orden o ponerlas en una sola línea.
 */
export function ExtraFields({
  product, fields, style, sizeDelta = 0,
}: {
  product: ProductWithDiff
  fields: string[]
  style: LabelStyle
  sizeDelta?: number
}) {
  const active = orderExtraFields(fields, style).filter((f) => product.extra?.[f])
  if (active.length === 0) return null
  const stacked = style.extraLayout !== 'inline'

  return (
    <div style={{
      lineHeight: 1.2, marginTop: '0.5mm', overflow: 'hidden',
      ...(stacked ? {} : { whiteSpace: 'nowrap', textOverflow: 'ellipsis' }),
    }}>
      {active.map((f, i) => {
        const cfg = resolveExtraField(style, f)
        return (
          <span key={f} style={{
            fontSize: `${Math.max(cfg.size + sizeDelta, 3.5)}px`,
            color: cfg.color,
            fontWeight: 600,
            ...(stacked
              ? { display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
              : {}),
          }}>
            {!stacked && i > 0 && ' | '}
            {cfg.showLabel ? `${f}: ` : ''}{product.extra?.[f]}
          </span>
        )
      })}
    </div>
  )
}

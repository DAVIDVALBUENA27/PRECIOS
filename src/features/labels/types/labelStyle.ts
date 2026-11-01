/**
 * Estilo visual de la etiqueta.
 * Vive aparte del panel para que lo puedan importar los tags y el servicio
 * de plantillas sin ciclos de imports.
 */

export type PaperSize = 'carta' | 'oficio'

/** Ajuste opcional por columna dinámica del CSV. */
export interface FieldOverride {
  size?: number
  color?: string
  /** Mostrar el nombre de la columna antes del valor. */
  showLabel?: boolean
}

export interface LabelStyle {
  // Papel y tamaño
  paper: PaperSize
  labelWidth: number   // mm  (50–100)
  labelHeight: number  // mm  (30–60)
  // Fondo y borde
  bgColor: string
  borderColor: string
  borderWidth: number   // pt
  borderRadius: number  // mm
  // Fuentes (px)
  nameFontSize: number
  priceFontSize: number
  unitPriceFontSize: number
  skuFontSize: number
  labFontSize: number
  extraFontSize: number   // columnas dinámicas CSV
  changeFontSize: number  // badge ▲▼ de cambio de precio
  footerFontSize: number  // negocio + NIT
  // Colores de texto
  nameColor: string
  priceColor: string
  unitPriceColor: string
  skuColor: string
  extraColor: string
  footerColor: string
  /** 'auto' = color asignado por laboratorio; 'custom' = labColor. */
  labColorMode: 'auto' | 'custom'
  labColor: string
  // Logo del negocio
  logoSize: number     // mm  (3–35)
  logoOpacity: number  // 0.05–1
  logoX: number        // % horizontal del centro del logo dentro de la etiqueta
  logoY: number        // % vertical
  // Ajustes por columna del CSV: { "Inventario": { size: 7, color: "#333" } }
  extraOverrides: Record<string, FieldOverride>
  /** Columnas del archivo: una debajo de otra o en la misma línea. */
  extraLayout: 'stacked' | 'inline'
  /** Orden de las columnas del archivo en la etiqueta (de arriba a abajo). */
  extraOrder: string[]
}

export const DEFAULT_STYLE: LabelStyle = {
  paper: 'carta',
  labelWidth: 80,
  labelHeight: 40,
  bgColor: '#ffffff',
  borderColor: '#999999',
  borderWidth: 0.5,
  borderRadius: 0,
  nameFontSize: 9.5,
  priceFontSize: 26,
  unitPriceFontSize: 9,
  skuFontSize: 7,
  labFontSize: 7,
  extraFontSize: 7,
  changeFontSize: 6,
  footerFontSize: 6,
  nameColor: '#000000',
  priceColor: '#000000',
  unitPriceColor: '#555555',
  skuColor: '#555555',
  extraColor: '#666666',
  footerColor: '#666666',
  labColorMode: 'auto',
  labColor: '#666666',
  logoSize: 9,
  logoOpacity: 1,
  logoX: 92,
  logoY: 12,
  extraOverrides: {},
  extraLayout: 'stacked',
  extraOrder: [],
}

/**
 * Completa un estilo con los valores por defecto.
 * Necesario para plantillas guardadas antes de que existieran campos nuevos.
 */
export function normalizeStyle(style: Partial<LabelStyle> | null | undefined): LabelStyle {
  return {
    ...DEFAULT_STYLE,
    ...(style ?? {}),
    extraOverrides: { ...(style?.extraOverrides ?? {}) },
    extraOrder: [...(style?.extraOrder ?? [])],
  }
}

/** Ubicación primero: es lo que se busca en la góndola antes que el código. */
function defaultRank(field: string): number {
  const k = field.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')
  return k.includes('ubica') ? 0 : 1
}

/**
 * Orden de las columnas del archivo en la etiqueta: el que eligió el negocio
 * (`extraOrder`); las que no ha ordenado van después, con Ubicación primero.
 */
export function orderExtraFields(fields: string[], style: LabelStyle): string[] {
  const pos = (f: string) => {
    const i = style.extraOrder.indexOf(f)
    return i === -1 ? style.extraOrder.length + defaultRank(f) : i
  }
  return fields
    .map((f, i) => ({ f, i, r: pos(f) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.f)
}

/** Tamaño y color efectivos de una columna del CSV. */
export function resolveExtraField(style: LabelStyle, field: string): Required<FieldOverride> {
  const ov = style.extraOverrides[field] ?? {}
  return {
    size: ov.size ?? style.extraFontSize,
    color: ov.color ?? style.extraColor,
    showLabel: ov.showLabel ?? true,
  }
}

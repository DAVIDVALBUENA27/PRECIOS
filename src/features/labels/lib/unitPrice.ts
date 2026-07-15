import { ContentUnit, ParsedContent, BaseUnit } from '@/features/labels/types'

const UNIT_ALIASES: Record<string, ContentUnit> = {
  gr: 'gr', g: 'gr', grs: 'gr', gramos: 'gr', gramo: 'gr',
  ml: 'ml', mls: 'ml', mililitros: 'ml', mililitro: 'ml', cc: 'ml',
  kg: 'kg', kgs: 'kg', kilo: 'kg', kilos: 'kg', kilogramos: 'kg',
  l: 'l', lt: 'l', lts: 'l', litro: 'l', litros: 'l',
  un: 'un', u: 'un', unid: 'un', unidad: 'un', unidades: 'un',
}

/** Parsea "500 GR", "250ml", "1.5 L", "12 un" → ParsedContent normalizado. */
export function parseContent(raw: string | null): ParsedContent | null {
  if (!raw) return null
  const str = raw.trim().toLowerCase()
  if (!str) return null

  const match = str.match(/^([\d.,]+)\s*([a-záéíóúñ]+)\.?$/i)
  if (!match) return null

  const quantity = parseFloat(match[1].replace(',', '.'))
  const unitKey = match[2].replace(/[^a-zñ]/g, '')
  const unit = UNIT_ALIASES[unitKey]
  if (!unit || isNaN(quantity) || quantity <= 0) return null

  const { normalizedQty, normalizedUnit } = normalizeToBase(quantity, unit)
  return { quantity, unit, normalizedQty, normalizedUnit }
}

function normalizeToBase(
  qty: number,
  unit: ContentUnit
): { normalizedQty: number | null; normalizedUnit: BaseUnit | null } {
  switch (unit) {
    case 'gr': return { normalizedQty: qty, normalizedUnit: 'gr' }
    case 'kg': return { normalizedQty: qty * 1000, normalizedUnit: 'gr' }
    case 'ml': return { normalizedQty: qty, normalizedUnit: 'ml' }
    case 'l': return { normalizedQty: qty * 1000, normalizedUnit: 'ml' }
    case 'un': return { normalizedQty: null, normalizedUnit: null }
  }
}

export function calcUnitPrice(price: number | null, parsed: ParsedContent | null): number | null {
  if (price == null || parsed?.normalizedQty == null || parsed.normalizedQty === 0) return null
  return price / parsed.normalizedQty
}

/** "$100/gr" — para mostrar en tabla y etiqueta. */
export function formatUnitPrice(unitPrice: number | null, unit: BaseUnit | null): string {
  if (unitPrice == null || !unit) return ''
  return `$${Math.round(unitPrice).toLocaleString('es-CO')}/${unit}`
}

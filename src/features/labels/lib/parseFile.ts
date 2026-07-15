import * as XLSX from 'xlsx'
import { RawProduct, ColMapping } from '@/features/labels/types'
import { parseContent, calcUnitPrice } from './unitPrice'

export function parseWorkbook(buffer: ArrayBuffer | string, isCsv: boolean): string[][] {
  const wb = isCsv
    ? XLSX.read(buffer as string, { type: 'string' })
    : XLSX.read(new Uint8Array(buffer as ArrayBuffer), { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][]
}

export function autoDetectColumns(headers: string[]): Partial<ColMapping> {
  const detect = (keywords: string[]) => {
    const idx = headers.findIndex(h =>
      keywords.some(k => h.toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').includes(k))
    )
    return idx >= 0 ? idx : undefined
  }
  return {
    name: detect(['nombre', 'producto', 'descripcion', 'articulo', 'name']),
    sku: detect(['sku', 'codigo', 'code', 'referencia', 'ref', 'barcode', 'cod']),
    price: detect(['precio', 'price', 'pvp', 'valor', 'venta']),
    lab: detect(['laboratorio', 'marca', 'lab', 'brand', 'fabricante', 'linea']),
    content: detect(['contenido', 'presentacion', 'tamano', 'peso', 'volumen', 'content']),
  }
}

export function rowsToProducts(rows: string[][], map: ColMapping): RawProduct[] {
  return rows.slice(1)
    .filter(r => r[map.name] || r[map.sku])
    .map(r => {
      const price = parsePrice(r[map.price])
      const contentRaw = map.content !== null ? String(r[map.content] ?? '').trim() || null : null
      const contentParsed = parseContent(contentRaw)
      return {
        name: String(r[map.name] ?? '').trim(),
        sku: String(r[map.sku] ?? '').trim(),
        price,
        lab: map.lab !== null
          ? String(r[map.lab] ?? 'Sin laboratorio').trim()
          : 'Sin laboratorio',
        contentRaw,
        contentParsed,
        unitPrice: calcUnitPrice(price, contentParsed),
      }
    })
    .filter(p => p.name || p.sku)
}

function parsePrice(v: unknown): number | null {
  if (v === '' || v == null) return null
  const n = parseFloat(String(v).replace(/[^0-9,.]/g, '').replace(/\./g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}

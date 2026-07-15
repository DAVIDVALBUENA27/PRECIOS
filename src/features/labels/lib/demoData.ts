import { RawProduct } from '@/features/labels/types'
import { parseContent, calcUnitPrice } from './unitPrice'

interface DemoRow {
  sku: string
  name: string
  price: number
  lab: string
  contentRaw: string
}

const DEMO_DAY1_RAW: DemoRow[] = [
  { sku: 'JOH-001', name: 'Neutrogena Hydro Boost Water Gel 50ml', price: 38900, lab: 'Johnson & Johnson', contentRaw: '50 ML' },
  { sku: 'JOH-002', name: 'Johnson Baby Shampoo 400ml', price: 18500, lab: 'Johnson & Johnson', contentRaw: '400 ML' },
  { sku: 'JOH-003', name: 'Listerine Cool Mint 500ml', price: 24900, lab: 'Johnson & Johnson', contentRaw: '500 ML' },
  { sku: 'JOH-004', name: 'Neutrogena Deep Clean Facial Wash 200ml', price: 29900, lab: 'Johnson & Johnson', contentRaw: '200 ML' },
  { sku: 'JOH-005', name: 'Band-Aid Flexible Fabric x30', price: 12500, lab: 'Johnson & Johnson', contentRaw: '30 UN' },
  { sku: 'AVE-001', name: 'Avene Cleanance Gel 300ml', price: 58000, lab: 'Pierre Fabre', contentRaw: '300 ML' },
  { sku: 'AVE-002', name: 'Avene Cicalfate Crema Reparadora 40ml', price: 75000, lab: 'Pierre Fabre', contentRaw: '40 GR' },
  { sku: 'GRU-001', name: 'Grisi Crema Limpiadora Pepino 200ml', price: 14900, lab: 'Grisi', contentRaw: '200 ML' },
  { sku: 'GRU-002', name: 'Grisi Jabón Avena x3', price: 9900, lab: 'Grisi', contentRaw: '3 UN' },
  { sku: 'ROC-001', name: 'La Roche-Posay Effaclar Gel 200ml', price: 72000, lab: 'La Roche-Posay', contentRaw: '200 ML' },
  { sku: 'ROC-002', name: 'La Roche-Posay Anthelios SPF50+ 50ml', price: 98000, lab: 'La Roche-Posay', contentRaw: '50 ML' },
  { sku: 'BAY-001', name: 'Bayer Aspirina 500mg x20', price: 8900, lab: 'Bayer', contentRaw: '20 UN' },
  { sku: 'BAY-002', name: 'Bayer Canesten Crema 20g', price: 32000, lab: 'Bayer', contentRaw: '20 GR' },
]

const CHANGED_SKUS = new Set(['JOH-001', 'JOH-003', 'AVE-002', 'ROC-001', 'BAY-002'])

const DEMO_DAY2_RAW: DemoRow[] = DEMO_DAY1_RAW.map(p => ({
  ...p,
  price: CHANGED_SKUS.has(p.sku) ? Math.round(p.price * 1.08) : p.price, // +8%
}))

function toRawProducts(rows: DemoRow[]): RawProduct[] {
  return rows.map(r => {
    const contentParsed = parseContent(r.contentRaw)
    return {
      sku: r.sku,
      name: r.name,
      price: r.price,
      lab: r.lab,
      contentRaw: r.contentRaw,
      contentParsed,
      unitPrice: calcUnitPrice(r.price, contentParsed),
    }
  })
}

export const DEMO_DAY1: RawProduct[] = toRawProducts(DEMO_DAY1_RAW)
export const DEMO_DAY2: RawProduct[] = toRawProducts(DEMO_DAY2_RAW)

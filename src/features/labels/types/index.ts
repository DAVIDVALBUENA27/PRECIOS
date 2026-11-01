export type ContentUnit = 'gr' | 'ml' | 'kg' | 'l' | 'un'
export type BaseUnit = 'gr' | 'ml'

export interface ParsedContent {
  quantity: number // cantidad tal cual viene, ej 500, 250, 1.5
  unit: ContentUnit
  normalizedQty: number | null // convertida a gr/ml base; null si unit === 'un' o no parseable
  normalizedUnit: BaseUnit | null
}

export interface RawProduct {
  sku: string
  name: string
  price: number | null
  lab: string
  contentRaw: string | null // texto crudo del Excel, ej "500 GR"
  contentParsed: ParsedContent | null
  unitPrice: number | null // price / normalizedQty; null si no aplica
  extra?: Record<string, string>
}

export interface ProductWithDiff extends RawProduct {
  /**
   * Identificador único de la fila. NO usar el SKU para esto: si dos filas del
   * archivo comparten código (o vienen sin código), al marcar una se marcaba
   * también la otra y en la tabla se veía el nombre de otro producto.
   */
  uid: string
  oldPrice: number | null
  oldUnitPrice: number | null
  changed: boolean
  /** true si el SKU no existía en el listado anterior (producto nuevo). */
  isNew: boolean
  selected?: boolean
}

export interface ColMapping {
  name: number
  sku: number
  price: number
  lab: number | null
  content: number | null // columna de contenido/presentación
}

export interface Snapshot {
  snapshot_date: string
  products: RawProduct[]
}

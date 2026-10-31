import { RawProduct, ProductWithDiff } from '@/features/labels/types'

/**
 * Columnas extra que guardan otro código del mismo producto
 * ("Código Barras", "Código Producto", "Referencia", "EAN"…).
 * Se normaliza el nombre y se busca "digo" porque archivos con acentos dañados
 * traen "Cï¿½digo Barras" en vez de "Código Barras".
 */
const CODE_KEY = /digo|barra|sku|referencia|ean|plu/

function normalizeKey(key: string): string {
  return key.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')
}

/** Todos los códigos conocidos de un producto: el principal + los de columnas extra. */
export function productCodes(p: RawProduct): string[] {
  const codes = p.sku ? [p.sku] : []
  for (const [key, value] of Object.entries(p.extra ?? {})) {
    const v = String(value ?? '').trim()
    if (v.length >= 4 && CODE_KEY.test(normalizeKey(key))) codes.push(v)
  }
  return codes
}

/**
 * Compara el archivo de hoy contra el último precio conocido de cada producto.
 *
 * @param snapshot  referencia ordenada de más vieja a más reciente: si un
 *                  producto aparece varias veces, gana la más reciente.
 *
 * Un producto se reconoce por CUALQUIERA de sus códigos: un archivo puede usar
 * el código interno como principal y otro el código de barras.
 */
export function compareWithSnapshot(
  today: RawProduct[],
  snapshot: RawProduct[]
): ProductWithDiff[] {
  // código → posición en la referencia (mayor posición = más reciente)
  const byCode = new Map<string, number>()
  snapshot.forEach((p, i) => {
    for (const code of productCodes(p)) byCode.set(code, i)
  })

  // Solo tiene sentido hablar de "productos nuevos" si ya había un listado
  // anterior con el cual comparar. En la primera carga nada es "nuevo".
  const hasSnapshot = snapshot.length > 0
  return today.map((p) => {
    let best = -1
    for (const code of productCodes(p)) best = Math.max(best, byCode.get(code) ?? -1)
    const prev = best >= 0 ? snapshot[best] : undefined
    const oldPrice = prev?.price != null ? Math.round(prev.price) : null
    return {
      ...p,
      oldPrice,
      oldUnitPrice: prev ? prev.unitPrice : null,
      // Se compara en pesos enteros: decimales sueltos no son un cambio real
      changed: oldPrice !== null && p.price !== null && oldPrice !== Math.round(p.price),
      isNew: hasSnapshot && !prev,
      selected: false,
    }
  })
}

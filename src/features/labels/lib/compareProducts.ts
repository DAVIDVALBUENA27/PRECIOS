import { RawProduct, ProductWithDiff } from '@/features/labels/types'

export function compareWithSnapshot(
  today: RawProduct[],
  snapshot: RawProduct[] // productos del día anterior (del mismo negocio)
): ProductWithDiff[] {
  const prevMap = new Map(snapshot.map(p => [p.sku, p]))
  return today.map((p) => {
    const prev = prevMap.get(p.sku)
    const oldPrice = prev ? prev.price : null
    return {
      ...p,
      oldPrice,
      oldUnitPrice: prev ? prev.unitPrice : null,
      changed: oldPrice !== null && oldPrice !== p.price,
      selected: false,
    }
  })
}

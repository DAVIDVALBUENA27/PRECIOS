import { ProductWithDiff } from '@/features/labels/types'

/** Grupos de productos que se pueden subir arriba y marcar de una vez. */
export type ChangeGroup = 'new' | 'up' | 'down'

export const GROUP_LABELS: Record<ChangeGroup, string> = {
  new: 'Nuevos',
  up: 'Subieron',
  down: 'Bajaron',
}

export function groupOf(p: ProductWithDiff): ChangeGroup | null {
  if (p.isNew) return 'new'
  if (!p.changed || p.price === null || p.oldPrice === null) return null
  return p.price > p.oldPrice ? 'up' : 'down'
}

/**
 * Ordena poniendo arriba los grupos activos, en el orden en que se activaron
 * (ej. primero los que subieron, luego los nuevos). El resto queda abajo
 * en su orden original. Es estable: dentro de cada grupo se respeta el orden base.
 */
export function sortByGroups(products: ProductWithDiff[], active: ChangeGroup[]): ProductWithDiff[] {
  if (active.length === 0) return products
  const rank = (p: ProductWithDiff) => {
    const g = groupOf(p)
    const i = g ? active.indexOf(g) : -1
    return i === -1 ? active.length : i
  }
  return products
    .map((p, i) => ({ p, i, r: rank(p) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.p)
}

/** Para sesiones guardadas antes de que existiera `uid`. */
export function ensureUids(products: ProductWithDiff[]): ProductWithDiff[] {
  return products.map((p, i) => (p.uid ? p : { ...p, uid: `p${i}` }))
}

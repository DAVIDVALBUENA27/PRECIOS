'use client'

import { useMemo } from 'react'
import { ProductWithDiff } from '@/features/labels/types'
import { formatUnitPrice } from '@/features/labels/lib/unitPrice'
import { LabColor } from '@/features/labels/hooks/useLabColors'

function formatPrice(price: number | null): string {
  return price !== null
    ? `$${price.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : '—'
}

interface ProductTableProps {
  products: ProductWithDiff[]
  labColors: Map<string, LabColor>
  onToggle: (sku: string) => void
  onToggleAll: (selected: boolean) => void
}

export function ProductTable({ products, labColors, onToggle, onToggleAll }: ProductTableProps) {
  const allSelected = products.length > 0 && products.every((p) => p.selected)

  // Extraer las columnas extra dinámicas de todos los productos
  const extraCols = useMemo(() => {
    if (products.length === 0) return []
    const keys = new Set<string>()
    products.forEach((p) => {
      if (p.extra) {
        Object.keys(p.extra).forEach((k) => keys.add(k))
      }
    })
    return Array.from(keys)
  }, [products])

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onToggleAll(e.target.checked)}
                className="accent-blue-600"
                aria-label="Seleccionar todos"
              />
            </th>
            <th className="px-4 py-3">Producto</th>
            <th className="px-4 py-3">SKU</th>
            <th className="px-4 py-3">Precio actual</th>
            <th className="px-4 py-3">Precio anterior</th>
            <th className="px-4 py-3">Precio/unidad</th>
            {extraCols.map((col) => (
              <th key={col} className="px-4 py-3">{col}</th>
            ))}
            <th className="px-4 py-3">Laboratorio</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {products.map((p) => {
            const color = labColors.get(p.lab)
            return (
              <tr key={p.sku} className={p.changed ? 'bg-orange-50/50' : undefined}>
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={p.selected ?? false}
                    onChange={() => onToggle(p.sku)}
                    className="accent-blue-600"
                    aria-label={`Seleccionar ${p.name}`}
                  />
                </td>
                <td className="px-4 py-2 text-gray-900">{p.name}</td>
                <td className="px-4 py-2 font-mono text-xs text-gray-500">{p.sku}</td>
                <td className="px-4 py-2">
                  <span className={p.changed ? 'font-semibold text-orange-600' : 'text-gray-900'}>
                    {formatPrice(p.price)}
                  </span>
                  {p.changed && (
                    <span className="ml-2 rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700">
                      ↑ cambió
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-gray-400">
                  {p.oldPrice !== null ? <s>{formatPrice(p.oldPrice)}</s> : '—'}
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {formatUnitPrice(p.unitPrice, p.contentParsed?.normalizedUnit ?? null) || '—'}
                </td>
                {extraCols.map((col) => (
                  <td key={col} className="px-4 py-2 font-mono text-xs text-gray-500 max-w-[150px] truncate" title={p.extra?.[col] || ''}>
                    {p.extra?.[col] || '—'}
                  </td>
                ))}
                <td className="px-4 py-2">
                  <span
                    className="rounded px-2 py-0.5 text-xs font-medium"
                    style={color ? { backgroundColor: color.bg, color: color.fg } : undefined}
                  >
                    {p.lab}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {products.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-gray-400">
          No hay productos para este filtro
        </p>
      )}
    </div>
  )
}

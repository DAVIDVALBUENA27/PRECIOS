'use client'

import { useMemo, useState } from 'react'
import { z } from 'zod'
import { RawProduct, ColMapping } from '@/features/labels/types'
import { autoDetectColumns, rowsToProducts } from '@/features/labels/lib/parseFile'

const colIndex = z.number().int().min(0)

const mappingSchema = z
  .object({
    name: colIndex,
    sku: colIndex,
    price: colIndex,
    lab: colIndex.nullable(),
    content: colIndex.nullable(),
  })
  .refine(
    (m) => {
      const used = [m.name, m.sku, m.price, m.lab, m.content].filter((i) => i !== null)
      return new Set(used).size === used.length
    },
    { message: 'Hay dos campos apuntando a la misma columna del archivo.' }
  )

const FIELDS: { key: keyof ColMapping; label: string; required: boolean; hint?: string }[] = [
  { key: 'name', label: 'Nombre del producto', required: true },
  { key: 'sku', label: 'SKU / Código', required: true },
  { key: 'price', label: 'Precio', required: true },
  { key: 'lab', label: 'Laboratorio / Marca', required: false },
  { key: 'content', label: 'Contenido', required: false, hint: 'Ej: "500 GR", "250 ML". Sin esta columna no se puede mostrar el precio por gramo/mililitro.' },
]

interface ColMapperProps {
  rows: string[][]
  fileName: string
  onConfirm: (products: RawProduct[], mapping: ColMapping) => void
  onBack: () => void
}

type Selection = Record<keyof ColMapping, number | null>

export function ColMapper({ rows, fileName, onConfirm, onBack }: ColMapperProps) {
  const headers = useMemo(() => rows[0].map((h) => String(h).trim()), [rows])

  const [selection, setSelection] = useState<Selection>(() => {
    const detected = autoDetectColumns(headers)
    return {
      name: detected.name ?? null,
      sku: detected.sku ?? null,
      price: detected.price ?? null,
      lab: detected.lab ?? null,
      content: detected.content ?? null,
    }
  })
  const [error, setError] = useState<string | null>(null)

  function sampleValues(idx: number | null): string {
    if (idx === null) return ''
    return rows
      .slice(1, 4)
      .map((r) => String(r[idx] ?? '').trim())
      .filter(Boolean)
      .slice(0, 2)
      .join(' · ')
  }

  function handleConfirm() {
    setError(null)

    const missing = FIELDS.filter((f) => f.required && selection[f.key] === null)
    if (missing.length > 0) {
      setError(`Falta mapear: ${missing.map((f) => f.label).join(', ')}.`)
      return
    }

    const result = mappingSchema.safeParse(selection)
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'El mapeo de columnas no es válido.')
      return
    }

    const products = rowsToProducts(rows, result.data as ColMapping)
    if (products.length === 0) {
      setError('No se encontró ningún producto con las columnas seleccionadas. Revisa el mapeo.')
      return
    }

    onConfirm(products, result.data as ColMapping)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Confirma las columnas</h2>
        <p className="mt-1 text-sm text-gray-500">
          {fileName} · {rows.length - 1} filas. Detectamos las columnas automáticamente; corrígelas si algo no cuadra.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <div key={field.key} className={field.key === 'content' ? 'sm:col-span-2' : ''}>
              <label htmlFor={`col-${field.key}`} className="block text-sm font-medium text-gray-700">
                {field.label}
                {field.required ? <span className="text-red-500"> *</span> : <span className="text-gray-400"> (opcional)</span>}
              </label>
              <select
                id={`col-${field.key}`}
                value={selection[field.key] ?? ''}
                onChange={(e) =>
                  setSelection((s) => ({
                    ...s,
                    [field.key]: e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">— Sin mapear —</option>
                {headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h || `Columna ${i + 1}`}
                  </option>
                ))}
              </select>
              {selection[field.key] !== null && (
                <p className="mt-1 truncate text-xs text-gray-400">{sampleValues(selection[field.key])}</p>
              )}
              {field.hint && <p className="mt-1 text-xs text-gray-500">{field.hint}</p>}
            </div>
          ))}
        </div>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Subir otro archivo
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Confirmar columnas
          </button>
        </div>
      </div>
    </div>
  )
}

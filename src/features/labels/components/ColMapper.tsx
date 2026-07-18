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
  { key: 'content', label: 'Contenido', required: false, hint: 'Ej: "500 GR", "250 ML". Si no mapeas esta columna, intentamos extraerlo del nombre del producto automáticamente.' },
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

    const products = rowsToProducts(rows, result.data as ColMapping, headers)
    if (products.length === 0) {
      setError('No se encontró ningún producto con las columnas seleccionadas. Revisa el mapeo.')
      return
    }

    onConfirm(products, result.data as ColMapping)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Header */}
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
            <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75.125v-3.375c0-.621.504-1.125 1.125-1.125H6m0 0h12m0 0h2.625c.621 0 1.125.504 1.125 1.125v3.375m-15-.125h15M6 16.5V6.75m0 0a1.125 1.125 0 011.125-1.125h9.75A1.125 1.125 0 0118 6.75v9.75" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-900">Confirma las columnas</h2>
        </div>
        <p className="mb-5 text-sm text-slate-500">
          <span className="font-medium text-slate-700">{fileName}</span>
          {' '}· {(rows.length - 1).toLocaleString('es-CO')} filas. Detectamos las columnas automáticamente; corrígelas si algo no cuadra.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <div key={field.key} className={field.key === 'content' ? 'sm:col-span-2' : ''}>
              <label htmlFor={`col-${field.key}`} className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                {field.label}
                {field.required
                  ? <span className="ml-1 text-red-400">*</span>
                  : <span className="ml-1 font-normal normal-case tracking-normal text-slate-400">(opcional)</span>
                }
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
                className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">— Sin mapear —</option>
                {headers
                  .map((h, i) => ({ name: h, index: i }))
                  .filter((col) => col.name !== '')
                  .map((col) => (
                    <option key={col.index} value={col.index}>
                      {col.name}
                    </option>
                  ))}
              </select>
              {selection[field.key] !== null && (
                <p className="mt-1 truncate text-xs text-slate-400">{sampleValues(selection[field.key])}</p>
              )}
              {field.hint && (
                <p className="mt-1 text-xs text-slate-400">{field.hint}</p>
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            ← Subir otro archivo
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Confirmar columnas
          </button>
        </div>
      </div>
    </div>
  )
}

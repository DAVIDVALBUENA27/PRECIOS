'use client'

import { useEffect, useState } from 'react'
import {
  listSnapshots,
  deleteSnapshot,
  type SnapshotSummary,
} from '@/features/labels/services/snapshotService'

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function DaysSince(dateStr: string): string {
  const then = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const diff = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'hoy'
  if (diff === 1) return 'ayer'
  return `hace ${diff} días`
}

export default function AjustesPage() {
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    try {
      const data = await listSnapshots()
      setSnapshots(data)
    } catch {
      // sin sesión
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [])

  async function handleDelete(date: string) {
    setDeleting(date)
    try {
      await deleteSnapshot(date)
      setSnapshots((prev) => prev.filter((s) => s.date !== date))
    } finally {
      setDeleting(null)
      setConfirmDelete(null)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl space-y-8">

        {/* ── Título ── */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ajustes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Administra tu historial de precios y la configuración del negocio.
          </p>
        </div>

        {/* ── Historial de precios ── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">📊 Historial de precios</h2>
              <p className="text-sm text-gray-500">
                Cada vez que subes un archivo, se guarda automáticamente una copia de los precios.
                Esto permite comparar y saber qué subió o bajó en la siguiente carga.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
              Cargando historial…
            </div>
          ) : snapshots.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <p className="text-sm font-medium text-gray-500">Aún no hay historial de precios.</p>
              <p className="mt-1 text-xs text-gray-400">
                Cuando subas tu primer archivo desde el Dashboard, quedará guardado aquí.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Fecha de carga</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Productos</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {snapshots.map((s, i) => (
                    <tr key={s.date} className={i === 0 ? 'bg-green-50' : ''}>
                      <td className="px-4 py-3 text-xs text-gray-400">{snapshots.length - i}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{formatDate(s.date)}</span>
                          <span className="text-xs text-gray-400">{DaysSince(s.date)}</span>
                          {i === 0 && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                              ÚLTIMO
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-semibold text-gray-700">
                        {s.productCount.toLocaleString('es-CO')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {confirmDelete === s.date ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="text-xs text-red-600">¿Eliminar?</span>
                            <button
                              type="button"
                              onClick={() => handleDelete(s.date)}
                              disabled={deleting === s.date}
                              className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              {deleting === s.date ? '…' : 'Sí, eliminar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(null)}
                              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                            >
                              Cancelar
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(s.date)}
                            className="text-xs text-red-400 hover:text-red-600"
                          >
                            Eliminar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-400">
                  💡 El sistema compara cada nueva carga con el <strong>último</strong> snapshot guardado.
                  Eliminar una fecha solo borra ese registro del historial, no afecta el catálogo actual.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ── Cómo funciona ── */}
        <section className="rounded-lg border border-blue-100 bg-blue-50 p-5">
          <h3 className="mb-2 font-semibold text-blue-900">¿Cómo funciona el historial?</h3>
          <ol className="space-y-1.5 text-sm text-blue-800">
            <li>
              <strong>1ª carga:</strong> El sistema guarda los precios actuales como referencia. No hay nada con qué comparar aún.
            </li>
            <li>
              <strong>2ª carga en adelante:</strong> Compara el archivo nuevo con la última carga guardada.
              Los productos que <strong>subieron o bajaron</strong> de precio se marcan automáticamente
              y quedan pre-seleccionados para imprimir.
            </li>
            <li>
              <strong>Un registro por día:</strong> Si subes varios archivos el mismo día, se sobrescribe
              el de ese día con los precios más recientes.
            </li>
          </ol>
        </section>

      </div>
    </div>
  )
}

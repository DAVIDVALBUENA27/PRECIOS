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
    <div className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-3xl space-y-8">

        {/* ── Título ── */}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Historial de precios</h1>
          <p className="mt-1 text-sm text-slate-500">
            Cada vez que subes un archivo, el sistema guarda una copia de los precios para comparar cambios.
          </p>
        </div>

        {/* ── Tabla de historial ── */}
        <section>
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <svg className="h-5 w-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
              <p className="text-sm text-slate-400">Cargando historial…</p>
            </div>
          ) : snapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-8 py-14 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-700">Aún no hay historial</p>
              <p className="mt-1 text-xs text-slate-400">
                Cuando subas tu primer archivo desde el Dashboard, quedará registrado aquí.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">#</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Fecha de carga</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Productos</th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {snapshots.map((s, i) => (
                    <tr
                      key={s.date}
                      className={`transition-colors hover:bg-slate-50/60 ${i === 0 ? 'bg-emerald-50/40' : ''}`}
                    >
                      {/* # */}
                      <td className="px-5 py-3.5 text-xs text-slate-300 tabular-nums">
                        {snapshots.length - i}
                      </td>

                      {/* Fecha */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{formatDate(s.date)}</span>
                          <span className="text-xs text-slate-400">{DaysSince(s.date)}</span>
                          {i === 0 && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              ÚLTIMO
                            </span>
                          )}
                          <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                            s.source === 'local'
                              ? 'bg-slate-100 text-slate-500'
                              : 'bg-violet-50 text-violet-600'
                          }`}>
                            {s.source === 'local' ? 'Local' : 'Nube'}
                          </span>
                        </div>
                      </td>

                      {/* Productos */}
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-mono text-sm font-semibold text-slate-700">
                          {s.productCount.toLocaleString('es-CO')}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-3.5 text-right">
                        {confirmDelete === s.date ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="text-xs text-red-500">¿Eliminar?</span>
                            <button
                              type="button"
                              onClick={() => void handleDelete(s.date)}
                              disabled={deleting === s.date}
                              className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                            >
                              {deleting === s.date ? '…' : 'Sí'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(null)}
                              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                            >
                              No
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(s.date)}
                            className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                          >
                            Eliminar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer */}
              <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
                <p className="text-xs text-slate-400">
                  El sistema compara cada nueva carga con el <strong className="text-slate-500">último</strong> snapshot.
                  Eliminar un registro no afecta el catálogo actual.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ── Cómo funciona ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
              <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-800">¿Cómo funciona el historial?</h3>
          </div>
          <ol className="space-y-3">
            {[
              { n: '1', title: 'Primera carga', desc: 'El sistema guarda los precios actuales como referencia. No hay nada con qué comparar aún.' },
              { n: '2', title: 'Segunda carga en adelante', desc: 'Compara el archivo nuevo con la última carga. Los productos que subieron o bajaron se marcan automáticamente y quedan preseleccionados.' },
              { n: '3', title: 'Un registro por día', desc: 'Si subes varios archivos el mismo día, se sobrescribe el registro de ese día con los precios más recientes.' },
            ].map((item) => (
              <li key={item.n} className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
                  {item.n}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-700">{item.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{item.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

      </div>
    </div>
  )
}

'use client'

import { ChangeGroup, GROUP_LABELS } from '@/features/labels/lib/changeGroups'

interface ChangeFiltersProps {
  counts: Record<ChangeGroup, number>
  /** Grupos activos, en el orden en que se activaron (así se ordenan arriba). */
  active: ChangeGroup[]
  onToggle: (group: ChangeGroup) => void
  onSelectAll: () => void
  onClear: () => void
  onlyActive: boolean
  onOnlyActiveChange: (value: boolean) => void
}

const STYLES: Record<ChangeGroup, { on: string; off: string; icon: string }> = {
  new: {
    on: 'border-green-600 bg-green-600 text-white',
    off: 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100',
    icon: '✦',
  },
  up: {
    on: 'border-red-600 bg-red-600 text-white',
    off: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
    icon: '▲',
  },
  down: {
    on: 'border-blue-600 bg-blue-600 text-white',
    off: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
    icon: '▼',
  },
}

const ORDER: ChangeGroup[] = ['up', 'down', 'new']

/**
 * Botones para subir arriba y marcar de una vez los productos nuevos, los que
 * subieron y los que bajaron. Se pueden combinar: el orden en que se activan
 * es el orden en que quedan arriba y el orden en que se imprimen.
 */
export function ChangeFilters({
  counts, active, onToggle, onSelectAll, onClear, onlyActive, onOnlyActiveChange,
}: ChangeFiltersProps) {
  const total = counts.new + counts.up + counts.down
  if (total === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-500">
        Sin cambios de precio ni productos nuevos respecto a los días anteriores.
      </p>
    )
  }

  return (
    <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Marcar y subir arriba
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {ORDER.filter((g) => counts[g] > 0).map((g) => {
          const pos = active.indexOf(g)
          const isOn = pos !== -1
          return (
            <button
              key={g}
              type="button"
              onClick={() => onToggle(g)}
              aria-pressed={isOn}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                isOn ? `${STYLES[g].on} shadow-sm` : STYLES[g].off
              }`}
            >
              {isOn && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/25 text-[10px]">
                  {pos + 1}
                </span>
              )}
              <span aria-hidden>{STYLES[g].icon}</span>
              {GROUP_LABELS[g]} ({counts[g].toLocaleString('es-CO')})
            </button>
          )
        })}
        <button
          type="button"
          onClick={onSelectAll}
          className="rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-500"
        >
          Todos ({total.toLocaleString('es-CO')})
        </button>
        {active.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="px-2 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-700"
          >
            Quitar selección
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {active.length === 0
            ? 'Toca un grupo para marcarlo y subirlo arriba. Puedes combinarlos.'
            : `Arriba y en la impresión: ${active.map((g, i) => `${i + 1}. ${GROUP_LABELS[g]}`).join(' → ')}`}
        </p>
        {active.length > 0 && (
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => onOnlyActiveChange(e.target.checked)}
              className="accent-blue-600"
            />
            Ver solo estos
          </label>
        )}
      </div>
    </div>
  )
}

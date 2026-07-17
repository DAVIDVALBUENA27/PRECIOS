'use client'

import { LabColor } from '@/features/labels/hooks/useLabColors'

interface LabChipsProps {
  labs: string[]
  labColors: Map<string, LabColor>
  activeLab: string | null
  onSelect: (lab: string | null) => void
}

export function LabChips({ labs, labColors, activeLab, onSelect }: LabChipsProps) {
  if (labs.length <= 1) return null

  const activeColor = activeLab ? labColors.get(activeLab) : null

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <label htmlFor="lab-select" className="text-sm font-semibold text-gray-700">
        Filtrar por Laboratorio:
      </label>
      <div className="relative">
        <select
          id="lab-select"
          value={activeLab || ''}
          onChange={(e) => onSelect(e.target.value || null)}
          style={activeColor ? { borderLeft: `4px solid ${activeColor.fg}` } : undefined}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">— Todos los laboratorios —</option>
          {labs.map((lab) => (
            <option key={lab} value={lab}>
              {lab}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

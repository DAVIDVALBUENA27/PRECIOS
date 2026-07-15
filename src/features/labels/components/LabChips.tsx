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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
          activeLab === null
            ? 'border-gray-900 bg-gray-900 text-white'
            : 'border-gray-300 bg-white text-gray-600 hover:border-gray-500'
        }`}
      >
        Todos
      </button>
      {labs.map((lab) => {
        const color = labColors.get(lab)
        const active = activeLab === lab
        return (
          <button
            key={lab}
            type="button"
            onClick={() => onSelect(active ? null : lab)}
            style={active && color ? { backgroundColor: color.bg, color: color.fg, borderColor: color.fg } : undefined}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              active ? '' : 'border-gray-300 bg-white text-gray-600 hover:border-gray-500'
            }`}
          >
            {lab}
          </button>
        )
      })}
    </div>
  )
}

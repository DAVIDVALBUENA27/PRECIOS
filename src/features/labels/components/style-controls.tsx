'use client'

/**
 * Controles del panel de diseño de la etiqueta.
 * Cada tamaño se ajusta con barra, con − / + o escribiendo el número exacto.
 */

import { useState, type ReactNode } from 'react'

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

function roundTo(v: number, step: number) {
  const decimals = step < 1 ? String(step).split('.')[1]?.length ?? 1 : 0
  return Number((Math.round(v / step) * step).toFixed(decimals))
}

/** − [valor] + con el número editable. */
export function Stepper({
  value, min, max, step, unit, onChange,
}: {
  value: number; min: number; max: number; step: number; unit?: string
  onChange: (v: number) => void
}) {
  const set = (v: number) => onChange(roundTo(clamp(v, min, max), step))
  const btn =
    'flex h-7 w-7 items-center justify-center text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30'
  return (
    <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
      <button type="button" className={btn} onClick={() => set(value - step)} disabled={value <= min} aria-label="Menos">
        −
      </button>
      <label className="flex items-baseline border-x border-slate-200 px-1">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (!Number.isNaN(n)) onChange(n)
          }}
          onBlur={(e) => set(Number(e.target.value) || min)}
          className="w-9 bg-transparent py-1 text-center text-xs font-semibold tabular-nums text-slate-800 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        {unit && <span className="text-[10px] text-slate-400">{unit}</span>}
      </label>
      <button type="button" className={btn} onClick={() => set(value + step)} disabled={value >= max} aria-label="Más">
        +
      </button>
    </div>
  )
}

/** Círculo de color que abre el selector. */
export function Swatch({ value, onChange, title }: { value: string; onChange: (v: string) => void; title?: string }) {
  return (
    <label
      title={title ?? 'Color'}
      className="relative h-7 w-7 shrink-0 cursor-pointer rounded-full border-2 border-white shadow ring-1 ring-slate-200 transition-transform hover:scale-110"
      style={{ backgroundColor: value }}
    >
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
  )
}

/** Una fila de ajuste: nombre, barra, − valor + y color opcional. */
export function SizeRow({
  label, value, min, max, step = 0.5, unit = 'px', color, onSize, onColor,
}: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string
  color?: string
  onSize: (v: number) => void
  onColor?: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">{label}</span>
        <Stepper value={value} min={min} max={max} step={step} unit={unit} onChange={onSize} />
        {color !== undefined && onColor ? <Swatch value={color} onChange={onColor} /> : <span className="w-7" />}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onSize(Number(e.target.value))}
        className="h-1 w-full cursor-pointer accent-blue-600"
        aria-label={label}
      />
    </div>
  )
}

/** Botones de opción excluyente (ej. Carta / Oficio). */
export function Segmented<T extends string>({
  value, options, onChange,
}: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-lg bg-slate-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-all ${
            value === o.value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Sección plegable con ícono y resumen a la derecha. */
export function Section({
  icon, title, hint, children, defaultOpen = false,
}: { icon: string; title: string; hint?: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-slate-50"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-sm" aria-hidden>
          {icon}
        </span>
        <span className="flex-1 text-sm font-semibold text-slate-800">{title}</span>
        {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="space-y-4 px-4 pb-5 pt-1">{children}</div>}
    </div>
  )
}

/** Subtítulo pequeño dentro de una sección. */
export function SubLabel({ children }: { children: ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{children}</p>
}

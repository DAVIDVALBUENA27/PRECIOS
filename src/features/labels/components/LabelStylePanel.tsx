'use client'

/**
 * Panel de personalización visual de la etiqueta.
 * Controla tamaños de fuente, color de fondo, color y grosor de borde.
 */

import { useState } from 'react'

export interface LabelStyle {
  // Fondo y borde
  bgColor: string
  borderColor: string
  borderWidth: number   // pt
  borderRadius: number  // mm
  // Fuentes (px)
  nameFontSize: number
  priceFontSize: number
  skuFontSize: number
  labFontSize: number
  // Colores de texto
  nameColor: string
  priceColor: string
  skuColor: string
}

export const DEFAULT_STYLE: LabelStyle = {
  bgColor: '#ffffff',
  borderColor: '#999999',
  borderWidth: 0.5,
  borderRadius: 0,
  nameFontSize: 9.5,
  priceFontSize: 26,
  skuFontSize: 7,
  labFontSize: 7,
  nameColor: '#000000',
  priceColor: '#000000',
  skuColor: '#555555',
}

interface Props {
  style: LabelStyle
  onChange: (s: LabelStyle) => void
}

function Slider({
  label, value, min, max, step = 0.5, unit = 'px',
  onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string
  onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
        {label} <span className="font-normal text-gray-400">{value}{unit}</span>
      </span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-blue-600 h-1.5 w-full cursor-pointer"
      />
    </label>
  )
}

function ColorPick({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer">
      <input
        type="color" value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-8 cursor-pointer rounded border border-gray-200 p-0"
      />
      <span className="text-[11px] text-gray-600">{label}</span>
    </label>
  )
}

export function LabelStylePanel({ style, onChange }: Props) {
  const [open, setOpen] = useState(false)

  function set<K extends keyof LabelStyle>(key: K, val: LabelStyle[K]) {
    onChange({ ...style, [key]: val })
  }

  function reset() {
    onChange(DEFAULT_STYLE)
  }

  const presetColors = ['#ffffff', '#FFFDE7', '#FFF9C4', '#E3F2FD', '#FCE4EC', '#F3E5F5', '#E8F5E9', '#FFF3E0']

  return (
    <div className="rounded-lg border border-gray-200 bg-white print:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">🎨 Diseño del Ticket</span>
          <span className="text-[10px] text-gray-400">tamaños · colores · borde · fondo</span>
        </div>
        <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-5">

          {/* ── Fondo ── */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Fondo del ticket</p>
            <div className="flex flex-wrap gap-2">
              {presetColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => set('bgColor', c)}
                  className={`h-7 w-7 rounded border-2 transition-transform hover:scale-110 ${
                    style.bgColor === c ? 'border-blue-500 scale-110' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <ColorPick label="Personalizado" value={style.bgColor} onChange={(v) => set('bgColor', v)} />
            </div>
          </div>

          {/* ── Borde ── */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Borde</p>
            <div className="flex flex-wrap gap-4 items-end">
              <ColorPick label="Color" value={style.borderColor} onChange={(v) => set('borderColor', v)} />
              <div className="w-40">
                <Slider label="Grosor" value={style.borderWidth} min={0} max={3} step={0.25} unit="pt"
                  onChange={(v) => set('borderWidth', v)} />
              </div>
              <div className="w-40">
                <Slider label="Esquinas" value={style.borderRadius} min={0} max={5} step={0.5} unit="mm"
                  onChange={(v) => set('borderRadius', v)} />
              </div>
            </div>
          </div>

          {/* ── Tamaños de fuente ── */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Tamaño de fuentes</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              <Slider label="Nombre" value={style.nameFontSize} min={7} max={14} step={0.5}
                onChange={(v) => set('nameFontSize', v)} />
              <Slider label="Precio" value={style.priceFontSize} min={16} max={40} step={1}
                onChange={(v) => set('priceFontSize', v)} />
              <Slider label="SKU / Barras" value={style.skuFontSize} min={5} max={12} step={0.5}
                onChange={(v) => set('skuFontSize', v)} />
              <Slider label="Laboratorio" value={style.labFontSize} min={5} max={12} step={0.5}
                onChange={(v) => set('labFontSize', v)} />
            </div>
          </div>

          {/* ── Colores de texto ── */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Color de texto</p>
            <div className="flex flex-wrap gap-5">
              <ColorPick label="Nombre" value={style.nameColor} onChange={(v) => set('nameColor', v)} />
              <ColorPick label="Precio" value={style.priceColor} onChange={(v) => set('priceColor', v)} />
              <ColorPick label="SKU / Barras" value={style.skuColor} onChange={(v) => set('skuColor', v)} />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={reset}
              className="text-xs text-gray-400 hover:text-gray-700 underline"
            >
              Restablecer por defecto
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

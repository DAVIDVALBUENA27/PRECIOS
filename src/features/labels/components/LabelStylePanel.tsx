'use client'

/**
 * Panel de personalización visual de la etiqueta.
 * Controla: tamaño (mm), papel, fuentes, colores, borde, fondo y plantillas guardadas.
 */

import { useState, useEffect } from 'react'
import {
  listTemplates,
  saveTemplate,
  deleteTemplate,
  type LabelTemplate,
} from '@/features/labels/services/templateService'

export type PaperSize = 'carta' | 'oficio'

export interface LabelStyle {
  // Papel y tamaño
  paper: PaperSize
  labelWidth: number   // mm  (50–100)
  labelHeight: number  // mm  (30–60)
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
  extraFontSize: number  // columnas dinámicas CSV
  // Colores de texto
  nameColor: string
  priceColor: string
  skuColor: string
  extraColor: string
}

export const DEFAULT_STYLE: LabelStyle = {
  paper: 'carta',
  labelWidth: 80,
  labelHeight: 40,
  bgColor: '#ffffff',
  borderColor: '#999999',
  borderWidth: 0.5,
  borderRadius: 0,
  nameFontSize: 9.5,
  priceFontSize: 26,
  skuFontSize: 7,
  labFontSize: 7,
  extraFontSize: 6,
  nameColor: '#000000',
  priceColor: '#000000',
  skuColor: '#555555',
  extraColor: '#666666',
}

// ──────────────────────────────────────────────────────────────
// Sub-componentes de control
// ──────────────────────────────────────────────────────────────

function Slider({
  label, value, min, max, step = 0.5, unit = 'px', onChange,
}: {
  label: string; value: number; min: number; max: number
  step?: number; unit?: string; onChange: (v: number) => void
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

// ──────────────────────────────────────────────────────────────
// Panel principal
// ──────────────────────────────────────────────────────────────

interface Props {
  style: LabelStyle
  onChange: (s: LabelStyle) => void
}

export function LabelStylePanel({ style, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<LabelTemplate[]>([])
  const [saveName, setSaveName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  // Cargar plantillas al abrir el panel
  useEffect(() => {
    if (open) setTemplates(listTemplates())
  }, [open])

  function set<K extends keyof LabelStyle>(key: K, val: LabelStyle[K]) {
    onChange({ ...style, [key]: val })
  }

  function handleSaveTemplate() {
    if (!saveName.trim()) return
    saveTemplate(saveName, style)
    setTemplates(listTemplates())
    setSaveName('')
    setShowSaveInput(false)
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2000)
  }

  function handleLoadTemplate(t: LabelTemplate) {
    onChange(t.style)
  }

  function handleDeleteTemplate(id: string) {
    deleteTemplate(id)
    setTemplates(listTemplates())
  }

  const presetColors = [
    '#ffffff', '#FFFDE7', '#FFF9C4', '#FFCC00',
    '#E3F2FD', '#FCE4EC', '#F3E5F5', '#E8F5E9',
  ]

  return (
    <div className="rounded-lg border border-gray-200 bg-white print:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">🎨 Diseño del Ticket</span>
          <span className="text-[10px] text-gray-400">
            {style.labelWidth}×{style.labelHeight}mm · tamaños · colores · borde · fondo
          </span>
        </div>
        <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-5">

          {/* ── Plantillas ── */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Plantillas guardadas</p>
            <div className="flex flex-wrap items-center gap-2">
              {templates.length === 0 ? (
                <span className="text-xs text-gray-400 italic">Sin plantillas guardadas aún.</span>
              ) : (
                templates.map((t) => (
                  <span key={t.id} className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 pl-2.5 pr-1 py-1">
                    <button
                      type="button"
                      onClick={() => handleLoadTemplate(t)}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                    >
                      {t.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(t.id)}
                      title="Eliminar plantilla"
                      className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-blue-400 hover:bg-blue-200 hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
            <div className="mt-2 flex items-center gap-2">
              {showSaveInput ? (
                <>
                  <input
                    autoFocus
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTemplate(); if (e.key === 'Escape') setShowSaveInput(false) }}
                    placeholder="Nombre de la plantilla…"
                    maxLength={40}
                    className="rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 w-48"
                  />
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    className="rounded bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSaveInput(false)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSaveInput(true)}
                  className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Guardar diseño actual como plantilla
                </button>
              )}
              {savedMsg && (
                <span className="text-xs font-semibold text-emerald-600">✓ Guardado</span>
              )}
            </div>
          </div>

          {/* ── Papel ── */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Tamaño de papel</p>
            <div className="flex gap-2">
              {(['carta', 'oficio'] as PaperSize[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => set('paper', size)}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors capitalize ${
                    style.paper === size
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-gray-500'
                  }`}
                >
                  {size === 'carta' ? 'Carta (Letter)' : 'Oficio'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Tamaño de etiqueta ── */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Tamaño de etiqueta</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 max-w-sm">
              <Slider
                label="Ancho" value={style.labelWidth} min={50} max={100} step={5} unit="mm"
                onChange={(v) => set('labelWidth', v)}
              />
              <Slider
                label="Alto" value={style.labelHeight} min={30} max={60} step={5} unit="mm"
                onChange={(v) => set('labelHeight', v)}
              />
            </div>
            <p className="mt-1 text-[10px] text-gray-400">
              El grid se recalcula automáticamente para llenar la hoja.
            </p>
          </div>

          {/* ── Fondo ── */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Fondo del ticket</p>
            <div className="flex flex-wrap gap-2 items-center">
              {presetColors.map((c) => (
                <button
                  key={c} type="button" title={c}
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
              <div className="w-36">
                <Slider label="Grosor" value={style.borderWidth} min={0} max={3} step={0.25} unit="pt"
                  onChange={(v) => set('borderWidth', v)} />
              </div>
              <div className="w-36">
                <Slider label="Esquinas" value={style.borderRadius} min={0} max={5} step={0.5} unit="mm"
                  onChange={(v) => set('borderRadius', v)} />
              </div>
            </div>
          </div>

          {/* ── Tamaños de fuente ── */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Tamaño de fuentes</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
              <Slider label="Nombre" value={style.nameFontSize} min={7} max={14} step={0.5}
                onChange={(v) => set('nameFontSize', v)} />
              <Slider label="Precio" value={style.priceFontSize} min={16} max={40} step={1}
                onChange={(v) => set('priceFontSize', v)} />
              <Slider label="SKU / Barras" value={style.skuFontSize} min={5} max={12} step={0.5}
                onChange={(v) => set('skuFontSize', v)} />
              <Slider label="Laboratorio" value={style.labFontSize} min={5} max={12} step={0.5}
                onChange={(v) => set('labFontSize', v)} />
              <Slider label="Campos extra" value={style.extraFontSize} min={4} max={11} step={0.5}
                onChange={(v) => set('extraFontSize', v)} />
            </div>
          </div>

          {/* ── Colores de texto ── */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Color de texto</p>
            <div className="flex flex-wrap gap-5">
              <ColorPick label="Nombre" value={style.nameColor} onChange={(v) => set('nameColor', v)} />
              <ColorPick label="Precio" value={style.priceColor} onChange={(v) => set('priceColor', v)} />
              <ColorPick label="SKU / Barras" value={style.skuColor} onChange={(v) => set('skuColor', v)} />
              <ColorPick label="Campos extra" value={style.extraColor} onChange={(v) => set('extraColor', v)} />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onChange(DEFAULT_STYLE)}
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

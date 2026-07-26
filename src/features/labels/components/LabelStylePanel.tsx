'use client'

/**
 * Panel de personalización visual de la etiqueta.
 * Pensado como barra lateral: secciones colapsables, controles compactos.
 * Controla papel, tamaño, logo, fondo, borde, textos y columnas del CSV.
 */

import { useState, useEffect, type ReactNode } from 'react'
import {
  listTemplates,
  saveTemplate,
  deleteTemplate,
  type LabelTemplate,
} from '@/features/labels/services/templateService'
import {
  DEFAULT_STYLE,
  normalizeStyle,
  resolveExtraField,
  type LabelStyle,
  type PaperSize,
} from '@/features/labels/types/labelStyle'

export { DEFAULT_STYLE }
export type { LabelStyle, PaperSize }

// ──────────────────────────────────────────────────────────────
// Controles básicos
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
}: { label?: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer">
      <input
        type="color" value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-8 shrink-0 cursor-pointer rounded border border-gray-200 p-0"
      />
      {label && <span className="text-[11px] text-gray-600">{label}</span>}
    </label>
  )
}

/** Fila de texto: tamaño + color en una sola línea. */
function TextRow({
  label, size, min, max, color, onSize, onColor,
}: {
  label: string; size: number; min: number; max: number
  color?: string
  onSize: (v: number) => void
  onColor?: (v: string) => void
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1 min-w-0">
        <Slider label={label} value={size} min={min} max={max} step={0.5} onChange={onSize} />
      </div>
      {color !== undefined && onColor && <ColorPick value={color} onChange={onColor} />}
    </div>
  )
}

function Section({
  title, hint, children, defaultOpen = false,
}: { title: string; hint?: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50"
      >
        <span className="text-xs font-bold uppercase tracking-wider text-gray-700">{title}</span>
        <span className="flex items-center gap-2">
          {hint && <span className="text-[10px] font-normal text-gray-400">{hint}</span>}
          <span className="text-[10px] text-gray-400">{open ? '▲' : '▼'}</span>
        </span>
      </button>
      {open && <div className="px-4 pb-4 pt-1 space-y-3">{children}</div>}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Panel principal
// ──────────────────────────────────────────────────────────────

interface Props {
  style: LabelStyle
  onChange: (s: LabelStyle) => void
  /** Columnas dinámicas detectadas en el CSV. */
  extraFields?: string[]
  /** El negocio tiene logo configurado. */
  hasLogo?: boolean
}

const LOGO_PRESETS: { label: string; x: number; y: number }[] = [
  { label: '↖', x: 8, y: 12 },
  { label: '↑', x: 50, y: 12 },
  { label: '↗', x: 92, y: 12 },
  { label: '←', x: 8, y: 50 },
  { label: '✛', x: 50, y: 50 },
  { label: '→', x: 92, y: 50 },
  { label: '↙', x: 8, y: 88 },
  { label: '↓', x: 50, y: 88 },
  { label: '↘', x: 92, y: 88 },
]

export function LabelStylePanel({ style, onChange, extraFields = [], hasLogo = false }: Props) {
  const [templates, setTemplates] = useState<LabelTemplate[]>([])
  const [saveName, setSaveName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  useEffect(() => setTemplates(listTemplates()), [])

  function set<K extends keyof LabelStyle>(key: K, val: LabelStyle[K]) {
    onChange({ ...style, [key]: val })
  }

  function setExtra(field: string, patch: { size?: number; color?: string; showLabel?: boolean }) {
    onChange({
      ...style,
      extraOverrides: {
        ...style.extraOverrides,
        [field]: { ...style.extraOverrides[field], ...patch },
      },
    })
  }

  function resetExtra(field: string) {
    const next = { ...style.extraOverrides }
    delete next[field]
    onChange({ ...style, extraOverrides: next })
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

  const presetColors = [
    '#ffffff', '#FFFDE7', '#FFF9C4', '#FFCC00',
    '#E3F2FD', '#FCE4EC', '#F3E5F5', '#E8F5E9',
  ]

  return (
    <div className="rounded-lg border border-gray-200 bg-white print:hidden">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <span className="text-sm font-semibold text-gray-900">🎨 Diseño del ticket</span>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_STYLE)}
          className="text-[11px] text-gray-400 underline hover:text-gray-700"
        >
          Restablecer
        </button>
      </div>

      {/* ── Plantillas ── */}
      <Section title="Plantillas" hint={`${templates.length} guardada${templates.length === 1 ? '' : 's'}`}>
        <div className="flex flex-wrap items-center gap-2">
          {templates.length === 0 ? (
            <span className="text-xs italic text-gray-400">Sin plantillas guardadas aún.</span>
          ) : (
            templates.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 py-1 pl-2.5 pr-1">
                <button
                  type="button"
                  onClick={() => onChange(normalizeStyle(t.style))}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                >
                  {t.name}
                </button>
                <button
                  type="button"
                  onClick={() => { deleteTemplate(t.id); setTemplates(listTemplates()) }}
                  title="Eliminar plantilla"
                  className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-blue-400 hover:bg-blue-200 hover:text-red-600"
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showSaveInput ? (
            <>
              <input
                autoFocus
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTemplate()
                  if (e.key === 'Escape') setShowSaveInput(false)
                }}
                placeholder="Nombre de la plantilla…"
                maxLength={40}
                className="w-40 rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
              />
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="rounded bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Guardar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowSaveInput(true)}
              className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600"
            >
              + Guardar diseño actual
            </button>
          )}
          {savedMsg && <span className="text-xs font-semibold text-emerald-600">✓ Guardado</span>}
        </div>
      </Section>

      {/* ── Papel y tamaño ── */}
      <Section title="Papel y tamaño" hint={`${style.labelWidth}×${style.labelHeight}mm`} defaultOpen>
        <div className="flex gap-2">
          {(['carta', 'oficio'] as PaperSize[]).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => set('paper', size)}
              className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium capitalize transition-colors ${
                style.paper === size
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-gray-500'
              }`}
            >
              {size === 'carta' ? 'Carta' : 'Oficio'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Slider label="Ancho" value={style.labelWidth} min={50} max={100} step={5} unit="mm"
            onChange={(v) => set('labelWidth', v)} />
          <Slider label="Alto" value={style.labelHeight} min={30} max={60} step={5} unit="mm"
            onChange={(v) => set('labelHeight', v)} />
        </div>
        <p className="text-[10px] text-gray-400">El grid se recalcula para llenar la hoja.</p>
      </Section>

      {/* ── Logo ── */}
      {hasLogo && (
        <Section title="Logo del negocio" hint={`${style.logoSize}mm`} defaultOpen>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Slider label="Tamaño" value={style.logoSize} min={3} max={35} step={0.5} unit="mm"
              onChange={(v) => set('logoSize', v)} />
            <Slider label="Opacidad" value={Math.round(style.logoOpacity * 100)} min={5} max={100} step={5} unit="%"
              onChange={(v) => set('logoOpacity', v / 100)} />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600">Posición</p>
            <div className="grid w-24 grid-cols-3 gap-1">
              {LOGO_PRESETS.map((pos) => {
                const active = style.logoX === pos.x && style.logoY === pos.y
                return (
                  <button
                    key={pos.label}
                    type="button"
                    title={`Mover el logo (${pos.x}%, ${pos.y}%)`}
                    onClick={() => onChange({ ...style, logoX: pos.x, logoY: pos.y })}
                    className={`flex h-7 items-center justify-center rounded border text-xs transition-colors ${
                      active
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-400 hover:border-blue-400 hover:text-blue-600'
                    }`}
                  >
                    {pos.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Slider label="Ajuste ←→" value={style.logoX} min={0} max={100} step={1} unit="%"
              onChange={(v) => set('logoX', v)} />
            <Slider label="Ajuste ↑↓" value={style.logoY} min={0} max={100} step={1} unit="%"
              onChange={(v) => set('logoY', v)} />
          </div>
          <p className="text-[10px] text-gray-400">
            Con opacidad baja y el logo al centro queda como marca de agua detrás del precio.
          </p>
        </Section>
      )}

      {/* ── Fondo y borde ── */}
      <Section title="Fondo y borde">
        <div className="flex flex-wrap items-center gap-2">
          {presetColors.map((c) => (
            <button
              key={c} type="button" title={c}
              onClick={() => set('bgColor', c)}
              className={`h-6 w-6 rounded border-2 transition-transform hover:scale-110 ${
                style.bgColor === c ? 'scale-110 border-blue-500' : 'border-gray-300'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <ColorPick label="Fondo" value={style.bgColor} onChange={(v) => set('bgColor', v)} />
        </div>
        <ColorPick label="Color del borde" value={style.borderColor} onChange={(v) => set('borderColor', v)} />
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Slider label="Grosor" value={style.borderWidth} min={0} max={3} step={0.25} unit="pt"
            onChange={(v) => set('borderWidth', v)} />
          <Slider label="Esquinas" value={style.borderRadius} min={0} max={5} step={0.5} unit="mm"
            onChange={(v) => set('borderRadius', v)} />
        </div>
      </Section>

      {/* ── Textos ── */}
      <Section title="Textos de la etiqueta" defaultOpen>
        <TextRow label="Nombre" size={style.nameFontSize} min={6} max={18}
          color={style.nameColor}
          onSize={(v) => set('nameFontSize', v)} onColor={(v) => set('nameColor', v)} />
        <TextRow label="Precio" size={style.priceFontSize} min={12} max={48}
          color={style.priceColor}
          onSize={(v) => set('priceFontSize', v)} onColor={(v) => set('priceColor', v)} />
        <TextRow label="Precio por unidad" size={style.unitPriceFontSize} min={4} max={16}
          color={style.unitPriceColor}
          onSize={(v) => set('unitPriceFontSize', v)} onColor={(v) => set('unitPriceColor', v)} />
        <TextRow label="SKU / Barras" size={style.skuFontSize} min={4} max={14}
          color={style.skuColor}
          onSize={(v) => set('skuFontSize', v)} onColor={(v) => set('skuColor', v)} />
        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <Slider label="Laboratorio" value={style.labFontSize} min={4} max={14} step={0.5}
              onChange={(v) => set('labFontSize', v)} />
          </div>
          {style.labColorMode === 'custom' && (
            <ColorPick value={style.labColor} onChange={(v) => set('labColor', v)} />
          )}
        </div>
        <label className="flex items-center gap-2 text-[11px] text-gray-600">
          <input
            type="checkbox"
            checked={style.labColorMode === 'auto'}
            onChange={(e) => set('labColorMode', e.target.checked ? 'auto' : 'custom')}
            className="accent-blue-600"
          />
          Color del laboratorio automático (uno por laboratorio)
        </label>
        <TextRow label="Cambio de precio ▲▼" size={style.changeFontSize} min={4} max={12}
          onSize={(v) => set('changeFontSize', v)} />
        <TextRow label="Pie: negocio y NIT" size={style.footerFontSize} min={4} max={12}
          color={style.footerColor}
          onSize={(v) => set('footerFontSize', v)} onColor={(v) => set('footerColor', v)} />
      </Section>

      {/* ── Columnas del CSV ── */}
      <Section
        title="Columnas de tu archivo"
        hint={extraFields.length ? `${extraFields.length} detectada${extraFields.length === 1 ? '' : 's'}` : 'ninguna'}
      >
        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <Slider label="Todas por defecto" value={style.extraFontSize} min={4} max={12} step={0.5}
              onChange={(v) => set('extraFontSize', v)} />
          </div>
          <ColorPick value={style.extraColor} onChange={(v) => set('extraColor', v)} />
        </div>

        {extraFields.length === 0 ? (
          <p className="text-[11px] italic text-gray-400">
            Si tu archivo trae columnas propias (inventario, ubicación, proveedor…), aquí podrás
            darle a cada una su tamaño y color.
          </p>
        ) : (
          <div className="space-y-3 border-t border-gray-100 pt-3">
            {extraFields.map((field) => {
              const cfg = resolveExtraField(style, field)
              const custom = Boolean(style.extraOverrides[field])
              return (
                <div key={field} className="rounded-md border border-gray-100 bg-gray-50 p-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate text-[11px] font-semibold text-gray-700">{field}</span>
                    {custom && (
                      <button
                        type="button"
                        onClick={() => resetExtra(field)}
                        className="shrink-0 text-[10px] text-gray-400 underline hover:text-gray-700"
                      >
                        usar general
                      </button>
                    )}
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1 min-w-0">
                      <Slider label="Tamaño" value={cfg.size} min={4} max={14} step={0.5}
                        onChange={(v) => setExtra(field, { size: v })} />
                    </div>
                    <ColorPick value={cfg.color} onChange={(v) => setExtra(field, { color: v })} />
                  </div>
                  <label className="mt-1 flex items-center gap-2 text-[10px] text-gray-600">
                    <input
                      type="checkbox"
                      checked={cfg.showLabel}
                      onChange={(e) => setExtra(field, { showLabel: e.target.checked })}
                      className="accent-blue-600"
                    />
                    Mostrar el nombre de la columna
                  </label>
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}

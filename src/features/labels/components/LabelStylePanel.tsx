'use client'

/**
 * Panel de diseño de la etiqueta (barra lateral de la vista de impresión).
 * Orden pensado para el uso diario: tamaño → textos → columnas del archivo →
 * logo → fondo → plantillas. Cada tamaño se ajusta con barra, − / + o
 * escribiendo el número.
 */

import { useState, useEffect } from 'react'
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
  orderExtraFields,
  type LabelStyle,
  type PaperSize,
} from '@/features/labels/types/labelStyle'
import { Section, Segmented, SizeRow, Stepper, Swatch, SubLabel } from './style-controls'

export { DEFAULT_STYLE }
export type { LabelStyle, PaperSize }

interface Props {
  style: LabelStyle
  onChange: (s: LabelStyle) => void
  /** Columnas del archivo que se están mostrando en la etiqueta. */
  extraFields?: string[]
  /** El negocio tiene logo configurado y visible. */
  hasLogo?: boolean
  /** Etiquetas que caben en una hoja con el tamaño actual. */
  perSheet?: number
}

const LOGO_PRESETS = [
  { label: '↖', x: 8, y: 12 }, { label: '↑', x: 50, y: 12 }, { label: '↗', x: 92, y: 12 },
  { label: '←', x: 8, y: 50 }, { label: '•', x: 50, y: 50 }, { label: '→', x: 92, y: 50 },
  { label: '↙', x: 8, y: 88 }, { label: '↓', x: 50, y: 88 }, { label: '↘', x: 92, y: 88 },
]

const BG_PRESETS = ['#ffffff', '#FFFDE7', '#FFF9C4', '#FFCC00', '#E3F2FD', '#FCE4EC', '#F3E5F5', '#E8F5E9']

/** Todos los textos con sus límites, para el botón A− / A+. */
const FONT_LIMITS: { key: keyof LabelStyle; min: number; max: number }[] = [
  { key: 'nameFontSize', min: 6, max: 18 },
  { key: 'priceFontSize', min: 12, max: 48 },
  { key: 'unitPriceFontSize', min: 4, max: 16 },
  { key: 'skuFontSize', min: 4, max: 14 },
  { key: 'labFontSize', min: 4, max: 14 },
  { key: 'extraFontSize', min: 4, max: 14 },
  { key: 'changeFontSize', min: 4, max: 12 },
  { key: 'footerFontSize', min: 4, max: 12 },
]

const half = (v: number) => Math.round(v * 2) / 2

export function LabelStylePanel({ style, onChange, extraFields = [], hasLogo = false, perSheet }: Props) {
  const [templates, setTemplates] = useState<LabelTemplate[]>([])
  const [saveName, setSaveName] = useState('')
  const [savedMsg, setSavedMsg] = useState(false)

  useEffect(() => setTemplates(listTemplates()), [])

  function set<K extends keyof LabelStyle>(key: K, val: LabelStyle[K]) {
    onChange({ ...style, [key]: val })
  }

  function setExtra(field: string, patch: { size?: number; color?: string; showLabel?: boolean }) {
    onChange({
      ...style,
      extraOverrides: { ...style.extraOverrides, [field]: { ...style.extraOverrides[field], ...patch } },
    })
  }

  /** Agranda o achica todos los textos a la vez, manteniendo proporciones. */
  function scaleText(factor: number) {
    const next = { ...style }
    for (const { key, min, max } of FONT_LIMITS) {
      const v = style[key] as number
      ;(next[key] as number) = Math.min(max, Math.max(min, half(v * factor)))
    }
    next.extraOverrides = Object.fromEntries(
      Object.entries(style.extraOverrides).map(([f, ov]) => [
        f, ov.size != null ? { ...ov, size: Math.min(14, Math.max(4, half(ov.size * factor))) } : ov,
      ]),
    )
    onChange(next)
  }

  /** Sube o baja una columna del archivo en la etiqueta. */
  function moveExtra(field: string, dir: -1 | 1) {
    const order = orderExtraFields(extraFields, style)
    const i = order.indexOf(field)
    const j = i + dir
    if (i < 0 || j < 0 || j >= order.length) return
    ;[order[i], order[j]] = [order[j], order[i]]
    set('extraOrder', order)
  }

  function handleSaveTemplate() {
    if (!saveName.trim()) return
    saveTemplate(saveName, style)
    setTemplates(listTemplates())
    setSaveName('')
    setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2000)
  }

  const orderedExtras = orderExtraFields(extraFields, style)

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
        <div>
          <p className="text-sm font-bold text-slate-900">Diseño de la etiqueta</p>
          <p className="text-[11px] text-slate-400">Los cambios se ven al instante y se recuerdan.</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_STYLE)}
          className="rounded-lg px-2 py-1 text-[11px] font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          Restablecer
        </button>
      </div>

      {/* ── Tamaño ── */}
      <Section icon="📐" title="Hoja" hint={style.paper === 'carta' ? 'Carta' : 'Oficio'}>
        <Segmented<PaperSize>
          value={style.paper}
          options={[{ value: 'carta', label: 'Hoja carta' }, { value: 'oficio', label: 'Hoja oficio' }]}
          onChange={(v) => set('paper', v)}
        />
        {perSheet !== undefined && (
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
            Etiqueta estándar de <strong>8 × 4 cm</strong>. Caben <strong>{perSheet}</strong> por hoja.
          </p>
        )}
      </Section>

      {/* ── Textos ── */}
      <Section icon="🔤" title="Textos" hint={`Precio ${style.priceFontSize}px`} defaultOpen>
        <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
          <span className="text-xs font-medium text-slate-600">Todo el texto</span>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => scaleText(0.9)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 hover:border-blue-400">
              A−
            </button>
            <button type="button" onClick={() => scaleText(1.1)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm font-bold text-slate-600 hover:border-blue-400">
              A+
            </button>
          </div>
        </div>
        <SizeRow label="Nombre del producto" value={style.nameFontSize} min={6} max={18}
          color={style.nameColor} onSize={(v) => set('nameFontSize', v)} onColor={(v) => set('nameColor', v)} />
        <SizeRow label="Precio" value={style.priceFontSize} min={12} max={48}
          color={style.priceColor} onSize={(v) => set('priceFontSize', v)} onColor={(v) => set('priceColor', v)} />
        <SizeRow label="Precio por unidad" value={style.unitPriceFontSize} min={4} max={16}
          color={style.unitPriceColor} onSize={(v) => set('unitPriceFontSize', v)} onColor={(v) => set('unitPriceColor', v)} />
        <SizeRow label="SKU y código de barras" value={style.skuFontSize} min={4} max={14}
          color={style.skuColor} onSize={(v) => set('skuFontSize', v)} onColor={(v) => set('skuColor', v)} />
        <SizeRow label="Laboratorio" value={style.labFontSize} min={4} max={14}
          color={style.labColorMode === 'custom' ? style.labColor : undefined}
          onSize={(v) => set('labFontSize', v)} onColor={(v) => set('labColor', v)} />
        <label className="-mt-2 flex items-center gap-2 text-[11px] text-slate-500">
          <input
            type="checkbox"
            checked={style.labColorMode === 'auto'}
            onChange={(e) => set('labColorMode', e.target.checked ? 'auto' : 'custom')}
            className="accent-blue-600"
          />
          Un color distinto por laboratorio
        </label>
        <SizeRow label="Cambio de precio ▲▼" value={style.changeFontSize} min={4} max={12}
          onSize={(v) => set('changeFontSize', v)} />
        <SizeRow label="Pie: negocio y NIT" value={style.footerFontSize} min={4} max={12}
          color={style.footerColor} onSize={(v) => set('footerFontSize', v)} onColor={(v) => set('footerColor', v)} />
      </Section>

      {/* ── Columnas del archivo ── */}
      <Section icon="📋" title="Columnas del archivo"
        hint={orderedExtras.length ? `${orderedExtras.length} en la etiqueta` : 'ninguna'} defaultOpen>
        {orderedExtras.length === 0 ? (
          <p className="text-xs text-slate-400">
            Marca en «Qué mostrar» las columnas de tu archivo (ubicación, código producto,
            inventario…) que quieres en la etiqueta.
          </p>
        ) : (
          <>
            <Segmented<'stacked' | 'inline'>
              value={style.extraLayout}
              options={[{ value: 'stacked', label: 'Una debajo de otra' }, { value: 'inline', label: 'En una línea' }]}
              onChange={(v) => set('extraLayout', v)}
            />
            <div className="space-y-2">
              <SubLabel>Orden en la etiqueta (de arriba a abajo)</SubLabel>
              {orderedExtras.map((field, i) => {
                const cfg = resolveExtraField(style, field)
                return (
                  <div key={field} className="space-y-2 rounded-xl border border-slate-200 p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">{field}</span>
                      <button type="button" onClick={() => moveExtra(field, -1)} disabled={i === 0}
                        aria-label={`Subir ${field}`}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-25">
                        ▲
                      </button>
                      <button type="button" onClick={() => moveExtra(field, 1)} disabled={i === orderedExtras.length - 1}
                        aria-label={`Bajar ${field}`}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-25">
                        ▼
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex flex-1 items-center gap-1.5 text-[11px] text-slate-500">
                        <input
                          type="checkbox"
                          checked={cfg.showLabel}
                          onChange={(e) => setExtra(field, { showLabel: e.target.checked })}
                          className="accent-blue-600"
                        />
                        Con título
                      </label>
                      <Stepper value={cfg.size} min={4} max={14} step={0.5} unit="px"
                        onChange={(v) => setExtra(field, { size: v })} />
                      <Swatch value={cfg.color} onChange={(v) => setExtra(field, { color: v })} />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Section>

      {/* ── Logo ── */}
      {hasLogo && (
        <Section icon="🏷️" title="Logo del negocio" hint={`${style.logoSize} mm`}>
          <SizeRow label="Tamaño" value={style.logoSize} min={3} max={35} step={0.5} unit="mm"
            onSize={(v) => set('logoSize', v)} />
          <SizeRow label="Opacidad" value={Math.round(style.logoOpacity * 100)} min={5} max={100} step={5} unit="%"
            onSize={(v) => set('logoOpacity', v / 100)} />
          <div className="flex items-start gap-4">
            <div>
              <SubLabel>Posición</SubLabel>
              <div className="mt-1.5 grid w-24 grid-cols-3 gap-1">
                {LOGO_PRESETS.map((pos) => {
                  const on = style.logoX === pos.x && style.logoY === pos.y
                  return (
                    <button key={pos.label} type="button"
                      onClick={() => onChange({ ...style, logoX: pos.x, logoY: pos.y })}
                      className={`flex h-7 items-center justify-center rounded-md border text-xs transition-colors ${
                        on ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-400 hover:border-blue-400'
                      }`}>
                      {pos.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <p className="flex-1 pt-5 text-[11px] leading-snug text-slate-400">
              Con opacidad baja y el logo al centro queda como marca de agua detrás del precio.
            </p>
          </div>
        </Section>
      )}

      {/* ── Fondo y borde ── */}
      <Section icon="🎨" title="Fondo y borde">
        <div className="flex flex-wrap items-center gap-2">
          {BG_PRESETS.map((c) => (
            <button key={c} type="button" title={c} onClick={() => set('bgColor', c)}
              className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                style.bgColor === c ? 'scale-110 border-blue-500' : 'border-slate-200'
              }`}
              style={{ backgroundColor: c }} />
          ))}
          <Swatch value={style.bgColor} onChange={(v) => set('bgColor', v)} title="Otro color de fondo" />
        </div>
        <SizeRow label="Grosor del borde" value={style.borderWidth} min={0} max={3} step={0.25} unit="pt"
          color={style.borderColor} onSize={(v) => set('borderWidth', v)} onColor={(v) => set('borderColor', v)} />
        <SizeRow label="Esquinas redondeadas" value={style.borderRadius} min={0} max={5} step={0.5} unit="mm"
          onSize={(v) => set('borderRadius', v)} />
      </Section>

      {/* ── Plantillas ── */}
      <Section icon="💾" title="Plantillas" hint={`${templates.length} guardada${templates.length === 1 ? '' : 's'}`}>
        {templates.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {templates.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 py-1 pl-3 pr-1">
                <button type="button" onClick={() => onChange(normalizeStyle(t.style))}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900">
                  {t.name}
                </button>
                <button type="button" title="Eliminar plantilla"
                  onClick={() => { deleteTemplate(t.id); setTemplates(listTemplates()) }}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-xs text-blue-400 hover:bg-blue-200 hover:text-red-600">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
            placeholder="Nombre, ej. Góndola 80×40"
            maxLength={40}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <button type="button" onClick={handleSaveTemplate} disabled={!saveName.trim()}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
            Guardar
          </button>
        </div>
        {savedMsg && <p className="text-xs font-semibold text-emerald-600">✓ Plantilla guardada</p>}
      </Section>
    </div>
  )
}

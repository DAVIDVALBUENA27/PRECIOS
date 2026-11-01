'use client'

/**
 * Verificar que la etiqueta salga de 8 × 4 cm en papel.
 *
 * Si la impresora, el diálogo de impresión o el zoom del navegador reducen la
 * hoja, la etiqueta sale más pequeña (ej. 6 × 3 cm = 75 %). Aquí se explica
 * qué revisar, se imprime una hoja de prueba con regla y, si hace falta, se
 * guarda un ajuste que compensa la reducción.
 */

import { useEffect, useState } from 'react'
import { LABEL_WIDTH_MM } from '@/features/labels/types/labelStyle'

interface Props {
  /** 1 = sin ajuste. */
  scale: number
  onScale: (scale: number) => void
  onTestPrint: () => void
}

/** Zoom del navegador aproximado (Chrome/Edge): 1 = 100 %. */
function useBrowserZoom(): number | null {
  const [zoom, setZoom] = useState<number | null>(null)
  useEffect(() => {
    const read = () => {
      if (!window.innerWidth || !window.outerWidth) return
      setZoom(Math.round((window.outerWidth / window.innerWidth) * 20) / 20)
    }
    read()
    window.addEventListener('resize', read)
    return () => window.removeEventListener('resize', read)
  }, [])
  return zoom
}

export function PrintCalibration({ scale, onScale, onTestPrint }: Props) {
  const [measured, setMeasured] = useState('')
  const zoom = useBrowserZoom()
  const zoomOff = zoom !== null && Math.abs(zoom - 1) >= 0.1
  const adjusted = Math.abs(scale - 1) > 0.001

  function applyMeasure() {
    const cm = Number(measured.replace(',', '.'))
    if (!cm || cm < 3 || cm > 15) return
    // Si con el ajuste actual salió `cm`, el ajuste nuevo corrige sobre el actual
    onScale(Math.round(((LABEL_WIDTH_MM / 10 / cm) * scale) * 1000) / 1000)
    setMeasured('')
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm font-bold text-slate-900">Medida exacta: 8 × 4 cm</p>
        <p className="text-[11px] text-slate-500">Revisa esto si al medir con la regla sale más pequeña.</p>
      </div>

      {zoomOff && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Tu navegador está con zoom de <strong>{Math.round((zoom ?? 1) * 100)}%</strong>. Ponlo en 100% con
          <strong> Ctrl + 0</strong> antes de imprimir.
        </p>
      )}

      <ol className="list-decimal space-y-1 pl-4 text-xs leading-snug text-slate-600">
        <li>Zoom del navegador en <strong>100%</strong> (Ctrl + 0).</li>
        <li>
          En la ventana de impresión abre <strong>«Más opciones»</strong> y pon <strong>Escala: Predeterminada</strong>{' '}
          (o Personalizada 100). Nunca «Ajustar a la página» ni «Ajustar al área imprimible».
        </li>
        <li><strong>Tamaño del papel: Carta</strong> y <strong>Márgenes: Predeterminados</strong>.</li>
        <li>En las propiedades de la impresora, desactiva «Ajustar a página» si aparece.</li>
      </ol>

      <button
        type="button"
        onClick={onTestPrint}
        className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
      >
        Imprimir hoja de prueba (1 etiqueta + regla de 10 cm)
      </button>

      <div className="space-y-2 border-t border-slate-100 pt-3">
        <p className="text-xs font-semibold text-slate-700">¿Sigue saliendo de otro tamaño?</p>
        <p className="text-[11px] leading-snug text-slate-500">
          Mide con la regla el <strong>ancho</strong> de la etiqueta impresa y escríbelo. La app compensa tu
          impresora y lo recuerda.
        </p>
        <div className="flex gap-2">
          <label className="flex flex-1 items-center rounded-lg border border-slate-200 px-2 focus-within:border-blue-400">
            <input
              type="text"
              inputMode="decimal"
              value={measured}
              onChange={(e) => setMeasured(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyMeasure()}
              placeholder="Ej: 6"
              className="w-full bg-transparent py-1.5 text-xs outline-none"
            />
            <span className="text-[11px] text-slate-400">cm</span>
          </label>
          <button
            type="button"
            onClick={applyMeasure}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
          >
            Ajustar
          </button>
        </div>
        {adjusted && (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2">
            <p className="text-[11px] text-emerald-800">
              Ajuste activo: <strong>{Math.round(scale * 100)}%</strong>. Imprime la hoja de prueba para confirmar.
            </p>
            <button type="button" onClick={() => onScale(1)}
              className="shrink-0 text-[11px] font-medium text-emerald-700 underline">
              Quitar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

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
import { createPortal } from 'react-dom'
/** Largo de la regla de la hoja de prueba. */
const RULER_CM = 10

interface Props {
  /** 1 = sin ajuste. */
  scale: number
  onScale: (scale: number) => void
  onTestPrint: () => void
  /** Sube en 1 cada vez que se imprime una hoja de prueba. */
  testPrintedCount?: number
}

/** Zoom del navegador aproximado (Chrome/Edge): 1 = 100 %. */
export function readBrowserZoom(): number | null {
  if (typeof window === 'undefined' || !window.innerWidth || !window.outerWidth) return null
  return Math.round((window.outerWidth / window.innerWidth) * 20) / 20
}

/**
 * Antes de imprimir: si el navegador no está al 100 %, las etiquetas pueden
 * salir más pequeñas (ej. zoom 75 % → 6 × 3 cm). Pide confirmación.
 */
export function confirmZoomBeforePrint(): boolean {
  const zoom = readBrowserZoom()
  if (zoom === null || Math.abs(zoom - 1) < 0.1) return true
  return window.confirm(
    `Tu navegador está con zoom de ${Math.round(zoom * 100)}%. Así las etiquetas pueden salir de otro tamaño (no de 8 × 4 cm).\n\n` +
    'Cancela, presiona Ctrl + 0 para dejarlo en 100% y vuelve a tocar Imprimir.\n\n' +
    '¿Imprimir de todas formas?',
  )
}

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

export function PrintCalibration({ scale, onScale, onTestPrint, testPrintedCount = 0 }: Props) {
  const [measured, setMeasured] = useState('')
  // Después de imprimir la hoja de prueba se pregunta de una vez cuánto midió
  const [asking, setAsking] = useState(false)
  useEffect(() => {
    if (testPrintedCount > 0) setAsking(true)
  }, [testPrintedCount])
  const zoom = useBrowserZoom()
  const zoomOff = zoom !== null && Math.abs(zoom - 1) >= 0.1
  const adjusted = Math.abs(scale - 1) > 0.001

  const measuredCm = Number(measured.replace(',', '.'))
  const validMeasure = measuredCm >= 5 && measuredCm <= 15

  /**
   * La regla de la hoja de prueba mide 10 cm en la app. Si en papel midió
   * `cm`, la impresión se está reduciendo (o agrandando) en cm/10 y se
   * compensa. Si ya había un ajuste, el nuevo corrige sobre el actual.
   */
  function applyMeasure() {
    if (!validMeasure) return
    onScale(Math.round(((RULER_CM / measuredCm) * scale) * 1000) / 1000)
    setMeasured('')
    setAsking(false)
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* En un portal: dentro del panel lateral quedaba tapada por la vista previa */}
      {asking && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 print:hidden">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <div>
              <p className="text-base font-bold text-slate-900">¿Cuánto midió la regla impresa?</p>
              <p className="mt-1 text-sm text-slate-500">
                Mide con tu regla la regla de la hoja de prueba, de 0 a 10. Si cada centímetro impreso
                mide 8 mm, escribe <strong>8</strong>.
              </p>
            </div>
            <label className="flex items-center rounded-xl border border-slate-300 px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <input
                autoFocus
                type="text"
                inputMode="decimal"
                value={measured}
                onChange={(e) => setMeasured(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyMeasure()}
                placeholder="Ej: 8"
                className="w-full bg-transparent py-2.5 text-lg font-semibold outline-none"
              />
              <span className="text-sm text-slate-400">cm</span>
            </label>
            {measured && !validMeasure && (
              <p className="text-xs text-amber-700">Escribe la medida en centímetros, entre 5 y 15.</p>
            )}
            <div className="flex flex-col gap-2">
              <button type="button" onClick={applyMeasure} disabled={!validMeasure}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
                Ajustar y guardar
              </button>
              <button type="button" onClick={() => { setAsking(false); setMeasured('') }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                Midió 10 cm, está bien
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Después de ajustar, imprime otra hoja de prueba para confirmar.
            </p>
          </div>
        </div>,
        document.body,
      )}
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
        <p className="text-xs font-semibold text-slate-700">¿La regla impresa no mide 10 cm?</p>
        <p className="text-[11px] leading-snug text-slate-500">
          Mide con tu regla la regla impresa en la hoja de prueba, de 0 a 10, y escribe cuánto midió.
          Ej: si cada centímetro impreso mide 8 mm, escribe <strong>8</strong>. La app compensa tu
          impresora y lo recuerda en este computador.
        </p>
        <div className="flex gap-2">
          <label className="flex flex-1 items-center rounded-lg border border-slate-200 px-2 focus-within:border-blue-400">
            <input
              type="text"
              inputMode="decimal"
              value={measured}
              onChange={(e) => setMeasured(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyMeasure()}
              placeholder="Ej: 8"
              className="w-full bg-transparent py-1.5 text-xs outline-none"
            />
            <span className="text-[11px] text-slate-400">cm</span>
          </label>
          <button
            type="button"
            onClick={applyMeasure}
            disabled={!validMeasure}
            className="rounded-lg bg-slate-800 disabled:opacity-40 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
          >
            Ajustar
          </button>
        </div>
        {measured && !validMeasure && (
          <p className="text-[11px] text-amber-700">Escribe la medida en centímetros, entre 5 y 15.</p>
        )}
        {adjusted && (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2">
            <p className="text-[11px] text-emerald-800">
              Ajuste activo: <strong>{Math.round(scale * 100)}%</strong>. Imprime otra hoja de prueba: la regla
              debe medir 10 cm y la etiqueta 8 × 4 cm.
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

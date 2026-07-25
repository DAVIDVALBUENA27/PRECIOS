import Link from 'next/link'
import { Logo } from '@/shared/components/Logo'

/**
 * Hero de la landing: propuesta de valor + CTA + preview del producto real.
 * El "screenshot" es una maqueta vectorial de las etiquetas que genera la app,
 * así se ve nítido, carga instantáneo y no depende de un asset externo (LCP rápido).
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      {/* Glow sutil de fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 flex justify-center blur-3xl"
      >
        <div className="h-[28rem] w-[56rem] bg-gradient-to-tr from-blue-100 via-white to-slate-100 opacity-70" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:gap-8 lg:py-28">
        {/* Columna de texto */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Etiquetas de góndola en minutos
          </span>

          <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">
            Etiquetas de precios para tu negocio,{' '}
            <span className="text-blue-600">en minutos.</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
            Sube tu lista de productos, personaliza y listo para imprimir.
            Detecta automáticamente qué precios cambiaron desde tu última carga.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              Empieza gratis
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="#precios"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              Ver planes
            </Link>
          </div>

          <p className="mt-4 text-xs text-slate-400">
            Sin tarjeta de crédito · Compatible con cualquier nicho
          </p>
        </div>

        {/* Columna visual: maqueta de etiquetas */}
        <div className="relative">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-xl shadow-slate-200/60">
            <div className="mb-4 flex items-center gap-2">
              <Logo size={22} />
              <span className="text-xs font-semibold text-slate-500">
                Vista previa de impresión
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <LabelMock name="Acetaminofén 500mg" lab="Genfar" price="$4.900" />
              <LabelMock name="Vitamina C 1g x30" lab="MK" price="$18.500" changed="up" />
              <LabelMock name="Alcohol Antiséptico" lab="JGB" price="$3.200" changed="down" />
              <LabelMock name="Guantes Nitrilo x100" lab="Comfy" price="$25.000" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function LabelMock({
  name,
  lab,
  price,
  changed,
}: {
  name: string
  lab: string
  price: string
  changed?: 'up' | 'down'
}) {
  return (
    <div className="relative flex aspect-[2/1] flex-col justify-between rounded-lg border border-slate-200 bg-white p-3">
      {changed && (
        <span
          className={`absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
            changed === 'up'
              ? 'bg-red-50 text-red-600'
              : 'bg-green-50 text-green-600'
          }`}
        >
          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d={changed === 'up' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
            />
          </svg>
        </span>
      )}
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
          {lab}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[11px] font-bold uppercase leading-tight text-slate-800">
          {name}
        </p>
      </div>
      <p className="text-lg font-black tracking-tight text-slate-900">{price}</p>
    </div>
  )
}

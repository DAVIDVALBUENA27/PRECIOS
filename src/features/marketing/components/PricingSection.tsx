import Link from 'next/link'

/**
 * 3 planes visuales (no conectados a pagos aún — Fase 3).
 * Los precios son ilustrativos; el CTA lleva a registro.
 */
const plans = [
  {
    name: 'Básico',
    price: 'Gratis',
    period: '',
    description: 'Para empezar y probar el flujo completo.',
    features: [
      'Hasta 500 productos',
      '1 usuario',
      'Todos los diseños de etiqueta',
      'Detección de cambios de precio',
    ],
    cta: 'Empieza gratis',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$9',
    period: '/mes',
    description: 'Para negocios que imprimen etiquetas cada semana.',
    features: [
      'Productos ilimitados',
      'Logo y colores de tu marca',
      'Historial de precios 90 días',
      'Plantillas guardadas',
    ],
    cta: 'Empieza gratis',
    highlighted: true,
  },
  {
    name: 'Empresarial',
    price: '$29',
    period: '/mes',
    description: 'Para cadenas con varios puntos de venta.',
    features: [
      'Todo lo de Pro',
      'Hasta 5 usuarios',
      'Historial de precios 1 año',
      'Soporte prioritario',
    ],
    cta: 'Empieza gratis',
    highlighted: false,
  },
]

export function PricingSection() {
  return (
    <section id="precios" className="scroll-mt-20 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Precios simples, sin sorpresas
          </h2>
          <p className="mt-3 text-slate-600">
            Empieza gratis. Cambia de plan cuando tu negocio crezca.
          </p>
        </div>

        <div className="mt-14 grid items-start gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-8 ${
                plan.highlighted
                  ? 'border-blue-600 bg-white shadow-xl shadow-blue-100 ring-1 ring-blue-600'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-8 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                  Más popular
                </span>
              )}

              <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-slate-900">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-sm font-medium text-slate-500">
                    {plan.period}
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm text-slate-600">{plan.description}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={`mt-8 inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${
                  plan.highlighted
                    ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                    : 'border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * 3 beneficios clave con íconos SVG inline (sin dependencias de íconos).
 */
const features = [
  {
    title: 'Compatible con cualquier nicho',
    description:
      'Farmacias, supermercados, ferreterías, tiendas naturistas. Si vendes productos con precio, sirve.',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 7l1.5-3h15L21 7M3 7v12a1 1 0 001 1h16a1 1 0 001-1V7M3 7h18M8 11h.01M8 15h8"
        />
      </svg>
    ),
  },
  {
    title: 'Historial automático de precios',
    description:
      'Sube tu nueva lista y la app te dice qué subió y qué bajó desde la última vez. Sin comparar a mano.',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 3v18h18M7 14l4-4 3 3 5-6"
        />
      </svg>
    ),
  },
  {
    title: 'Tu marca en cada etiqueta',
    description:
      'Agrega el logo y los colores de tu empresa. Tus etiquetas se ven profesionales y consistentes.',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h10a2 2 0 012 2v2m3 4l-9 9-4 1 1-4 9-9a1.5 1.5 0 012 2z"
        />
      </svg>
    ),
  },
]

export function FeatureGrid() {
  return (
    <section className="border-y border-slate-100 bg-slate-50/60">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Todo lo que necesitas para etiquetar rápido
          </h2>
          <p className="mt-3 text-slate-600">
            Diseñado para que dejes de perder tiempo en Excel y en la impresora.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-white p-7 transition-shadow hover:shadow-md hover:shadow-slate-200/60"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <span className="h-5 w-5">{f.icon}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

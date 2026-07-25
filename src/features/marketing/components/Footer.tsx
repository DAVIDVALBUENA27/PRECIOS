import Link from 'next/link'
import { Logo } from '@/shared/components/Logo'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row">
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo size={28} />
              <span className="text-sm font-semibold tracking-tight text-slate-900">
                Etiquetas Góndola
              </span>
            </Link>
            <p className="mt-3 text-sm text-slate-500">
              Etiquetas de precios profesionales para tu negocio, en minutos.
            </p>
          </div>

          <div className="flex gap-16">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Producto
              </h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="#precios" className="text-slate-600 hover:text-slate-900">
                    Planes
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="text-slate-600 hover:text-slate-900">
                    Crear cuenta
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="text-slate-600 hover:text-slate-900">
                    Iniciar sesión
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6">
          <p className="text-xs text-slate-400">
            © {year} Etiquetas Góndola. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}

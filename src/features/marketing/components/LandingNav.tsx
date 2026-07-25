import Link from 'next/link'
import { Logo } from '@/shared/components/Logo'

/**
 * Navbar de la landing pública. El CTA cambia según haya sesión activa:
 * logueado → "Ir al panel", anónimo → "Iniciar sesión" + "Empieza gratis".
 */
export function LandingNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={30} />
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            Etiquetas Góndola
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <Link
            href="#precios"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            Planes
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              Ir al panel
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                Empieza gratis
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

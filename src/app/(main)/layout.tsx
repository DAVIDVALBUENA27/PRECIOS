import Link from 'next/link'
import { signout } from '@/actions/auth'
import { Logo } from '@/shared/components/Logo'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          {/* Logo + links */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <Logo size={30} />
              <span className="text-sm font-semibold tracking-tight text-slate-900">
                Etiquetas Góndola
              </span>
            </Link>

            <div className="flex items-center gap-0.5">
              <Link
                href="/dashboard"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Dashboard
              </Link>
              <Link
                href="/ajustes"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Historial
              </Link>
            </div>
          </div>

          {/* Right side */}
          <form action={signout}>
            <button
              type="submit"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  )
}

import Link from 'next/link'
import { signout } from '@/actions/auth'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-bold">Etiquetas Góndola</span>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            Dashboard
          </Link>
          <Link href="/ajustes" className="text-sm text-gray-600 hover:text-gray-900">
            Ajustes
          </Link>
        </div>
        <form action={signout}>
          <button type="submit" className="text-sm text-gray-600 hover:text-gray-900">
            Cerrar sesión
          </button>
        </form>
      </nav>
      <main>{children}</main>
    </div>
  )
}

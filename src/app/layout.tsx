import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Etiquetas Góndola — Etiquetas de precios para tu negocio, en minutos',
  description:
    'Sube tu lista de productos, personaliza y listo para imprimir. Detecta automáticamente qué precios cambiaron. Compatible con cualquier nicho.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

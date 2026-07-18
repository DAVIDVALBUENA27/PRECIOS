interface LogoProps {
  size?: number
  className?: string
}

/**
 * Logo "Etiqueta Colgante" — etiqueta de góndola con gancho y franja de precio azul.
 * Vectorial: nítido a cualquier tamaño.
 */
export function Logo({ size = 28, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Etiquetas Góndola"
    >
      {/* Fondo cuadrado redondeado */}
      <rect width="32" height="32" rx="8" fill="#0F172A" />

      {/* Gancho / pestaña superior */}
      <rect x="13" y="4" width="6" height="9" rx="3" fill="white" fillOpacity="0.18" />
      {/* Agujero del gancho */}
      <circle cx="16" cy="8" r="1.8" fill="#0F172A" />

      {/* Cuerpo de la etiqueta */}
      <rect x="6" y="10" width="20" height="18" rx="3" fill="white" fillOpacity="0.09" />

      {/* Línea de nombre del producto */}
      <rect x="9" y="14" width="10" height="1.8" rx="0.9" fill="white" fillOpacity="0.4" />
      {/* Línea secundaria */}
      <rect x="9" y="17.5" width="14" height="1.5" rx="0.75" fill="white" fillOpacity="0.2" />

      {/* Banda de precio — azul acento */}
      <rect x="6" y="21" width="20" height="5" rx="0 0 3 3" fill="#2563EB" />
      {/* Línea blanca dentro del precio (simula texto del $) */}
      <rect x="9" y="23" width="10" height="1.5" rx="0.75" fill="white" fillOpacity="0.7" />
    </svg>
  )
}

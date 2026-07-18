import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#0F172A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Gancho superior */}
        <div style={{
          position: 'absolute',
          top: 4,
          left: 13,
          width: 6,
          height: 8,
          borderRadius: 3,
          background: 'rgba(255,255,255,0.2)',
        }} />
        {/* Agujero */}
        <div style={{
          position: 'absolute',
          top: 6.2,
          left: 14.2,
          width: 3.6,
          height: 3.6,
          borderRadius: 9999,
          background: '#0F172A',
        }} />
        {/* Cuerpo etiqueta */}
        <div style={{
          position: 'absolute',
          top: 10,
          left: 6,
          width: 20,
          height: 18,
          borderRadius: 3,
          background: 'rgba(255,255,255,0.09)',
        }} />
        {/* Banda precio azul */}
        <div style={{
          position: 'absolute',
          bottom: 2,
          left: 6,
          width: 20,
          height: 5,
          borderRadius: '0 0 3px 3px',
          background: '#2563EB',
        }} />
      </div>
    ),
    { ...size }
  )
}

'use client'

import { useCallback, useRef, useState } from 'react'
import { uploadLogo, removeLogo } from '@/features/business/services/businessService'

const MAX_BYTES = 2 * 1024 * 1024 // 2MB
const MAX_W = 200
const MAX_H = 60
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

interface LogoUploaderProps {
  value: string | null
  onChange: (url: string | null) => void
}

/** Redimensiona una imagen raster a un máx de 200×60 preservando proporción. Devuelve un WebP. */
function resizeRaster(file: File): Promise<{ blob: Blob; ext: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(MAX_W / img.width, MAX_H / img.height, 1)
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('No se pudo procesar la imagen.'))
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => (blob ? resolve({ blob, ext: 'webp' }) : reject(new Error('Falló la conversión.'))),
        'image/webp',
        0.92
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen.'))
    }
    img.src = url
  })
}

export function LogoUploader({ value, onChange }: LogoUploaderProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)
      if (!ACCEPTED.includes(file.type)) {
        setError('Formato no válido. Usa PNG, JPG, WebP o SVG.')
        return
      }
      if (file.size > MAX_BYTES) {
        setError('El archivo supera 2MB.')
        return
      }
      setBusy(true)
      try {
        let blob: Blob = file
        let ext = 'png'
        if (file.type === 'image/svg+xml') {
          // Los SVG son vectoriales: se suben tal cual, sin rasterizar.
          blob = file
          ext = 'svg'
        } else {
          const resized = await resizeRaster(file)
          blob = resized.blob
          ext = resized.ext
        }
        const url = await uploadLogo(blob, ext)
        onChange(url)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo subir el logo.')
      } finally {
        setBusy(false)
      }
    },
    [onChange]
  )

  async function handleRemove() {
    setBusy(true)
    setError(null)
    try {
      await removeLogo()
      onChange(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar el logo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files?.[0]
          if (file) void handleFile(file)
        }}
        className={`flex items-center gap-4 rounded-xl border border-dashed p-4 transition-colors ${
          dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50'
        }`}
      >
        {/* Preview */}
        <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Logo del negocio" className="max-h-14 max-w-[88px] object-contain" />
          ) : (
            <svg className="h-6 w-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M6 6h.008v.008H6V6z" />
            </svg>
          )}
        </div>

        {/* Acciones */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? 'Procesando…' : value ? 'Cambiar logo' : 'Subir logo'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => void handleRemove()}
                disabled={busy}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                Quitar
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            Arrastra una imagen o haz clic. PNG, JPG, WebP o SVG · máx 2MB.
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
            e.target.value = ''
          }}
        />
      </div>

      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}

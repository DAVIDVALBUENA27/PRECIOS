'use client'

import { useRef, useState, DragEvent, ChangeEvent } from 'react'
import { parseWorkbook } from '@/features/labels/lib/parseFile'

const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv']

interface UploadZoneProps {
  onRows: (rows: string[][], fileName: string) => void
  onDemo: () => void
}

export function UploadZone({ onRows, onDemo }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)

  async function handleFile(file: File) {
    setError(null)

    const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase()
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError(`Formato no soportado (${ext || 'desconocido'}). Sube un archivo ${ACCEPTED_EXTENSIONS.join(', ')}.`)
      return
    }

    setReading(true)
    try {
      const isCsv = ext === '.csv'
      const buffer = isCsv ? await file.text() : await file.arrayBuffer()
      const rows = parseWorkbook(buffer, isCsv)

      if (rows.length < 2) {
        setError('El archivo está vacío o solo tiene encabezados. Verifica el export de tu sistema.')
        return
      }
      onRows(rows, file.name)
    } catch {
      setError('No se pudo leer el archivo. Verifica que no esté dañado o protegido con contraseña.')
    } finally {
      setReading(false)
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-16 text-center transition-colors ${
          dragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/50'
        }`}
      >
        <svg className="mb-4 h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="font-medium text-gray-900">
          {reading ? 'Leyendo archivo...' : 'Arrastra tu Excel o CSV aquí'}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          o haz click para seleccionarlo · {ACCEPTED_EXTENSIONS.join(', ')}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onDemo}
          className="text-sm text-blue-600 underline-offset-2 hover:underline"
        >
          Ver demo con datos de prueba
        </button>
      </div>
    </div>
  )
}

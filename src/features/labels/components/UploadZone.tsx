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
    if (file) void handleFile(file)
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
    e.target.value = ''
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`group flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-8 py-14 text-center transition-all duration-200 ${
          dragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40'
        }`}
      >
        {/* Icon */}
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors duration-200 ${
          dragging ? 'bg-blue-100' : 'bg-slate-100 group-hover:bg-blue-100'
        }`}>
          {reading ? (
            <svg className="h-7 w-7 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <svg className={`h-7 w-7 transition-colors duration-200 ${dragging ? 'text-blue-500' : 'text-slate-400 group-hover:text-blue-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          )}
        </div>

        {/* Text */}
        <div>
          <p className="text-base font-semibold text-slate-800">
            {reading ? 'Leyendo archivo…' : dragging ? 'Suelta el archivo aquí' : 'Arrastra tu archivo aquí'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            o haz clic para seleccionarlo
          </p>
        </div>

        {/* Format chips */}
        <div className="flex items-center gap-1.5">
          {ACCEPTED_EXTENSIONS.map((ext) => (
            <span key={ext} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-500">
              {ext}
            </span>
          ))}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Demo link */}
      <div className="text-center">
        <button
          type="button"
          onClick={onDemo}
          className="text-sm text-slate-500 underline-offset-2 transition-colors hover:text-blue-600 hover:underline"
        >
          Ver demo con datos de prueba
        </button>
      </div>
    </div>
  )
}

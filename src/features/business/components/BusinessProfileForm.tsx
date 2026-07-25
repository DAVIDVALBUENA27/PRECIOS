'use client'

import { useEffect, useState } from 'react'
import { getProfile, updateProfile } from '@/features/business/services/businessService'
import type { Business } from '@/features/business/types'
import { LogoUploader } from './LogoUploader'

export function BusinessProfileForm() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [accentColor, setAccentColor] = useState('#2563EB')
  const [taxId, setTaxId] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const profile = await getProfile()
        if (profile) {
          setName(profile.name)
          setAccentColor(profile.accentColor)
          setTaxId(profile.taxId ?? '')
          setLogoUrl(profile.logoUrl)
        }
      } catch {
        // sin sesión / sin negocio
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const updated: Business | null = await updateProfile({ name, accentColor, taxId })
      if (updated) {
        setName(updated.name)
        setAccentColor(updated.accentColor)
        setTaxId(updated.taxId ?? '')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <svg className="mx-auto h-5 w-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="mt-2 text-sm text-slate-400">Cargando perfil…</p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Columna izquierda: campos */}
        <div className="space-y-5">
          <div>
            <label htmlFor="biz-name" className="block text-sm font-medium text-slate-700">
              Nombre del negocio
            </label>
            <input
              id="biz-name"
              type="text"
              value={name}
              maxLength={50}
              onChange={(e) => setName(e.target.value)}
              placeholder="Farmacia La Salud"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-xs text-slate-400">{name.length}/50</p>
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700">Logo</span>
            <p className="mb-2 text-xs text-slate-400">
              Aparece en la esquina superior de cada etiqueta impresa.
            </p>
            <LogoUploader value={logoUrl} onChange={setLogoUrl} />
          </div>

          <div className="flex gap-6">
            <div>
              <label htmlFor="biz-accent" className="block text-sm font-medium text-slate-700">
                Color de acento
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  id="biz-accent"
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border border-slate-200 bg-white p-0.5"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 font-mono text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="flex-1">
              <label htmlFor="biz-tax" className="block text-sm font-medium text-slate-700">
                NIT / RUT <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <input
                id="biz-tax"
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="900.123.456-7"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <p className="mt-1 text-xs text-slate-400">Aparece en el pie de la etiqueta.</p>
            </div>
          </div>
        </div>

        {/* Columna derecha: preview en vivo */}
        <div>
          <span className="block text-sm font-medium text-slate-700">Vista previa</span>
          <p className="mb-2 text-xs text-slate-400">Así se verá tu etiqueta.</p>
          <div className="flex justify-center rounded-xl border border-slate-200 bg-slate-50 p-6">
            <div className="relative flex aspect-[2/1] w-56 flex-col justify-between rounded-md border border-slate-300 bg-white p-3">
              {logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt=""
                  className="absolute right-2 top-2 h-6 max-w-[56px] object-contain"
                />
              )}
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                  Genfar
                </p>
                <p className="mt-0.5 max-w-[70%] text-[11px] font-bold uppercase leading-tight text-slate-800">
                  Acetaminofén 500mg x10
                </p>
              </div>
              <div>
                <p className="text-2xl font-black tracking-tight" style={{ color: accentColor }}>
                  $4.900
                </p>
                {taxId && (
                  <p className="mt-0.5 text-[8px] text-slate-400">
                    {name || 'Tu negocio'} · NIT {taxId}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer del form */}
      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
        <div className="text-sm">
          {error && <span className="font-medium text-red-600">{error}</span>}
          {saved && !error && (
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Cambios guardados
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}

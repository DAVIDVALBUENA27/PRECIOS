'use client'

/**
 * Business Service — perfil del negocio (nombre, logo, color de acento, NIT).
 *
 * El logo vive en Supabase Storage (bucket `logos`, carpeta = business_id).
 * El resto de campos en la tabla `businesses`.
 */

import { createClient } from '@/lib/supabase/client'
import type { Business, BusinessProfilePatch } from '@/features/business/types'

// Cliente único compartido: @supabase/ssr recomienda una sola instancia en el
// navegador. Instancias nuevas pueden resolver el token como anónimo en la
// primera llamada de Storage → "new row violates row-level security policy".
let _client: ReturnType<typeof createClient> | null = null
function getClient() {
  if (!_client) _client = createClient()
  return _client
}

async function getBusinessId(): Promise<string | null> {
  const sb = getClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return null

  const { data } = await sb
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .maybeSingle()
  if (data?.business_id) return data.business_id as string

  // Self-heal: cuentas creadas antes del trigger on_auth_user_created
  // no tienen negocio. La RPC lo crea on-demand (idempotente).
  const { data: bid, error } = await sb.rpc('ensure_current_business')
  if (error || !bid) return null
  return bid as string
}

function fromRow(row: Record<string, unknown>): Business {
  return {
    id: row.id as string,
    name: (row.name as string) ?? '',
    logoUrl: (row.logo_url as string | null) ?? null,
    accentColor: (row.accent_color as string | null) ?? '#2563EB',
    taxId: (row.tax_id as string | null) ?? null,
    updatedAt: (row.updated_at as string) ?? '',
  }
}

/** Devuelve el perfil del negocio del usuario actual, o null si no hay sesión/negocio. */
export async function getProfile(): Promise<Business | null> {
  const businessId = await getBusinessId()
  if (!businessId) return null

  const sb = getClient()
  const { data, error } = await sb
    .from('businesses')
    .select('id, name, logo_url, accent_color, tax_id, updated_at')
    .eq('id', businessId)
    .single()

  if (error || !data) return null
  return fromRow(data)
}

/** Actualiza nombre / color / NIT. Devuelve el perfil actualizado. */
export async function updateProfile(patch: BusinessProfilePatch): Promise<Business | null> {
  const businessId = await getBusinessId()
  if (!businessId) throw new Error('No hay negocio asociado a tu cuenta.')

  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.name !== undefined) row.name = patch.name.trim().slice(0, 50)
  if (patch.accentColor !== undefined) row.accent_color = patch.accentColor
  if (patch.taxId !== undefined) row.tax_id = patch.taxId?.trim() || null

  const sb = getClient()
  const { data, error } = await sb
    .from('businesses')
    .update(row)
    .eq('id', businessId)
    .select('id, name, logo_url, accent_color, tax_id, updated_at')
    .single()

  if (error) throw new Error(error.message)
  return data ? fromRow(data) : null
}

/**
 * Sube el logo vía el endpoint del servidor (`/api/business/logo`), donde la
 * autenticación con Supabase es confiable. Devuelve la URL pública final.
 *
 * Por qué servidor y no cliente: el browser client de @supabase/ssr podía
 * mandar la subida a Storage sin el token (token refresh race) → RLS 400.
 */
export async function uploadLogo(blob: Blob, ext: string): Promise<string> {
  const form = new FormData()
  form.append('file', blob, `logo.${ext}`)
  form.append('ext', ext)

  const res = await fetch('/api/business/logo', { method: 'POST', body: form })
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!res.ok || !json.url) {
    throw new Error(json.error || 'No se pudo subir el logo.')
  }
  return json.url
}

/** Elimina el logo (storage + businesses.logo_url) vía el endpoint del servidor. */
export async function removeLogo(): Promise<void> {
  const res = await fetch('/api/business/logo', { method: 'DELETE' })
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(json.error || 'No se pudo eliminar el logo.')
  }
}

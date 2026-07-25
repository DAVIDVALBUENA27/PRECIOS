import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'logos'
const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED_EXT: Record<string, string> = {
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type ServerClient = Awaited<ReturnType<typeof createClient>>

async function resolveBusinessId(sb: ServerClient): Promise<string | null> {
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

  const { data: bid } = await sb.rpc('ensure_current_business')
  return (bid as string) ?? null
}

export async function POST(req: NextRequest) {
  const sb = await createClient()
  const businessId = await resolveBusinessId(sb)
  if (!businessId) {
    return NextResponse.json({ error: 'No autenticado o sin negocio.' }, { status: 401 })
  }

  // Token del usuario (getUser ya lo refrescó si hacía falta).
  const {
    data: { session },
  } = await sb.auth.getSession()
  const token = session?.access_token
  if (!token) {
    return NextResponse.json({ error: 'Sesión no disponible.' }, { status: 401 })
  }

  const form = await req.formData()
  const file = form.get('file')
  const ext = (form.get('ext') as string) || 'webp'

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Archivo faltante.' }, { status: 400 })
  }
  const contentType = ALLOWED_EXT[ext]
  if (!contentType) {
    return NextResponse.json({ error: 'Formato no permitido.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'El archivo supera 2MB.' }, { status: 400 })
  }

  const path = `${businessId}/logo.${ext}`
  const buffer = await file.arrayBuffer()

  // Subida manual al endpoint de Storage adjuntando el JWT del usuario de forma
  // explícita. Evita el bug de @supabase/ssr que manda Storage sin token → RLS.
  const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: ANON_KEY,
      'Content-Type': contentType,
      'cache-control': 'max-age=3600',
      'x-upsert': 'true',
    },
    body: buffer,
  })

  if (!uploadRes.ok) {
    const detail = await uploadRes.text().catch(() => '')
    console.error('[logo upload] storage error', uploadRes.status, detail)
    return NextResponse.json(
      { error: `Storage ${uploadRes.status}: ${detail || 'fallo al subir'}` },
      { status: 400 }
    )
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}?v=${Date.now()}`

  const { error: dbErr } = await sb
    .from('businesses')
    .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', businessId)
  if (dbErr) {
    console.error('[logo upload] db error', dbErr.message)
    return NextResponse.json({ error: dbErr.message }, { status: 400 })
  }

  return NextResponse.json({ url: publicUrl })
}

export async function DELETE() {
  const sb = await createClient()
  const businessId = await resolveBusinessId(sb)
  if (!businessId) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }
  const {
    data: { session },
  } = await sb.auth.getSession()
  const token = session?.access_token
  if (!token) {
    return NextResponse.json({ error: 'Sesión no disponible.' }, { status: 401 })
  }

  const exts = ['png', 'jpg', 'jpeg', 'webp', 'svg']
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefixes: exts.map((e) => `${businessId}/logo.${e}`) }),
  })

  await sb
    .from('businesses')
    .update({ logo_url: null, updated_at: new Date().toISOString() })
    .eq('id', businessId)

  return NextResponse.json({ ok: true })
}

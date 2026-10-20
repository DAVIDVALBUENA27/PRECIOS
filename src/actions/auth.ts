'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Traduce al español los mensajes de error de Supabase Auth (vienen en inglés).
 * Si no reconoce el mensaje, devuelve uno genérico claro en vez del texto crudo.
 */
function traducirErrorAuth(mensaje: string): string {
  const m = mensaje.toLowerCase()

  if (m.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos. Verifica e intenta de nuevo.'
  }
  if (m.includes('email not confirmed')) {
    return 'Tu correo aún no está confirmado.'
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'Ya existe una cuenta con ese correo. Intenta iniciar sesión.'
  }
  if (m.includes('password should be at least') || m.includes('password is too short')) {
    return 'La contraseña es muy corta: usa al menos 6 caracteres.'
  }
  if (m.includes('unable to validate email address') || m.includes('invalid email')) {
    return 'El correo no parece válido. Revísalo e intenta de nuevo.'
  }
  if (m.includes('email rate limit') || m.includes('rate limit') || m.includes('too many requests')) {
    return 'Demasiados intentos seguidos. Espera un momento y vuelve a intentar.'
  }
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) {
    return 'El registro está deshabilitado por el momento.'
  }
  if (m.includes('for security purposes') && m.includes('seconds')) {
    return 'Por seguridad, espera unos segundos antes de volver a intentar.'
  }
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('fetch')) {
    return 'No se pudo conectar. Revisa tu conexión a internet e intenta de nuevo.'
  }

  // Desconocido: mensaje genérico en vez del texto en inglés.
  return 'Ocurrió un problema. Intenta de nuevo en un momento.'
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: traducirErrorAuth(error.message) }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string
  const businessName = formData.get('business_name') as string

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        business_name: businessName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/callback`,
    },
  })

  if (error) {
    return { error: traducirErrorAuth(error.message) }
  }

  // Si la confirmación por correo está desactivada, Supabase devuelve una
  // sesión activa: el usuario ya quedó dentro, lo mandamos al panel.
  // Si sigue activa (no hay sesión), mostramos el aviso de revisar el correo.
  if (data.session) {
    revalidatePath('/', 'layout')
    redirect('/dashboard')
  }

  redirect('/check-email')
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export interface Business {
  id: string
  name: string
  logoUrl: string | null
  accentColor: string
  taxId: string | null
  updatedAt: string
}

/** Campos editables desde el formulario de perfil (el logo se maneja aparte). */
export interface BusinessProfilePatch {
  name?: string
  accentColor?: string
  taxId?: string | null
}

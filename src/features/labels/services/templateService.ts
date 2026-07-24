'use client'

/**
 * Plantillas de etiqueta guardadas en localStorage.
 * Incluyen todo el LabelStyle + tamaño de papel.
 * Plan Básico: solo localStorage. Plan Pro (futuro): sincroniza con Supabase.
 */

import type { LabelStyle } from '@/features/labels/components/LabelStylePanel'

const STORAGE_KEY = 'gondola_templates_v1'

export interface LabelTemplate {
  id: string
  name: string
  style: LabelStyle
  createdAt: string
}

export function listTemplates(): LabelTemplate[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as LabelTemplate[]
  } catch {
    return []
  }
}

export function saveTemplate(name: string, style: LabelStyle): LabelTemplate {
  const template: LabelTemplate = {
    id: crypto.randomUUID(),
    name: name.trim().slice(0, 40) || 'Plantilla',
    style,
    createdAt: new Date().toISOString(),
  }
  const list = listTemplates()
  list.push(template)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  return template
}

export function deleteTemplate(id: string): void {
  const list = listTemplates().filter((t) => t.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

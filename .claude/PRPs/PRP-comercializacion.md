# PRP — Comercialización: Etiquetas Góndola como SaaS B2B

**Fecha:** 2026-07-23  
**Objetivo:** Convertir el producto técnico actual en un SaaS vendible a múltiples negocios.  
**Estado:** Pendiente de aprobación → ejecución por fases

---

## Contexto

El producto core (subir CSV → generar etiquetas → imprimir) está funcional y pulido.
El stack multi-tenant de Supabase ya existe (tablas `businesses`, `profiles`, `products`, `price_snapshots`).
Falta la capa comercial: landing page, identidad del cliente en las etiquetas, pagos y configuración por empresa.

---

## Fases

### FASE 1 — Landing Page (Conversión)
**Por qué primero:** Sin landing no hay ventas. Hoy quien visita la URL ve el login.

**Comportamiento esperado:**
- Ruta `/` muestra la landing pública (no requiere autenticación)
- Ruta `/dashboard` redirige al login si no hay sesión
- La landing tiene: hero con propuesta de valor + GIF/screenshot del producto, 3 beneficios clave, 3 planes de precios (visual, no funcional aún), CTA "Empieza gratis" → `/signup`, footer

**Páginas/archivos a crear:**
```
src/app/page.tsx                          ← landing pública (reemplaza redirect actual)
src/features/marketing/components/
  Hero.tsx                                ← título + subtítulo + CTA + screenshot
  FeatureGrid.tsx                         ← 3 bloques de beneficios con íconos SVG
  PricingSection.tsx                      ← 3 planes visuales (no conectados a pagos aún)
  Footer.tsx                              ← logo + links + copyright
```

**Copia sugerida:**
- **Hero:** "Etiquetas de precios para tu negocio, en minutos." / "Sube tu lista de productos, personaliza y listo para imprimir. Detecta automáticamente qué precios cambiaron."
- **Beneficio 1:** "Compatible con cualquier nicho" — farmacias, supermercados, ferreterías, tiendas naturistas
- **Beneficio 2:** "Historial automático de precios" — sabe qué subió y qué bajó
- **Beneficio 3:** "Tu marca en cada etiqueta" — logo y colores de tu empresa

**No hacer en esta fase:** conectar pagos reales, requiere solo HTML/CSS premium.

---

### FASE 2 — Perfil del Negocio + Logo en Etiquetas
**Por qué segundo:** Cada cliente quiere sus etiquetas con su propio logo. Es blocker de uso real.

**Comportamiento esperado:**
- Página `/ajustes` ampliar con sección "Mi negocio":
  - Nombre del negocio (texto, max 50 chars)
  - Logo: upload de imagen → guardado en Supabase Storage bucket `logos`
  - Color de acento (color picker)
  - NIT / RUT (opcional, aparece en footer de la etiqueta)
- Logo aparece en la etiqueta impresa (esquina superior derecha del ticket)
- Si no hay logo configurado → etiqueta sin logo (comportamiento actual)
- Los ajustes se guardan en tabla `businesses` (ya existe: `name`, futuros: `logo_url`, `accent_color`, `tax_id`)

**Modelo de datos — migración nueva:**
```sql
ALTER TABLE businesses ADD COLUMN logo_url text;
ALTER TABLE businesses ADD COLUMN accent_color text DEFAULT '#2563EB';
ALTER TABLE businesses ADD COLUMN tax_id text;
ALTER TABLE businesses ADD COLUMN settings jsonb DEFAULT '{}';
```

**Archivos a modificar/crear:**
```
src/app/(main)/ajustes/page.tsx           ← añadir sección "Mi negocio"
src/features/business/components/
  BusinessProfileForm.tsx                 ← form: nombre, logo upload, color, NIT
  LogoUploader.tsx                        ← drag&drop imagen → Supabase Storage
src/features/business/services/
  businessService.ts                      ← getProfile(), updateProfile(), uploadLogo()
src/features/labels/components/
  PrintPreview.tsx                        ← ya recibe `logoUrl`, conectar con el perfil real
```

**Reglas de negocio:**
- Logo max 2MB, formatos: PNG/JPG/WebP/SVG
- Redimensionar a 200×60px max en cliente antes de subir
- RLS: `logo_url` solo accesible por usuarios del mismo `business_id`

---

### FASE 3 — Planes y Pagos (Polar)
**Por qué tercero:** Monetización. Sin esto el producto es gratuito para siempre.

**Comportamiento esperado:**
- 3 planes:
  - **Básico** ($0/mes): 1 usuario, 500 productos max, sin logo personalizado, sin historial
  - **Pro** ($X/mes): 1 usuario, ilimitado, logo propio, historial 90 días, todos los diseños
  - **Empresarial** ($Y/mes): 5 usuarios, ilimitado, logo, historial 1 año, soporte prioritario
- Checkout vía Polar (ya definido en stack)
- Webhook de Polar actualiza columna `plan` en tabla `businesses`
- Feature flags por plan: si sube más de 500 productos en plan Básico → banner de upgrade
- Página `/precios` pública con los 3 planes (reutiliza `PricingSection` de fase 1 pero con links reales)

**Archivos a crear:**
```
src/app/api/webhooks/polar/route.ts       ← webhook handler (actualiza businesses.plan)
src/app/precios/page.tsx                  ← página pública de precios con checkout real
src/features/billing/
  hooks/usePlan.ts                        ← hook: devuelve plan actual + límites
  components/UpgradeBanner.tsx            ← banner cuando se supera el límite
  services/polarService.ts               ← createCheckout(), getCustomerPortal()
```

**Variables de entorno necesarias:**
```
POLAR_ACCESS_TOKEN=
POLAR_WEBHOOK_SECRET=
POLAR_PRODUCT_ID_PRO=
POLAR_PRODUCT_ID_ENTERPRISE=
```

**Migración Supabase:**
```sql
ALTER TABLE businesses ADD COLUMN plan text DEFAULT 'free' CHECK (plan IN ('free','pro','enterprise'));
ALTER TABLE businesses ADD COLUMN plan_expires_at timestamptz;
ALTER TABLE businesses ADD COLUMN polar_customer_id text;
```

---

### FASE 4 — Plantillas Guardadas + Tamaño Configurable
**Por qué cuarto:** Retención. Los clientes Pro que guardan su diseño nunca se van.

**Comportamiento esperado:**
- En el panel de diseño (LabelStylePanel) → botón "Guardar plantilla" con nombre
- Las plantillas aparecen en un dropdown "Cargar plantilla" al inicio de la vista de impresión
- Las plantillas incluyen: todos los valores de `LabelStyle` + tamaño de etiqueta + papel
- Tamaño de etiqueta configurable: ancho (50–100mm) × alto (30–60mm)
  - Grid se recalcula automáticamente para el tamaño elegido
- Plantillas guardadas en `localStorage` (plan Básico) y en Supabase (plan Pro+)

**Tabla nueva:**
```sql
CREATE TABLE label_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  style jsonb NOT NULL,       -- LabelStyle completo
  paper_size text DEFAULT 'carta',
  label_width_mm numeric DEFAULT 80,
  label_height_mm numeric DEFAULT 40,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE label_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant isolation" ON label_templates
  USING (business_id = (SELECT business_id FROM profiles WHERE id = auth.uid()));
```

**Archivos a modificar/crear:**
```
src/features/labels/components/
  LabelStylePanel.tsx                     ← añadir: guardar/cargar plantilla, tamaño
  TemplatePicker.tsx                      ← dropdown con plantillas guardadas
src/features/labels/services/
  templateService.ts                      ← save(), list(), delete(), load()
src/app/globals.css                       ← variables CSS dinámicas para tamaño
```

---

## Orden de ejecución

```
FASE 1: Landing Page          (1-2 días)  ← máximo impacto, mínima complejidad
FASE 2: Perfil + Logo         (2-3 días)  ← diferenciador para retención
FASE 3: Pagos con Polar       (2-3 días)  ← monetización
FASE 4: Plantillas + Tamaño   (2-3 días)  ← retención y stickiness
```

---

## Decisiones de arquitectura

| Decisión | Elección | Razón |
|----------|----------|-------|
| Landing en mismo repo | Sí, `src/app/page.tsx` | No hay motivo para separar |
| Storage de logos | Supabase Storage | Ya tenemos Supabase, gratis hasta 1GB |
| Pagos | Polar (ya en stack) | Merchant of Record, maneja impuestos globales |
| Plantillas plan Básico | localStorage | No requiere Supabase, funciona offline |
| Plantillas plan Pro | Supabase tabla | Sync entre dispositivos |
| Feature flags | Columna `plan` en DB | Simple, no need para un servicio externo |

---

## Criterios de éxito

- [ ] Fase 1: Un visitante entiende el producto en 10 segundos y puede registrarse
- [ ] Fase 2: Las etiquetas impresas muestran el logo del negocio sin configuración adicional
- [ ] Fase 3: El checkout de Polar funciona y actualiza el plan automáticamente por webhook
- [ ] Fase 4: Un cliente puede guardar su diseño y cargarlo en la próxima sesión en < 3 clics

---

## Anti-patrones a evitar

- No hacer la landing con animaciones pesadas que demoren el LCP (sin videos autoplay)
- No conectar pagos antes de tener al menos 3 clientes reales (validar primero)
- No guardar el logo en la tabla como base64 (usar Supabase Storage siempre)
- No mezclar lógica de plan dentro de los componentes (centralizar en `usePlan` hook)
- No eliminar el comportamiento sin logo (muchos clientes no tienen logo digital)

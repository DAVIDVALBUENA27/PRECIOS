import * as XLSX from 'xlsx'
import { RawProduct, ColMapping } from '@/features/labels/types'
import { parseContent, calcUnitPrice } from './unitPrice'

/**
 * Decodifica un CSV probando las codificaciones que usan los POS y Excel,
 * y se queda con la que produzca texto español creíble.
 *
 * Excel guarda CSV en cuatro sabores según la opción elegida:
 *   "CSV UTF-8"        → utf-8        ("ó" = C3 B3)
 *   "CSV (delimitado)" → windows-1252 ("ó" = F3)
 *   "CSV (Macintosh)"  → macintosh    ("ó" = 97)
 *   "CSV (MS-DOS)"     → cp850        ("ó" = A2)
 * Leerlos todos como UTF-8 rompe los acentos ("Código" → "C?digo").
 */

// CP850/CP437, tramo 0x80–0xA8: el que trae las letras acentuadas.
const CP850_HIGH = 'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿'

function decodeCp850(bytes: Uint8Array): string {
  let out = ''
  for (const b of bytes) {
    if (b < 0x80) out += String.fromCharCode(b)
    else if (b <= 0xa8) out += CP850_HIGH[b - 0x80]
    else out += '�'
  }
  return out
}

/** Acentos y signos que sí esperamos en un archivo en español. */
const SPANISH_CHARS = new Set([...'áéíóúüñÁÉÍÓÚÜÑ¿¡ºª°€£$%&«»'])

/**
 * Cuenta los caracteres que delatan una decodificación equivocada:
 * cualquier símbolo fuera del ASCII que no sea propio del español.
 */
function garbageScore(text: string): number {
  let score = 0
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    if (code < 0x80) continue
    if (SPANISH_CHARS.has(ch)) continue
    score += code === 0xfffd ? 3 : 1
  }
  return score
}

export function decodeCsv(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder('utf-8').decode(buffer)
  // Sin carácter de reemplazo, el archivo era UTF-8 válido: no tocamos nada.
  if (!utf8.includes('�')) return utf8

  const candidates: string[] = [utf8]

  for (const encoding of ['windows-1252', 'macintosh']) {
    try {
      candidates.push(new TextDecoder(encoding).decode(buffer))
    } catch {
      // Codificación no soportada por el navegador: se ignora.
    }
  }
  candidates.push(decodeCp850(new Uint8Array(buffer)))

  // Gana la que menos basura produzca; en empate se queda la primera (UTF-8).
  return candidates.reduce((best, candidate) =>
    garbageScore(candidate) < garbageScore(best) ? candidate : best
  )
}

export function parseWorkbook(buffer: ArrayBuffer | string, isCsv: boolean): string[][] {
  const wb = isCsv
    ? XLSX.read(buffer as string, { type: 'string' })
    : XLSX.read(new Uint8Array(buffer as ArrayBuffer), { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][]
}

export function autoDetectColumns(headers: string[]): Partial<ColMapping> {
  // Normalizar encabezados (quitar acentos, caracteres extraños y tolerar problemas de codificación como cdigo)
  const cleanHeaders = headers.map(h => 
    h.toLowerCase()
     .normalize('NFD')
     .replace(/[\u0300-\u036f]/g, '')
     .replace(/[^a-z0-9\s]/g, 'o') // Reemplaza caracteres raros como  con 'o' (ej. cdigo -> codigo)
     .trim()
  )

  const findIndex = (keywords: string[], excludeKeywords: string[] = []) => {
    // Primero buscar coincidencia exacta
    let idx = cleanHeaders.findIndex(h => 
      keywords.some(k => h === k)
    )
    if (idx >= 0) return idx

    // Luego buscar coincidencia parcial excluyendo ciertas palabras
    idx = cleanHeaders.findIndex(h => 
      keywords.some(k => h.includes(k)) && 
      !excludeKeywords.some(ek => h.includes(ek))
    )
    return idx >= 0 ? idx : undefined
  }

  const sku = findIndex(['sku', 'codigo barras', 'barcode', 'codigo producto', 'codigo', 'code', 'referencia', 'ref', 'cod'])
  const name = findIndex(['nombre producto', 'nombre', 'descripcion', 'articulo', 'name', 'producto'], ['codigo', 'grupo'])
  const price = findIndex(['precio venta', 'valor caja contado', 'precio', 'price', 'pvp', 'valor', 'venta'], ['anterior', 'costo'])
  // 'grupo', 'categoria' y 'familia' cubren los POS que llaman así a la línea
  // del producto (ej. "Nombre Grupo I"). Se excluyen los códigos de grupo.
  const lab = findIndex(
    ['laboratorio', 'marca', 'lab', 'brand', 'fabricante', 'linea', 'grupo', 'categoria', 'familia'],
    ['codigo', 'cod ', 'id']
  )
  const content = findIndex(['contenido', 'presentacion', 'tamano', 'peso', 'volumen', 'content'])

  return { name, sku, price, lab, content }
}

/**
 * Intenta extraer la presentación/contenido directamente del nombre del producto.
 * Ej: "CERA SQUASH MOLDEADORA MATE 85GRS"  → "85 GRS"
 *     "COLONIA ARRURRU AZUL 120 ML"         → "120 ML"
 *     "JAB.INTIMO SALVIA Y CALEND.210ML"    → "210 ML"
 * Devuelve null si no encuentra ningún patrón de peso/volumen.
 */
function extractContentFromName(name: string): string | null {
  // Alternativas de unidades (coincide con UNIT_ALIASES de unitPrice.ts)
  const unitPat = [
    'gr(?:s|amos?)?', 'g(?:ramos?)?',
    'ml(?:s)?', 'mililitro(?:s)?', 'cc',
    'kg(?:s)?', 'kilo(?:gramos?)?', 'kilos?',
    'l(?:ts?|itro(?:s)?)?',
    'un(?:id(?:ades?)?)?', 'u(?:nidad(?:es?)?)?',
  ].join('|')

  const regex = new RegExp(`\\b(\\d+(?:[.,]\\d+)?)\\s*(${unitPat})\\b`, 'i')
  const match = name.match(regex)
  if (!match) return null
  return `${match[1]} ${match[2]}`.trim()
}

/**
 * Convierte las filas en productos.
 * `includeExtras` limita qué columnas sin rol se guardan como datos extra;
 * si no se pasa, se incluyen todas (comportamiento por defecto).
 */
export function rowsToProducts(
  rows: string[][],
  map: ColMapping,
  headers: string[],
  includeExtras?: Set<string>
): RawProduct[] {
  const mappedIndices = new Set([
    map.name,
    map.sku,
    map.price,
    map.lab !== null ? map.lab : -1,
    map.content !== null ? map.content : -1,
  ].filter(idx => idx !== -1))

  return rows.slice(1)
    .filter(r => r[map.name] || r[map.sku])
    .map(r => {
      const price = parsePrice(r[map.price])
      const productName = String(r[map.name] ?? '').trim()

      // Contenido: columna mapeada → extracción del nombre → null
      const contentRaw =
        map.content !== null
          ? String(r[map.content] ?? '').trim() || null
          : extractContentFromName(productName)

      const contentParsed = parseContent(contentRaw)
      
      // Capturar columnas extra dinámicamente
      const extra: Record<string, string> = {}
      headers.forEach((header, index) => {
        const key = header?.trim()
        if (mappedIndices.has(index) || !key) return
        if (includeExtras && !includeExtras.has(key)) return
        extra[key] = String(r[index] ?? '').trim()
      })

      return {
        name: productName,
        sku: String(r[map.sku] ?? '').trim(),
        price,
        lab: map.lab !== null
          ? String(r[map.lab] ?? 'Sin laboratorio').trim()
          : 'Sin laboratorio',
        contentRaw,
        contentParsed,
        unitPrice: calcUnitPrice(price, contentParsed),
        extra,
      }
    })
    .filter(p => p.name || p.sku)
}

function parsePrice(v: unknown): number | null {
  if (v === '' || v == null) return null
  
  // Si ya es un número, manejarlo de inmediato
  if (typeof v === 'number') {
    if (v < 1000) {
      return v * 1000
    }
    return v
  }

  let str = String(v).trim()
  if (!str) return null

  // Limpiar caracteres extraños pero mantener números, puntos y comas
  str = str.replace(/[^0-9,.]/g, '')

  // Identificar el estilo de miles y decimales
  if (str.includes('.') && str.includes(',')) {
    const dotIdx = str.indexOf('.')
    const commaIdx = str.indexOf(',')
    if (dotIdx < commaIdx) {
      // Formato colombiano: 34.800,00 -> quitar punto, reemplazar coma con punto
      str = str.replace(/\./g, '').replace(',', '.')
    } else {
      // Formato estadounidense: 34,800.00 -> quitar coma
      str = str.replace(/,/g, '')
    }
  } else if (str.includes(',')) {
    // Solo tiene coma (ej. 34,800 o 34,8)
    const parts = str.split(',')
    if (parts[1].length === 3) {
      // Parece miles (ej. 34,800) -> quitar coma
      str = str.replace(/,/g, '')
    } else {
      // Parece decimal (ej. 34,8) -> reemplazar coma por punto
      str = str.replace(',', '.')
    }
  } else if (str.includes('.')) {
    // Solo tiene punto (ej. 34.800 o 34.8)
    const parts = str.split('.')
    if (parts[1].length === 3) {
      // Parece miles (ej. 34.800) -> quitar punto
      str = str.replace(/\./g, '')
    }
  }

  let n = parseFloat(str)
  if (isNaN(n)) return null

  // Corrección si se importó como decimal de miles (ej. 34.8 -> 34800, o 13 -> 13000)
  if (n < 1000) {
    n = n * 1000
  }

  return n
}

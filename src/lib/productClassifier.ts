import type { Category } from '../types'

const GROUP_KEYWORDS: Array<{ category: string; words: string[] }> = [
  {
    category: 'Bebidas',
    words: ['cafe', 'café', 'te', 'té', 'leche', 'jugo', 'refresco', 'agua', 'bebida', 'cocoa', 'chocolate', 'horchata'],
  },
  {
    category: 'Limpieza',
    words: ['cloro', 'desinfectante', 'limpiador', 'esponja', 'escoba', 'trapeador', 'basura', 'lavaplatos', 'detergente de cocina'],
  },
  {
    category: 'Lavandería',
    words: ['suavizante', 'detergente de ropa', 'quitamanchas', 'blanqueador', 'ropa'],
  },
  {
    category: 'Higiene',
    words: ['papel higienico', 'papel higiénico', 'shampoo', 'champu', 'champú', 'jabon', 'jabón', 'pasta dental', 'cepillo dental', 'desodorante', 'toalla sanitaria', 'acondicionador'],
  },
  {
    category: 'Mascotas',
    words: ['mascota', 'perro', 'gato', 'croqueta', 'arena sanitaria'],
  },
  {
    category: 'Botiquín',
    words: ['curita', 'gasa', 'algodon', 'algodón', 'alcohol', 'termometro', 'termómetro', 'venda'],
  },
  {
    category: 'Hogar',
    words: ['bombillo', 'bateria', 'batería', 'bolsa', 'servilleta', 'papel aluminio', 'foco', 'fosforo', 'fósforo', 'vela'],
  },
  {
    category: 'Alimentos',
    words: ['arroz', 'frijol', 'azucar', 'azúcar', 'sal', 'aceite', 'harina', 'pasta', 'huevo', 'pan', 'cereal', 'queso', 'carne', 'pollo', 'pescado', 'verdura', 'fruta', 'salsa', 'condimento'],
  },
]

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim()
}

export function suggestCategory(productName: string, categories: Category[]): Category | null {
  const name = normalize(productName)
  if (name.length < 2) return null

  const match = GROUP_KEYWORDS.find((group) => group.words.some((word) => name.includes(normalize(word))))
  if (!match) return null

  return categories.find((category) => normalize(category.name) === normalize(match.category)) ?? null
}

export function categoryExplanation(productName: string, category: Category | null): string {
  if (!category || !productName.trim()) return ''
  return `Sugerido automáticamente como ${category.name}. Puedes cambiarlo.`
}

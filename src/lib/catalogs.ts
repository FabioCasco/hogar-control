import type { AppView, HouseholdRole } from '../types'

export const DEFAULT_CATEGORIES = [
  { name: 'Alimentos', icon: '🍚' },
  { name: 'Bebidas', icon: '🥤' },
  { name: 'Limpieza', icon: '🧽' },
  { name: 'Higiene', icon: '🧴' },
  { name: 'Lavandería', icon: '🧺' },
  { name: 'Mascotas', icon: '🐾' },
  { name: 'Hogar', icon: '🏠' },
  { name: 'Botiquín', icon: '🩹' },
  { name: 'Otros', icon: '📦' },
] as const

export const DEFAULT_LOCATIONS = [
  { name: 'Despensa', icon: '▤' },
  { name: 'Refrigerador', icon: '❄' },
  { name: 'Congelador', icon: '❄' },
  { name: 'Cocina', icon: '🍳' },
  { name: 'Baño principal', icon: '🛁' },
  { name: 'Baño secundario', icon: '🛁' },
  { name: 'Lavandería', icon: '🧺' },
  { name: 'Bodega', icon: '📦' },
  { name: 'Mascotas', icon: '🐾' },
  { name: 'Botiquín', icon: '🩹' },
  { name: 'Otro', icon: '⌂' },
] as const

export const UNITS = [
  ['unidad', 'Unidad'],
  ['paquete', 'Paquete'],
  ['bolsa', 'Bolsa'],
  ['botella', 'Botella'],
  ['caja', 'Caja'],
  ['cartón', 'Cartón'],
  ['lata', 'Lata'],
  ['frasco', 'Frasco'],
  ['rollo', 'Rollo'],
  ['galón', 'Galón'],
  ['libra', 'Libra'],
  ['kilogramo', 'Kilogramo'],
  ['litro', 'Litro'],
] as const

export const UNIT_LABELS: Record<string, [string, string]> = {
  unidad: ['unidad', 'unidades'],
  paquete: ['paquete', 'paquetes'],
  bolsa: ['bolsa', 'bolsas'],
  botella: ['botella', 'botellas'],
  caja: ['caja', 'cajas'],
  cartón: ['cartón', 'cartones'],
  lata: ['lata', 'latas'],
  frasco: ['frasco', 'frascos'],
  rollo: ['rollo', 'rollos'],
  galón: ['galón', 'galones'],
  libra: ['libra', 'libras'],
  kilogramo: ['kilogramo', 'kilogramos'],
  litro: ['litro', 'litros'],
}

export const PAGE_META: Record<AppView, { eyebrow: string; title: string; subtitle: string }> = {
  dashboard: {
    eyebrow: 'Resumen compartido',
    title: 'Inicio',
    subtitle: 'Lo importante de tu hogar, sincronizado para todos.',
  },
  inventory: {
    eyebrow: 'Existencias del hogar',
    title: 'Inventario',
    subtitle: 'Busca, clasifica y actualiza los productos en tiempo real.',
  },
  shopping: {
    eyebrow: 'Reposición inteligente',
    title: 'Lista de compras',
    subtitle: 'Las existencias bajas se convierten en acciones concretas.',
  },
  history: {
    eyebrow: 'Trazabilidad compartida',
    title: 'Movimientos',
    subtitle: 'Consulta quién modificó el inventario y cuándo lo hizo.',
  },
  settings: {
    eyebrow: 'Administración del hogar',
    title: 'Ajustes',
    subtitle: 'Miembros, invitaciones, copias y configuración general.',
  },
}

export const ROLE_LABELS: Record<HouseholdRole, string> = {
  admin: 'Administrador',
  family: 'Familiar',
  assistant: 'Asesora del hogar',
}

export const ROLE_DESCRIPTIONS: Record<HouseholdRole, string> = {
  admin: 'Configura el hogar, gestiona miembros y administra productos.',
  family: 'Consulta, compra y actualiza productos e inventario.',
  assistant: 'Realiza revisiones y actualiza existencias sin cambiar la configuración.',
}

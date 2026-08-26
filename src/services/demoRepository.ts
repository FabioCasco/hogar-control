import { DEFAULT_CATEGORIES, DEFAULT_LOCATIONS } from '../lib/catalogs'
import { clampNumber } from '../lib/format'
import { imageFileToDataUrl } from '../lib/image'
import type {
  Category,
  HouseholdData,
  HouseholdInvite,
  HouseholdMember,
  HouseholdRole,
  LegacyBackup,
  Location,
  Membership,
  Movement,
  MovementType,
  Product,
  ProductDraft,
  QuickStockLevel,
} from '../types'
import type { InventoryRepository } from './repository'

const STORAGE_KEY = 'hogar-control-shared-demo-v02'
const CHANGE_EVENT = 'hogar-control-demo-change'

interface DemoState {
  membership: Membership
  data: HouseholdData
}

export class DemoRepository implements InventoryRepository {
  readonly mode = 'demo' as const

  async listMemberships(userId: string): Promise<Membership[]> {
    const state = readState()
    const membership = { ...state.membership, user_id: userId || state.membership.user_id }
    if (membership.user_id !== state.membership.user_id) {
      state.membership = membership
      state.data.members = state.data.members.map((member) =>
        member.role === 'admin' ? { ...member, user_id: membership.user_id } : member,
      )
      writeState(state)
    }
    return [membership]
  }

  async createHousehold(userId: string, name: string, displayName: string): Promise<string> {
    const state = createSeedState(userId, displayName, name)
    writeState(state)
    return state.membership.household_id
  }

  async joinHousehold(userId: string, code: string, displayName: string): Promise<string> {
    const state = readState()
    const invite = state.data.invites.find(
      (item) => item.code === code.trim().toUpperCase() && !item.revoked_at && item.uses < item.max_uses,
    )
    if (!invite) throw new Error('El código no existe o ya no está disponible en la demostración.')
    const member: HouseholdMember = {
      household_id: state.membership.household_id,
      user_id: userId,
      role: invite.role,
      display_name: displayName.trim() || 'Nuevo miembro',
      created_at: nowIso(),
    }
    state.data.members.push(member)
    invite.uses += 1
    state.membership = {
      ...state.membership,
      user_id: userId,
      role: invite.role,
      display_name: member.display_name,
    }
    writeState(state)
    return state.membership.household_id
  }

  async loadHouseholdData(membership: Membership): Promise<HouseholdData> {
    const state = readState()
    assertSameHousehold(membership, state)
    return hydrateData(state.data)
  }

  subscribe(membership: Membership, onChange: () => void): () => void {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ householdId?: string }>
      if (!custom.detail?.householdId || custom.detail.householdId === membership.household_id) onChange()
    }
    window.addEventListener(CHANGE_EVENT, handler)
    return () => window.removeEventListener(CHANGE_EVENT, handler)
  }

  async saveProduct(membership: Membership, draft: ProductDraft): Promise<void> {
    assertEditor(membership)
    const state = readState()
    assertSameHousehold(membership, state)
    const current = clampNumber(draft.current_stock)
    const minimum = clampNumber(draft.minimum_stock)
    const ideal = clampNumber(draft.ideal_stock, 1)
    if (ideal <= minimum) throw new Error('El stock ideal debe ser mayor que el stock mínimo.')

    let imagePath = draft.existing_image_path ?? null
    if (draft.image_file) imagePath = await imageFileToDataUrl(draft.image_file)

    const timestamp = nowIso()
    if (draft.id) {
      const index = state.data.products.findIndex((product) => product.id === draft.id)
      if (index < 0) throw new Error('El producto ya no existe.')
      const previous = state.data.products[index]
      const updated: Product = {
        ...previous,
        name: draft.name.trim(),
        category_id: draft.category_id,
        location_id: draft.location_id,
        brand: draft.brand.trim(),
        presentation: draft.presentation.trim(),
        unit: draft.unit,
        emoji: draft.emoji.trim() || '📦',
        image_path: imagePath,
        image_url: imagePath,
        current_stock: current,
        minimum_stock: minimum,
        ideal_stock: ideal,
        on_shopping_list: current <= minimum ? true : current >= ideal ? false : draft.on_shopping_list,
        updated_by: membership.user_id,
        updated_at: timestamp,
      }
      state.data.products[index] = updated
      const delta = round(current - previous.current_stock)
      if (delta !== 0) {
        state.data.movements.unshift(
          movementFor(membership, updated, 'adjustment', delta, current, 'Cantidad modificada desde la ficha'),
        )
      }
    } else {
      const product: Product = {
        id: id(),
        household_id: membership.household_id,
        name: draft.name.trim(),
        category_id: draft.category_id,
        location_id: draft.location_id,
        brand: draft.brand.trim(),
        presentation: draft.presentation.trim(),
        unit: draft.unit,
        emoji: draft.emoji.trim() || '📦',
        image_path: imagePath,
        image_url: imagePath,
        current_stock: current,
        minimum_stock: minimum,
        ideal_stock: ideal,
        on_shopping_list: current <= minimum ? true : current >= ideal ? false : draft.on_shopping_list,
        archived: false,
        created_by: membership.user_id,
        updated_by: membership.user_id,
        created_at: timestamp,
        updated_at: timestamp,
      }
      state.data.products.push(product)
      state.data.movements.unshift(
        movementFor(membership, product, 'initial', current, current, 'Existencia inicial'),
      )
    }
    writeState(state)
  }

  async adjustStock(
    membership: Membership,
    product: Product,
    delta: number,
    type: MovementType,
    note: string,
  ): Promise<number> {
    const state = readState()
    assertSameHousehold(membership, state)
    const target = state.data.products.find((item) => item.id === product.id)
    if (!target || target.archived) throw new Error('El producto ya no está disponible.')
    const previous = target.current_stock
    const next = round(Math.max(0, previous + Number(delta)))
    const actualDelta = round(next - previous)
    target.current_stock = next
    target.updated_by = membership.user_id
    target.updated_at = nowIso()
    if (next <= target.minimum_stock) target.on_shopping_list = true
    else if (next >= target.ideal_stock) target.on_shopping_list = false
    if (actualDelta !== 0) {
      state.data.movements.unshift(movementFor(membership, target, type, actualDelta, next, note))
    }
    writeState(state)
    return next
  }

  async setShopping(membership: Membership, product: Product, enabled: boolean): Promise<void> {
    assertEditor(membership)
    const state = readState()
    assertSameHousehold(membership, state)
    const target = state.data.products.find((item) => item.id === product.id)
    if (!target) throw new Error('El producto ya no existe.')
    target.on_shopping_list = enabled
    target.updated_by = membership.user_id
    target.updated_at = nowIso()
    writeState(state)
  }

  async setQuickReview(
    membership: Membership,
    product: Product,
    level: QuickStockLevel,
  ): Promise<number> {
    const state = readState()
    assertSameHousehold(membership, state)
    const target = state.data.products.find((item) => item.id === product.id)
    if (!target) throw new Error('El producto ya no existe.')
    const previous = target.current_stock
    const next = level === 'out'
      ? 0
      : level === 'good'
        ? target.ideal_stock
        : round(target.minimum_stock + (target.ideal_stock - target.minimum_stock) / 2)
    const delta = round(next - previous)
    target.current_stock = next
    target.updated_by = membership.user_id
    target.updated_at = nowIso()
    if (level === 'out') target.on_shopping_list = true
    else if (level === 'good') target.on_shopping_list = false
    if (delta !== 0) {
      state.data.movements.unshift(
        movementFor(membership, target, 'review', delta, next, `Revisión rápida: ${level}`),
      )
    }
    writeState(state)
    return next
  }

  async archiveProduct(membership: Membership, product: Product): Promise<void> {
    assertAdmin(membership)
    const state = readState()
    assertSameHousehold(membership, state)
    const target = state.data.products.find((item) => item.id === product.id)
    if (!target) throw new Error('El producto ya no existe.')
    target.archived = true
    target.updated_by = membership.user_id
    target.updated_at = nowIso()
    state.data.movements.unshift(
      movementFor(membership, target, 'adjustment', 0, target.current_stock, 'Producto archivado'),
    )
    writeState(state)
  }

  async updateHouseholdName(membership: Membership, name: string): Promise<void> {
    assertAdmin(membership)
    const state = readState()
    assertSameHousehold(membership, state)
    const cleanName = name.trim()
    if (cleanName.length < 2) throw new Error('Escribe un nombre válido para el hogar.')
    state.membership.household.name = cleanName
    state.membership.household.updated_at = nowIso()
    writeState(state)
  }

  async createInvite(
    membership: Membership,
    role: Exclude<HouseholdRole, 'admin'>,
    maxUses: number,
  ): Promise<HouseholdInvite> {
    assertAdmin(membership)
    const state = readState()
    assertSameHousehold(membership, state)
    const invite: HouseholdInvite = {
      id: id(),
      household_id: membership.household_id,
      code: randomCode(),
      role,
      expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      max_uses: Math.max(1, Math.min(10, Math.trunc(maxUses))),
      uses: 0,
      revoked_at: null,
      created_by: membership.user_id,
      created_at: nowIso(),
    }
    state.data.invites.unshift(invite)
    writeState(state)
    return invite
  }

  async revokeInvite(membership: Membership, invite: HouseholdInvite): Promise<void> {
    assertAdmin(membership)
    const state = readState()
    assertSameHousehold(membership, state)
    const target = state.data.invites.find((item) => item.id === invite.id)
    if (!target) throw new Error('La invitación ya no existe.')
    target.revoked_at = nowIso()
    writeState(state)
  }

  async updateMemberRole(
    membership: Membership,
    member: HouseholdMember,
    role: HouseholdRole,
  ): Promise<void> {
    assertAdmin(membership)
    const state = readState()
    assertSameHousehold(membership, state)
    const target = state.data.members.find((item) => item.user_id === member.user_id)
    if (!target) throw new Error('Ese miembro ya no existe.')
    if (target.user_id === membership.user_id) throw new Error('Por seguridad, no puedes cambiar tu propio rol desde esta pantalla.')
    if (target.role === 'admin' && role !== 'admin') {
      const adminCount = state.data.members.filter((item) => item.role === 'admin').length
      if (adminCount <= 1) throw new Error('El hogar debe conservar al menos un administrador.')
    }
    target.role = role
    writeState(state)
  }

  async removeMember(membership: Membership, member: HouseholdMember): Promise<void> {
    assertAdmin(membership)
    const state = readState()
    assertSameHousehold(membership, state)
    if (member.user_id === membership.user_id) throw new Error('Por seguridad, no puedes retirarte desde esta pantalla.')
    const target = state.data.members.find((item) => item.user_id === member.user_id)
    if (!target) throw new Error('Ese miembro ya no existe.')
    if (target.role === 'admin') {
      const adminCount = state.data.members.filter((item) => item.role === 'admin').length
      if (adminCount <= 1) throw new Error('El hogar debe conservar al menos un administrador.')
    }
    state.data.members = state.data.members.filter((item) => item.user_id !== member.user_id)
    writeState(state)
  }

  async importLegacy(membership: Membership, backup: LegacyBackup): Promise<number> {
    assertEditor(membership)
    const source = backup.data ?? backup
    const products = Array.isArray(source.products) ? source.products : []
    if (!products.length) throw new Error('La copia no contiene productos para importar.')
    const state = readState()
    const otherCategory = state.data.categories.find((item) => item.name === 'Otros') ?? state.data.categories[0]
    const otherLocation = state.data.locations.find((item) => item.name === 'Otro') ?? state.data.locations[0]
    if (!otherCategory || !otherLocation) throw new Error('El hogar no tiene catálogos disponibles.')

    let imported = 0
    for (const legacy of products.slice(0, 500)) {
      const name = String(legacy.name ?? '').trim()
      if (!name) continue
      const category = state.data.categories.find(
        (item) => item.name.toLocaleLowerCase('es') === String(legacy.category ?? '').trim().toLocaleLowerCase('es'),
      ) ?? otherCategory
      const location = state.data.locations.find(
        (item) => item.name.toLocaleLowerCase('es') === String(legacy.location ?? '').trim().toLocaleLowerCase('es'),
      ) ?? otherLocation
      const minimum = clampNumber(legacy.minimum)
      const ideal = Math.max(minimum + 1, clampNumber(legacy.ideal, minimum + 1))
      await this.saveProduct(membership, {
        name,
        category_id: category.id,
        location_id: location.id,
        brand: String(legacy.brand ?? ''),
        presentation: String(legacy.presentation ?? ''),
        unit: String(legacy.unit ?? 'unidad'),
        emoji: String(legacy.emoji ?? category.icon),
        current_stock: clampNumber(legacy.current),
        minimum_stock: minimum,
        ideal_stock: ideal,
        on_shopping_list: Boolean(legacy.onShoppingList),
        existing_image_path: typeof legacy.image === 'string' && legacy.image.startsWith('data:image/') ? legacy.image : null,
      })
      imported += 1
    }
    return imported
  }
}

function readState(): DemoState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as DemoState
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }
  const state = createSeedState('demo-user', 'Fabio', 'Casa Casco')
  writeState(state)
  return state
}

function writeState(state: DemoState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { householdId: state.membership.household_id } }))
}

function createSeedState(userId: string, displayName: string, householdName: string): DemoState {
  const householdId = 'demo-household'
  const timestamp = nowIso()
  const household = {
    id: householdId,
    name: householdName,
    created_by: userId,
    created_at: timestamp,
    updated_at: timestamp,
  }
  const membership: Membership = {
    household_id: householdId,
    user_id: userId,
    role: 'admin',
    display_name: displayName,
    created_at: timestamp,
    household,
  }
  const categories: Category[] = DEFAULT_CATEGORIES.map((item, index) => ({
    id: `demo-category-${index + 1}`,
    household_id: householdId,
    name: item.name,
    icon: item.icon,
    sort_order: index,
    active: true,
  }))
  const locations: Location[] = DEFAULT_LOCATIONS.map((item, index) => ({
    id: `demo-location-${index + 1}`,
    household_id: householdId,
    name: item.name,
    icon: item.icon,
    sort_order: index,
    active: true,
  }))
  const categoryId = (name: string) => categories.find((item) => item.name === name)?.id ?? categories[0].id
  const locationId = (name: string) => locations.find((item) => item.name === name)?.id ?? locations[0].id
  const productSeeds = [
    ['Papel higiénico', 'Higiene', 'Baño principal', 'paquete', '🧻', 0, 1, 4, true, 'Paquete de 12 rollos'],
    ['Leche', 'Alimentos', 'Refrigerador', 'botella', '🥛', 1, 2, 5, false, '1 litro'],
    ['Detergente', 'Lavandería', 'Lavandería', 'bolsa', '🧺', 2, 2, 5, false, 'Polvo'],
    ['Café', 'Alimentos', 'Despensa', 'paquete', '☕', 3, 2, 5, false, 'Molido 500 g'],
    ['Arroz', 'Alimentos', 'Despensa', 'bolsa', '🍚', 5, 2, 5, false, '5 libras'],
    ['Huevos', 'Alimentos', 'Refrigerador', 'cartón', '🥚', 1, 1, 3, true, 'Cartón de 30'],
    ['Cloro', 'Limpieza', 'Bodega', 'botella', '🧴', 4, 1, 4, false, '1 galón'],
    ['Jabón para platos', 'Limpieza', 'Cocina', 'botella', '🫧', 2, 1, 3, false, '750 ml'],
    ['Agua embotellada', 'Bebidas', 'Bodega', 'paquete', '💧', 1, 2, 6, false, 'Paquete'],
    ['Comida para perro', 'Mascotas', 'Mascotas', 'bolsa', '🐶', 4, 1, 4, false, 'Bolsa grande'],
    ['Pasta dental', 'Higiene', 'Baño principal', 'caja', '🪥', 2, 1, 4, false, 'Tubo'],
    ['Bolsas para basura', 'Hogar', 'Cocina', 'rollo', '🗑️', 1, 1, 4, false, 'Rollo grande'],
  ] as const
  const products: Product[] = productSeeds.map((seed, index) => ({
    id: `demo-product-${index + 1}`,
    household_id: householdId,
    name: seed[0],
    category_id: categoryId(seed[1]),
    location_id: locationId(seed[2]),
    brand: '',
    presentation: seed[9],
    unit: seed[3],
    emoji: seed[4],
    image_path: null,
    image_url: null,
    current_stock: seed[5],
    minimum_stock: seed[6],
    ideal_stock: seed[7],
    on_shopping_list: seed[8],
    archived: false,
    created_by: userId,
    updated_by: userId,
    created_at: timestamp,
    updated_at: timestamp,
  }))
  const movements: Movement[] = products.slice(0, 5).map((product, index) => ({
    id: `demo-movement-${index + 1}`,
    household_id: householdId,
    product_id: product.id,
    product_name: product.name,
    type: index % 2 ? 'consumption' : 'purchase',
    delta: index % 2 ? -1 : 2,
    quantity_after: product.current_stock,
    note: index % 2 ? 'Consumo diario' : 'Compra semanal',
    created_by: userId,
    actor_name: displayName,
    created_at: new Date(Date.now() - index * 86_400_000).toISOString(),
  }))
  return {
    membership,
    data: {
      categories,
      locations,
      products,
      movements,
      members: [
        {
          household_id: householdId,
          user_id: userId,
          role: 'admin',
          display_name: displayName,
          created_at: timestamp,
        },
        {
          household_id: householdId,
          user_id: 'demo-assistant',
          role: 'assistant',
          display_name: 'María',
          created_at: timestamp,
        },
      ],
      invites: [],
    },
  }
}

function hydrateData(data: HouseholdData): HouseholdData {
  const categoryMap = new Map(data.categories.map((item) => [item.id, item]))
  const locationMap = new Map(data.locations.map((item) => [item.id, item]))
  return {
    ...structuredClone(data),
    products: data.products
      .filter((product) => !product.archived)
      .map((product) => ({
        ...structuredClone(product),
        category: categoryMap.get(product.category_id) ?? null,
        location: locationMap.get(product.location_id) ?? null,
        image_url: product.image_path,
      })),
    invites: data.invites.filter((invite) => !invite.revoked_at && new Date(invite.expires_at) > new Date()),
  }
}

function movementFor(
  membership: Membership,
  product: Product,
  type: MovementType,
  delta: number,
  quantityAfter: number,
  note: string,
): Movement {
  return {
    id: id(),
    household_id: membership.household_id,
    product_id: product.id,
    product_name: product.name,
    type,
    delta,
    quantity_after: quantityAfter,
    note,
    created_by: membership.user_id,
    actor_name: membership.display_name,
    created_at: nowIso(),
  }
}

function assertSameHousehold(membership: Membership, state: DemoState): void {
  if (membership.household_id !== state.membership.household_id) throw new Error('No tienes acceso a este hogar.')
}

function assertEditor(membership: Membership): void {
  if (membership.role === 'assistant') throw new Error('Este rol no puede cambiar la configuración de productos.')
}

function assertAdmin(membership: Membership): void {
  if (membership.role !== 'admin') throw new Error('Solo el administrador puede realizar esta acción.')
}

function nowIso(): string {
  return new Date().toISOString()
}

function id(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function randomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 12 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

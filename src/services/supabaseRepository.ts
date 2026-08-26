import { clampNumber } from '../lib/format'
import { compressProductImage } from '../lib/image'
import { requireSupabase } from '../lib/supabase'
import type {
  Category,
  Household,
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

export class SupabaseRepository implements InventoryRepository {
  readonly mode = 'cloud' as const

  async listMemberships(_userId: string): Promise<Membership[]> {
    const client = requireSupabase()
    const { data, error } = await client
      .from('household_members')
      .select(
        'household_id,user_id,role,display_name,created_at,household:households(id,name,created_by,created_at,updated_at)',
      )
      .order('created_at', { ascending: true })
    if (error) throw error
    return ((data ?? []) as Record<string, unknown>[]).map(mapMembership)
  }

  async createHousehold(_userId: string, name: string, _displayName: string): Promise<string> {
    const { data, error } = await requireSupabase().rpc('create_household', {
      p_name: name.trim(),
    })
    if (error) throw error
    const row = unwrapRpcRow<Record<string, unknown>>(data)
    return String(row.id)
  }

  async joinHousehold(_userId: string, code: string, _displayName: string): Promise<string> {
    const { data, error } = await requireSupabase().rpc('accept_household_invite', {
      p_code: code.trim().toUpperCase(),
    })
    if (error) throw error
    return String(data)
  }

  async loadHouseholdData(membership: Membership): Promise<HouseholdData> {
    const client = requireSupabase()
    const householdId = membership.household_id
    const [categoriesResult, locationsResult, productsResult, movementsResult, membersResult, invitesResult] =
      await Promise.all([
        client.from('categories').select('*').eq('household_id', householdId).eq('active', true).order('sort_order'),
        client.from('locations').select('*').eq('household_id', householdId).eq('active', true).order('sort_order'),
        client
          .from('products')
          .select('*,category:categories(*),location:locations(*)')
          .eq('household_id', householdId)
          .eq('archived', false)
          .order('name'),
        client
          .from('movements')
          .select('*')
          .eq('household_id', householdId)
          .order('created_at', { ascending: false })
          .limit(500),
        client
          .from('household_members')
          .select('*')
          .eq('household_id', householdId)
          .order('created_at', { ascending: true }),
        client
          .from('household_invites')
          .select('*')
          .eq('household_id', householdId)
          .is('revoked_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false }),
      ])

    const firstError = [
      categoriesResult.error,
      locationsResult.error,
      productsResult.error,
      movementsResult.error,
      membersResult.error,
      invitesResult.error,
    ].find(Boolean)
    if (firstError) throw firstError

    const categories = ((categoriesResult.data ?? []) as Record<string, unknown>[]).map(mapCategory)
    const locations = ((locationsResult.data ?? []) as Record<string, unknown>[]).map(mapLocation)
    const rawProducts = (productsResult.data ?? []) as Record<string, unknown>[]
    const paths = rawProducts
      .map((row) => (typeof row.image_path === 'string' ? row.image_path : ''))
      .filter(Boolean)
    const signedUrls = await createSignedImageMap(paths)

    const members = ((membersResult.data ?? []) as Record<string, unknown>[]).map(mapMember)
    const memberNames = new Map(members.map((member) => [member.user_id, member.display_name]))

    return {
      categories,
      locations,
      products: rawProducts.map((row) => mapProduct(row, signedUrls)),
      movements: ((movementsResult.data ?? []) as Record<string, unknown>[]).map((row) => mapMovement(row, memberNames)),
      members,
      invites: ((invitesResult.data ?? []) as Record<string, unknown>[]).map(mapInvite),
    }
  }

  subscribe(membership: Membership, onChange: () => void): () => void {
    const client = requireSupabase()
    const householdId = membership.household_id
    const channel = client
      .channel(`hogar-control:${householdId}:${crypto.randomUUID?.() ?? Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products', filter: `household_id=eq.${householdId}` },
        onChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'movements', filter: `household_id=eq.${householdId}` },
        onChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories', filter: `household_id=eq.${householdId}` },
        onChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'locations', filter: `household_id=eq.${householdId}` },
        onChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'household_members', filter: `household_id=eq.${householdId}` },
        onChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'household_invites', filter: `household_id=eq.${householdId}` },
        onChange,
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }

  async saveProduct(membership: Membership, draft: ProductDraft): Promise<void> {
    assertEditor(membership)
    const client = requireSupabase()
    const currentStock = clampNumber(draft.current_stock)
    const minimumStock = clampNumber(draft.minimum_stock)
    const idealStock = clampNumber(draft.ideal_stock, 1)
    if (!draft.name.trim()) throw new Error('El nombre del producto es obligatorio.')
    if (!draft.category_id || !draft.location_id) throw new Error('Selecciona categoría y ubicación.')
    if (idealStock <= minimumStock) throw new Error('El stock ideal debe ser mayor que el mínimo.')

    let imagePath = draft.existing_image_path ?? null
    let uploadedPath: string | null = null
    if (draft.image_file) {
      const blob = await compressProductImage(draft.image_file)
      const extension = blob.type === 'image/webp' ? 'webp' : 'jpg'
      uploadedPath = `${membership.household_id}/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await client.storage.from('product-images').upload(uploadedPath, blob, {
        contentType: blob.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      })
      if (uploadError) throw uploadError
      imagePath = uploadedPath
    }

    let previousImagePath: string | null = null
    if (draft.id) {
      const { data, error } = await client
        .from('products')
        .select('image_path')
        .eq('id', draft.id)
        .single()
      if (error) {
        if (uploadedPath) await removeStorageObject(uploadedPath)
        throw error
      }
      previousImagePath = typeof data.image_path === 'string' ? data.image_path : null
    }

    const { error } = await client.rpc('save_product', {
      p_household_id: membership.household_id,
      p_name: draft.name.trim(),
      p_category_id: draft.category_id,
      p_location_id: draft.location_id,
      p_brand: draft.brand.trim(),
      p_presentation: draft.presentation.trim(),
      p_unit: draft.unit,
      p_emoji: draft.emoji.trim() || '📦',
      p_image_path: imagePath,
      p_current_stock: currentStock,
      p_minimum_stock: minimumStock,
      p_ideal_stock: idealStock,
      p_on_shopping_list: currentStock <= minimumStock ? true : currentStock >= idealStock ? false : draft.on_shopping_list,
      p_product_id: draft.id ?? null,
    })
    if (error) {
      if (uploadedPath) await removeStorageObject(uploadedPath)
      throw error
    }

    const oldPath = previousImagePath ?? draft.original_image_path ?? null
    if (oldPath && oldPath !== imagePath) await removeStorageObject(oldPath)
  }

  async adjustStock(
    _membership: Membership,
    product: Product,
    delta: number,
    type: MovementType,
    note: string,
  ): Promise<number> {
    const { data, error } = await requireSupabase().rpc('adjust_product_stock', {
      p_product_id: product.id,
      p_delta: Number(delta),
      p_type: type,
      p_note: note,
    })
    if (error) throw error
    const row = unwrapRpcRow<Record<string, unknown>>(data)
    return Number(row.current_stock ?? product.current_stock)
  }

  async setShopping(membership: Membership, product: Product, enabled: boolean): Promise<void> {
    assertEditor(membership)
    const { error } = await requireSupabase().rpc('set_product_shopping', {
      p_product_id: product.id,
      p_value: enabled,
    })
    if (error) throw error
  }

  async setQuickReview(
    _membership: Membership,
    product: Product,
    level: QuickStockLevel,
  ): Promise<number> {
    const databaseLevel = level === 'good' ? 'available' : level
    const { data, error } = await requireSupabase().rpc('set_product_review_level', {
      p_product_id: product.id,
      p_level: databaseLevel,
    })
    if (error) throw error
    const row = unwrapRpcRow<Record<string, unknown>>(data)
    return Number(row.current_stock ?? product.current_stock)
  }

  async archiveProduct(membership: Membership, product: Product): Promise<void> {
    assertAdmin(membership)
    const { error } = await requireSupabase().rpc('archive_product', { p_product_id: product.id })
    if (error) throw error
  }

  async updateHouseholdName(membership: Membership, name: string): Promise<void> {
    assertAdmin(membership)
    const cleanName = name.trim()
    if (cleanName.length < 2) throw new Error('Escribe un nombre válido para el hogar.')
    const { error } = await requireSupabase().rpc('rename_household', {
      p_household_id: membership.household_id,
      p_name: cleanName,
    })
    if (error) throw error
  }

  async createInvite(
    membership: Membership,
    role: Exclude<HouseholdRole, 'admin'>,
    maxUses: number,
  ): Promise<HouseholdInvite> {
    assertAdmin(membership)
    const { data, error } = await requireSupabase().rpc('create_household_invite', {
      p_household_id: membership.household_id,
      p_role: role,
      p_expires_days: 7,
      p_max_uses: Math.max(1, Math.min(10, Math.trunc(maxUses))),
    })
    if (error) throw error
    return mapInvite(unwrapRpcRow<Record<string, unknown>>(data))
  }

  async revokeInvite(membership: Membership, invite: HouseholdInvite): Promise<void> {
    assertAdmin(membership)
    const { error } = await requireSupabase().rpc('revoke_household_invite', {
      p_invite_id: invite.id,
    })
    if (error) throw error
  }

  async updateMemberRole(
    membership: Membership,
    member: HouseholdMember,
    role: HouseholdRole,
  ): Promise<void> {
    assertAdmin(membership)
    const { error } = await requireSupabase().rpc('set_household_member_role', {
      p_household_id: membership.household_id,
      p_user_id: member.user_id,
      p_role: role,
    })
    if (error) throw error
  }

  async removeMember(membership: Membership, member: HouseholdMember): Promise<void> {
    assertAdmin(membership)
    const { error } = await requireSupabase().rpc('remove_household_member', {
      p_household_id: membership.household_id,
      p_user_id: member.user_id,
    })
    if (error) throw error
  }

  async importLegacy(membership: Membership, backup: LegacyBackup): Promise<number> {
    assertEditor(membership)
    const source = backup.data ?? backup
    const legacyProducts = Array.isArray(source.products) ? source.products : []
    if (!legacyProducts.length) throw new Error('La copia no contiene productos para importar.')
    const data = await this.loadHouseholdData(membership)
    const fallbackCategory = data.categories.find((item) => item.name === 'Otros') ?? data.categories[0]
    const fallbackLocation = data.locations.find((item) => item.name === 'Otro') ?? data.locations[0]
    if (!fallbackCategory || !fallbackLocation) throw new Error('El hogar no tiene catálogos disponibles.')

    let imported = 0
    for (const legacy of legacyProducts.slice(0, 500)) {
      const name = String(legacy.name ?? '').trim()
      if (!name) continue
      const category = findNamed(data.categories, String(legacy.category ?? '')) ?? fallbackCategory
      const location = findNamed(data.locations, String(legacy.location ?? '')) ?? fallbackLocation
      const minimum = clampNumber(legacy.minimum)
      const ideal = Math.max(minimum + 1, clampNumber(legacy.ideal, minimum + 1))
      let imageFile: File | null = null
      if (typeof legacy.image === 'string' && legacy.image.startsWith('data:image/')) {
        imageFile = await dataUrlToFile(legacy.image)
      }
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
        image_file: imageFile,
      })
      imported += 1
    }
    return imported
  }
}

async function createSignedImageMap(paths: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths)]
  if (!unique.length) return new Map()
  const { data, error } = await requireSupabase().storage.from('product-images').createSignedUrls(unique, 60 * 60)
  if (error) {
    console.warn('No fue posible generar enlaces temporales para algunas fotografías.', error)
    return new Map()
  }
  const result = new Map<string, string>()
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) result.set(item.path, item.signedUrl)
  }
  return result
}

async function removeStorageObject(path: string): Promise<void> {
  if (!path || path.startsWith('data:image/')) return
  const { error } = await requireSupabase().storage.from('product-images').remove([path])
  if (error) console.warn(`No se pudo eliminar la fotografía anterior: ${path}`, error)
}

function mapMembership(row: Record<string, unknown>): Membership {
  const rawHousehold = row.household ?? row.households
  const householdRow = Array.isArray(rawHousehold) ? rawHousehold[0] : rawHousehold
  if (!householdRow || typeof householdRow !== 'object') throw new Error('No fue posible leer el hogar asociado.')
  return {
    household_id: String(row.household_id),
    user_id: String(row.user_id),
    role: row.role as HouseholdRole,
    display_name: String(row.display_name ?? 'Miembro'),
    created_at: String(row.created_at),
    household: mapHousehold(householdRow as Record<string, unknown>),
  }
}

function mapHousehold(row: Record<string, unknown>): Household {
  return {
    id: String(row.id),
    name: String(row.name),
    created_by: String(row.created_by),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

function mapCategory(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    household_id: String(row.household_id),
    name: String(row.name),
    icon: String(row.icon ?? '📦'),
    sort_order: Number(row.sort_order ?? 0),
    active: Boolean(row.active),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  }
}

function mapLocation(row: Record<string, unknown>): Location {
  return {
    id: String(row.id),
    household_id: String(row.household_id),
    name: String(row.name),
    icon: String(row.icon ?? '⌂'),
    sort_order: Number(row.sort_order ?? 0),
    active: Boolean(row.active),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  }
}

function mapProduct(row: Record<string, unknown>, signedUrls: Map<string, string>): Product {
  const categoryRaw = Array.isArray(row.category) ? row.category[0] : row.category
  const locationRaw = Array.isArray(row.location) ? row.location[0] : row.location
  const imagePath = typeof row.image_path === 'string' ? row.image_path : null
  return {
    id: String(row.id),
    household_id: String(row.household_id),
    name: String(row.name),
    category_id: String(row.category_id),
    location_id: String(row.location_id),
    brand: String(row.brand ?? ''),
    presentation: String(row.presentation ?? ''),
    unit: String(row.unit ?? 'unidad'),
    emoji: String(row.emoji ?? '📦'),
    image_path: imagePath,
    image_url: imagePath ? signedUrls.get(imagePath) ?? null : null,
    current_stock: Number(row.current_stock ?? 0),
    minimum_stock: Number(row.minimum_stock ?? 0),
    ideal_stock: Number(row.ideal_stock ?? 1),
    on_shopping_list: Boolean(row.on_shopping_list),
    archived: Boolean(row.archived),
    created_by: String(row.created_by),
    updated_by: String(row.updated_by),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    category: categoryRaw && typeof categoryRaw === 'object' ? mapCategory(categoryRaw as Record<string, unknown>) : null,
    location: locationRaw && typeof locationRaw === 'object' ? mapLocation(locationRaw as Record<string, unknown>) : null,
  }
}

function mapMovement(row: Record<string, unknown>, memberNames: Map<string, string>): Movement {
  return {
    id: String(row.id),
    household_id: String(row.household_id),
    product_id: row.product_id ? String(row.product_id) : null,
    product_name: String(row.product_name),
    type: row.type as MovementType,
    delta: Number(row.delta ?? 0),
    quantity_after: Number(row.quantity_after ?? 0),
    note: String(row.note ?? ''),
    created_by: String(row.created_by),
    actor_name: memberNames.get(String(row.created_by)) ?? 'Usuario',
    created_at: String(row.created_at),
  }
}

function mapMember(row: Record<string, unknown>): HouseholdMember {
  return {
    household_id: String(row.household_id),
    user_id: String(row.user_id),
    role: row.role as HouseholdRole,
    display_name: String(row.display_name ?? 'Miembro'),
    created_at: String(row.created_at),
  }
}

function mapInvite(row: Record<string, unknown>): HouseholdInvite {
  return {
    id: String(row.id),
    household_id: String(row.household_id),
    code: String(row.code),
    role: row.role as Exclude<HouseholdRole, 'admin'>,
    expires_at: String(row.expires_at),
    max_uses: Number(row.max_uses ?? 1),
    uses: Number(row.uses ?? 0),
    revoked_at: row.revoked_at ? String(row.revoked_at) : null,
    created_by: String(row.created_by),
    created_at: String(row.created_at),
  }
}

function unwrapRpcRow<T = unknown>(value: unknown): T {
  if (Array.isArray(value)) return value[0] as T
  return value as T
}

function findNamed<T extends { name: string }>(items: T[], candidate: string): T | undefined {
  const normalized = candidate.trim().toLocaleLowerCase('es')
  return items.find((item) => item.name.trim().toLocaleLowerCase('es') === normalized)
}

async function dataUrlToFile(dataUrl: string): Promise<File> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return new File([blob], 'producto-migrado', { type: blob.type || 'image/jpeg' })
}

function assertEditor(membership: Membership): void {
  if (membership.role === 'assistant') throw new Error('Este rol no puede cambiar la configuración de productos.')
}

function assertAdmin(membership: Membership): void {
  if (membership.role !== 'admin') throw new Error('Solo el administrador puede realizar esta acción.')
}

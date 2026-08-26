import { requireSupabase } from '../lib/supabase'
import type {
  BasicCatalogResult,
  BasicCatalogSummary,
  HouseholdRole,
  Membership,
  Product,
  SharedAccessAccount,
} from '../types'

function assertCloudAdmin(membership: Membership) {
  if (membership.role !== 'admin') throw new Error('Solo un administrador puede realizar esta acción.')
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  return {}
}

function mapSharedAccount(value: unknown): SharedAccessAccount {
  const row = toRecord(value)
  return {
    id: String(row.id ?? ''),
    household_id: String(row.household_id ?? ''),
    user_id: String(row.user_id ?? ''),
    username: String(row.username ?? ''),
    display_name: String(row.display_name ?? 'Miembro'),
    role: row.role === 'assistant' ? 'assistant' : 'family',
    active: Boolean(row.active),
    created_by: String(row.created_by ?? ''),
    created_at: String(row.created_at ?? new Date().toISOString()),
    last_key_rotated_at: row.last_key_rotated_at ? String(row.last_key_rotated_at) : null,
  }
}

async function removeImages(paths: string[]) {
  const cleanPaths = [...new Set(paths.filter(Boolean))]
  if (!cleanPaths.length) return
  const client = requireSupabase()
  for (let index = 0; index < cleanPaths.length; index += 100) {
    const { error } = await client.storage.from('product-images').remove(cleanPaths.slice(index, index + 100))
    if (error) console.warn('No fue posible retirar algunas fotografías eliminadas.', error)
  }
}

export async function deleteProductPermanently(membership: Membership, product: Product): Promise<void> {
  assertCloudAdmin(membership)
  const { data, error } = await requireSupabase().rpc('delete_product', { p_product_id: product.id })
  if (error) throw error
  if (typeof data === 'string' && data) await removeImages([data])
}

export async function deleteAllProducts(membership: Membership): Promise<number> {
  assertCloudAdmin(membership)
  const { data, error } = await requireSupabase().rpc('delete_all_products', {
    p_household_id: membership.household_id,
  })
  if (error) throw error
  const result = toRecord(data)
  const imagePaths = Array.isArray(result.image_paths) ? result.image_paths.map(String) : []
  await removeImages(imagePaths)
  return Number(result.deleted_count ?? 0)
}

export async function clearMovementHistory(membership: Membership): Promise<number> {
  assertCloudAdmin(membership)
  const { data, error } = await requireSupabase().rpc('clear_movement_history', {
    p_household_id: membership.household_id,
  })
  if (error) throw error
  return Number(data ?? 0)
}

export async function addBasicCatalog(
  membership: Membership,
  categories: string[],
): Promise<BasicCatalogResult> {
  if (membership.role === 'assistant') throw new Error('Tu rol no puede modificar el catálogo de productos.')
  const { data, error } = await requireSupabase().rpc('add_basic_product_catalog', {
    p_household_id: membership.household_id,
    p_categories: categories.length ? categories : null,
  })
  if (error) throw error
  const result = toRecord(data)
  return {
    added: Number(result.added ?? 0),
    skipped: Number(result.skipped ?? 0),
  }
}

export async function getBasicCatalogSummary(): Promise<BasicCatalogSummary> {
  const { data, error } = await requireSupabase().rpc('get_basic_catalog_summary')
  if (error) throw error
  const result = toRecord(data)
  const groups = Array.isArray(result.groups)
    ? result.groups.map((value) => {
        const row = toRecord(value)
        return { category: String(row.category ?? 'Otros'), count: Number(row.count ?? 0) }
      })
    : []
  return { total: Number(result.total ?? groups.reduce((sum, group) => sum + group.count, 0)), groups }
}

export async function listSharedAccessAccounts(membership: Membership): Promise<SharedAccessAccount[]> {
  assertCloudAdmin(membership)
  const { data, error } = await requireSupabase().rpc('get_shared_access_accounts', {
    p_household_id: membership.household_id,
  })
  if (error) throw error
  return (Array.isArray(data) ? data : []).map(mapSharedAccount)
}

interface ManageSharedAccessInput {
  action: 'create' | 'rotate_key' | 'activate' | 'deactivate'
  accountId?: string
  displayName?: string
  username?: string
  accessKey?: string
  role?: Exclude<HouseholdRole, 'admin'>
}

export async function manageSharedAccess(
  membership: Membership,
  input: ManageSharedAccessInput,
): Promise<{ account: SharedAccessAccount; accessKey?: string }> {
  assertCloudAdmin(membership)
  const { data, error } = await requireSupabase().functions.invoke('household-access-admin', {
    body: {
      action: input.action,
      household_id: membership.household_id,
      account_id: input.accountId,
      display_name: input.displayName,
      username: input.username,
      access_key: input.accessKey,
      role: input.role,
    },
  })
  if (error) throw error
  const response = toRecord(data)
  if (response.error) throw new Error(String(response.error))
  return {
    account: mapSharedAccount(response.account),
    accessKey: response.access_key ? String(response.access_key) : undefined,
  }
}

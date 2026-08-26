export type HouseholdRole = 'admin' | 'family' | 'assistant'
export type AppView = 'dashboard' | 'inventory' | 'shopping' | 'history' | 'settings'
export type MovementType = 'purchase' | 'consumption' | 'adjustment' | 'review' | 'initial'
export type StockStatusKey = 'out' | 'critical' | 'low' | 'good'
export type RepositoryMode = 'demo' | 'cloud'
export type QuickStockLevel = 'good' | 'low' | 'out'

export interface Household {
  id: string
  name: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface Membership {
  household_id: string
  user_id: string
  role: HouseholdRole
  display_name: string
  created_at: string
  household: Household
}

export interface Category {
  id: string
  household_id: string
  name: string
  icon: string
  sort_order: number
  active: boolean
  created_at?: string
  updated_at?: string
}

export interface Location {
  id: string
  household_id: string
  name: string
  icon: string
  sort_order: number
  active: boolean
  created_at?: string
  updated_at?: string
}

export interface Product {
  id: string
  household_id: string
  name: string
  category_id: string
  location_id: string
  brand: string
  presentation: string
  unit: string
  emoji: string
  image_path: string | null
  image_url?: string | null
  current_stock: number
  minimum_stock: number
  ideal_stock: number
  on_shopping_list: boolean
  archived: boolean
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
  category?: Category | null
  location?: Location | null
}

export interface Movement {
  id: string
  household_id: string
  product_id: string | null
  product_name: string
  type: MovementType
  delta: number
  quantity_after: number
  note: string
  created_by: string
  actor_name: string
  created_at: string
}

export interface HouseholdMember {
  household_id: string
  user_id: string
  role: HouseholdRole
  display_name: string
  created_at: string
}

export interface HouseholdInvite {
  id: string
  household_id: string
  code: string
  role: Exclude<HouseholdRole, 'admin'>
  expires_at: string
  max_uses: number
  uses: number
  revoked_at: string | null
  created_by: string
  created_at: string
}

export interface HouseholdData {
  categories: Category[]
  locations: Location[]
  products: Product[]
  movements: Movement[]
  members: HouseholdMember[]
  invites: HouseholdInvite[]
}

export interface ProductDraft {
  id?: string
  name: string
  category_id: string
  location_id: string
  brand: string
  presentation: string
  unit: string
  emoji: string
  current_stock: number
  minimum_stock: number
  ideal_stock: number
  on_shopping_list: boolean
  existing_image_path?: string | null
  original_image_path?: string | null
  image_file?: File | null
}

export interface ToastMessage {
  id: string
  title: string
  message: string
  tone: 'success' | 'error' | 'info'
}

export interface LegacyProduct {
  id?: string
  name?: string
  category?: string
  location?: string
  brand?: string
  presentation?: string
  unit?: string
  emoji?: string
  image?: string
  current?: number
  minimum?: number
  ideal?: number
  onShoppingList?: boolean
  createdAt?: number
  updatedAt?: number
}

export interface LegacyMovement {
  id?: string
  productId?: string
  productName?: string
  type?: MovementType
  delta?: number
  quantityAfter?: number
  note?: string
  createdAt?: number
}

export interface LegacyBackupPayload {
  householdName?: string
  products?: LegacyProduct[]
  movements?: LegacyMovement[]
}

export interface LegacyBackup extends LegacyBackupPayload {
  app?: string
  exportedAt?: string
  data?: LegacyBackupPayload
}

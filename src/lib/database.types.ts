/**
 * Snapshot generated from the connected Supabase project on 2026-08-25.
 * Regenerate with: supabase gen types typescript --project-id nwxiwnggqzebrefabdxo
 */
export type HouseholdRole = 'admin' | 'family' | 'assistant'
export type MovementType = 'purchase' | 'consumption' | 'adjustment' | 'review' | 'initial'

export interface HouseholdRow {
  id: string
  name: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface HouseholdMemberRow {
  household_id: string
  user_id: string
  role: HouseholdRole
  display_name: string
  created_at: string
}

export interface CategoryRow {
  id: string
  household_id: string
  name: string
  icon: string
  sort_order: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface LocationRow extends CategoryRow {}

export interface ProductRow {
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
  current_stock: number
  minimum_stock: number
  ideal_stock: number
  on_shopping_list: boolean
  archived: boolean
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

export interface MovementRow {
  id: string
  household_id: string
  product_id: string | null
  product_name: string
  type: MovementType
  delta: number
  quantity_after: number
  note: string
  created_by: string
  created_at: string
}

export interface HouseholdInviteRow {
  id: string
  household_id: string
  code: string
  role: HouseholdRole
  expires_at: string
  max_uses: number
  uses: number
  revoked_at: string | null
  created_by: string
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      households: { Row: HouseholdRow; Insert: Partial<HouseholdRow>; Update: Partial<HouseholdRow> }
      household_members: { Row: HouseholdMemberRow; Insert: Partial<HouseholdMemberRow>; Update: Partial<HouseholdMemberRow> }
      categories: { Row: CategoryRow; Insert: Partial<CategoryRow>; Update: Partial<CategoryRow> }
      locations: { Row: LocationRow; Insert: Partial<LocationRow>; Update: Partial<LocationRow> }
      products: { Row: ProductRow; Insert: Partial<ProductRow>; Update: Partial<ProductRow> }
      movements: { Row: MovementRow; Insert: Partial<MovementRow>; Update: Partial<MovementRow> }
      household_invites: { Row: HouseholdInviteRow; Insert: Partial<HouseholdInviteRow>; Update: Partial<HouseholdInviteRow> }
    }
    Views: Record<string, never>
    Functions: {
      create_household: { Args: { p_name: string }; Returns: HouseholdRow }
      create_household_invite: { Args: { p_household_id: string; p_role: HouseholdRole; p_expires_days?: number; p_max_uses?: number }; Returns: HouseholdInviteRow }
      accept_household_invite: { Args: { p_code: string }; Returns: string }
      save_product: { Args: Record<string, unknown>; Returns: ProductRow }
      archive_product: { Args: { p_product_id: string }; Returns: ProductRow }
      adjust_product_stock: { Args: { p_product_id: string; p_delta: number; p_type?: MovementType; p_note?: string }; Returns: ProductRow }
      set_product_review_level: { Args: { p_product_id: string; p_level: string }; Returns: ProductRow }
      purchase_product: { Args: { p_product_id: string; p_quantity?: number }; Returns: ProductRow }
      set_product_shopping: { Args: { p_product_id: string; p_value: boolean }; Returns: ProductRow }
      rename_household: { Args: { p_household_id: string; p_name: string }; Returns: HouseholdRow }
      revoke_household_invite: { Args: { p_invite_id: string }; Returns: HouseholdInviteRow }
      set_household_member_role: { Args: { p_household_id: string; p_user_id: string; p_role: HouseholdRole }; Returns: HouseholdMemberRow }
      remove_household_member: { Args: { p_household_id: string; p_user_id: string }; Returns: undefined }
    }
    Enums: { household_role: HouseholdRole; movement_type: MovementType }
    CompositeTypes: Record<string, never>
  }
}

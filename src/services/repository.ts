import type {
  HouseholdData,
  HouseholdInvite,
  HouseholdMember,
  HouseholdRole,
  LegacyBackup,
  Membership,
  MovementType,
  Product,
  ProductDraft,
  QuickStockLevel,
  RepositoryMode,
} from '../types'

export interface InventoryRepository {
  readonly mode: RepositoryMode

  listMemberships(userId: string): Promise<Membership[]>
  createHousehold(userId: string, name: string, displayName: string): Promise<string>
  joinHousehold(userId: string, code: string, displayName: string): Promise<string>

  loadHouseholdData(membership: Membership): Promise<HouseholdData>
  subscribe(membership: Membership, onChange: () => void): () => void

  saveProduct(membership: Membership, draft: ProductDraft): Promise<void>
  adjustStock(
    membership: Membership,
    product: Product,
    delta: number,
    type: MovementType,
    note: string,
  ): Promise<number>
  setShopping(membership: Membership, product: Product, enabled: boolean): Promise<void>
  setQuickReview(membership: Membership, product: Product, level: QuickStockLevel): Promise<number>
  archiveProduct(membership: Membership, product: Product): Promise<void>

  updateHouseholdName(membership: Membership, name: string): Promise<void>
  createInvite(
    membership: Membership,
    role: Exclude<HouseholdRole, 'admin'>,
    maxUses: number,
  ): Promise<HouseholdInvite>
  revokeInvite(membership: Membership, invite: HouseholdInvite): Promise<void>
  updateMemberRole(
    membership: Membership,
    member: HouseholdMember,
    role: HouseholdRole,
  ): Promise<void>
  removeMember(membership: Membership, member: HouseholdMember): Promise<void>

  importLegacy(membership: Membership, backup: LegacyBackup): Promise<number>
}

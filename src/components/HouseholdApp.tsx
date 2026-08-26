import { useCallback, useEffect, useMemo, useState } from 'react'
import '../uiux-v04.css'
import '../uiux-v04b.css'
import { PAGE_META } from '../lib/catalogs'
import { errorMessage } from '../lib/errors'
import { getShoppingProducts, initials } from '../lib/format'
import { useHouseholdData } from '../hooks/useHouseholdData'
import {
  addBasicCatalog,
  clearMovementHistory,
  deleteAllProducts,
  deleteProductPermanently,
} from '../services/cloudActions'
import type {
  AppView,
  HouseholdMember,
  HouseholdRole,
  LegacyBackup,
  Membership,
  Product,
  ProductDraft,
  QuickStockLevel,
  ToastMessage,
} from '../types'
import type { InventoryRepository } from '../services/repository'
import { AssistantHomePage } from '../pages/AssistantHomePage'
import { DashboardPage } from '../pages/DashboardPage'
import { HistoryPage } from '../pages/HistoryPage'
import { InventoryPage } from '../pages/InventoryPage'
import { SettingsPage } from '../pages/SettingsPage'
import { ShoppingPage } from '../pages/ShoppingPage'
import { BrandMark } from './BrandMark'
import { LoadingScreen } from './LoadingScreen'
import { ProductModal } from './ProductModal'
import { QuickReviewModal } from './QuickReviewModal'
import { ToastRegion } from './ToastRegion'

interface Props {
  repository: InventoryRepository
  membership: Membership
  memberships: Membership[]
  onSwitch(householdId: string): void
  onMembershipsChanged(preferredHouseholdId?: string): Promise<void>
  onSignOut(): Promise<void>
}

const STANDARD_NAV: Array<{ view: AppView; icon: string; label: string }> = [
  { view: 'dashboard', icon: '⌂', label: 'Inicio' },
  { view: 'inventory', icon: '▦', label: 'Inventario' },
  { view: 'shopping', icon: '🛒', label: 'Compras' },
  { view: 'history', icon: '↺', label: 'Movimientos' },
  { view: 'settings', icon: '⚙', label: 'Ajustes' },
]

const ASSISTANT_NAV: Array<{ view: AppView; icon: string; label: string }> = [
  { view: 'dashboard', icon: '✓', label: 'Revisión' },
  { view: 'inventory', icon: '▦', label: 'Existencias' },
  { view: 'shopping', icon: '🛒', label: 'Compras' },
  { view: 'settings', icon: '⚙', label: 'Mi acceso' },
]

export function HouseholdApp({
  repository,
  membership,
  memberships,
  onSwitch,
  onMembershipsChanged,
  onSignOut,
}: Props) {
  const [view, setView] = useState<AppView>('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productBusy, setProductBusy] = useState(false)
  const [quickReviewOpen, setQuickReviewOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const { data, loading, error, refresh } = useHouseholdData(repository, membership)

  const isAssistant = membership.role === 'assistant'
  const canManageProducts = !isAssistant
  const canDeleteProducts = membership.role === 'admin'
  const navItems = isAssistant ? ASSISTANT_NAV : STANDARD_NAV
  const shoppingCount = useMemo(() => getShoppingProducts(data.products).length, [data.products])
  const baseMeta = PAGE_META[view]
  const meta = isAssistant && view === 'dashboard'
    ? { eyebrow: 'Control del hogar', title: 'Revisión', subtitle: 'Confirma lo que hay, lo que queda poco y lo que se terminó.' }
    : isAssistant && view === 'inventory'
      ? { eyebrow: 'Consulta rápida', title: 'Existencias', subtitle: 'Revisa o corrige cantidades puntuales.' }
      : baseMeta

  useEffect(() => {
    const currentMember = data.members.find((member) => member.user_id === membership.user_id)
    if (currentMember && (currentMember.role !== membership.role || currentMember.display_name !== membership.display_name)) {
      void onMembershipsChanged(membership.household_id)
    }
  }, [data.members, membership, onMembershipsChanged])

  useEffect(() => {
    if (isAssistant && view === 'history') setView('dashboard')
  }, [isAssistant, view])

  const toast = useCallback((title: string, message: string, tone: ToastMessage['tone'] = 'success') => {
    const toastId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
    setToasts((current) => [...current, { id: toastId, title, message, tone }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== toastId))
    }, 3800)
  }, [])

  function navigate(nextView: AppView) {
    if (isAssistant && nextView === 'history') nextView = 'dashboard'
    setView(nextView)
    setMobileOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openProduct(product: Product | null = null) {
    if (!canManageProducts) return
    setEditingProduct(product)
    setProductModalOpen(true)
  }

  function findProduct(productId: string): Product {
    const product = data.products.find((item) => item.id === productId)
    if (!product) throw new Error('El producto ya no está disponible.')
    return product
  }

  async function saveProduct(draft: ProductDraft) {
    setProductBusy(true)
    try {
      await repository.saveProduct(membership, draft)
      await refresh(true)
      setProductModalOpen(false)
      setEditingProduct(null)
      toast(draft.id ? 'Producto actualizado' : 'Producto agregado', `${draft.name} se guardó correctamente.`)
    } catch (caught) {
      toast('No se pudo guardar', errorMessage(caught), 'error')
      throw caught
    } finally {
      setProductBusy(false)
    }
  }

  async function adjustStock(productId: string, delta: number) {
    try {
      const product = findProduct(productId)
      await repository.adjustStock(
        membership,
        product,
        delta,
        delta > 0 ? 'purchase' : 'consumption',
        delta > 0 ? 'Reposición rápida' : 'Consumo rápido',
      )
      await refresh(true)
      toast(delta > 0 ? 'Inventario aumentado' : 'Consumo registrado', product.name)
    } catch (caught) {
      toast('No se pudo actualizar', errorMessage(caught), 'error')
    }
  }

  async function purchase(product: Product, quantity: number) {
    try {
      await repository.adjustStock(membership, product, quantity, 'purchase', 'Compra registrada')
      await refresh(true)
      toast('Compra registrada', `${product.name} aumentó en ${quantity}.`)
    } catch (caught) {
      toast('No se pudo registrar la compra', errorMessage(caught), 'error')
    }
  }

  async function setShopping(product: Product, enabled: boolean) {
    try {
      await repository.setShopping(membership, product, enabled)
      await refresh(true)
      toast(enabled ? 'Agregado a compras' : 'Retirado de compras', product.name)
    } catch (caught) {
      toast('No se pudo cambiar la lista', errorMessage(caught), 'error')
    }
  }

  async function toggleShopping(product: Product) {
    if (product.current_stock <= product.minimum_stock && !product.on_shopping_list) {
      navigate('shopping')
      return
    }
    await setShopping(product, !product.on_shopping_list)
  }

  async function deleteProduct(product: Product) {
    if (repository.mode !== 'cloud') throw new Error('La eliminación definitiva solo está disponible con Supabase conectado.')
    try {
      await deleteProductPermanently(membership, product)
      await refresh(true)
      toast('Producto eliminado', `${product.name} se retiró del inventario.`)
    } catch (caught) {
      toast('No se pudo eliminar', errorMessage(caught), 'error')
      throw caught
    }
  }

  async function deleteEveryProduct() {
    if (repository.mode !== 'cloud') throw new Error('La eliminación masiva solo está disponible con Supabase conectado.')
    try {
      const count = await deleteAllProducts(membership)
      await refresh(true)
      toast('Inventario vaciado', `${count} productos eliminados.`)
    } catch (caught) {
      toast('No se pudo vaciar el inventario', errorMessage(caught), 'error')
      throw caught
    }
  }

  async function addCatalog(categories: string[]) {
    if (repository.mode !== 'cloud') throw new Error('El catálogo básico requiere Supabase conectado.')
    try {
      const result = await addBasicCatalog(membership, categories)
      await refresh(true)
      toast('Catálogo agregado', `${result.added} productos nuevos; ${result.skipped} ya existían.`)
    } catch (caught) {
      toast('No se pudo agregar el catálogo', errorMessage(caught), 'error')
      throw caught
    }
  }

  async function clearHistory() {
    if (repository.mode !== 'cloud') throw new Error('La limpieza de historial requiere Supabase conectado.')
    try {
      const count = await clearMovementHistory(membership)
      await refresh(true)
      toast('Historial borrado', `${count} movimientos eliminados.`)
    } catch (caught) {
      toast('No se pudo borrar el historial', errorMessage(caught), 'error')
      throw caught
    }
  }

  async function quickReview(product: Product, level: QuickStockLevel) {
    try {
      await repository.setQuickReview(membership, product, level)
      await refresh(true)
    } catch (caught) {
      toast('No se pudo actualizar', errorMessage(caught), 'error')
    }
  }

  async function updateHouseholdName(name: string) {
    await repository.updateHouseholdName(membership, name)
    await onMembershipsChanged(membership.household_id)
    await refresh(true)
    toast('Hogar actualizado', `Ahora se llama ${name.trim()}.`)
  }

  async function updateMemberRole(member: HouseholdMember, role: HouseholdRole) {
    await repository.updateMemberRole(membership, member, role)
    await refresh(true)
    toast('Rol actualizado', member.display_name)
  }

  async function removeMember(member: HouseholdMember) {
    await repository.removeMember(membership, member)
    await refresh(true)
    toast('Miembro retirado', member.display_name)
  }

  async function importLegacy(backup: LegacyBackup) {
    const count = await repository.importLegacy(membership, backup)
    await refresh(true)
    toast('Importación terminada', `${count} productos agregados.`)
  }

  async function dataChanged() {
    await onMembershipsChanged(membership.household_id)
    await refresh(true)
  }

  function exportData() {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      householdName: membership.household.name,
      ...data,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `hogar-control-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    toast('Respaldo creado', 'El archivo JSON fue descargado.')
  }

  if (loading && !data.categories.length) return <LoadingScreen message="Sincronizando el inventario…" />

  return (
    <>
      <div className="app-shell">
        <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} aria-label="Navegación principal">
          <div className="brand">
            <BrandMark />
            <div><strong>Hogar Control</strong><span>{membership.household.name}</span></div>
          </div>
          <nav className="nav-list">
            {navItems.map((item) => (
              <button className={`nav-item ${view === item.view ? 'active' : ''}`} type="button" key={item.view} onClick={() => navigate(item.view)}>
                <span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
                {item.view === 'inventory' && <span className="nav-badge">{data.products.length}</span>}
                {item.view === 'shopping' && <span className="nav-badge danger">{shoppingCount}</span>}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="storage-note">
              <span className="storage-dot" />
              <div>
                <strong>{repository.mode === 'cloud' ? 'Sincronización activa' : 'Modo demostración'}</strong>
                <span>{repository.mode === 'cloud' ? 'Los datos se comparten de forma segura.' : 'Los datos viven en este navegador.'}</span>
              </div>
            </div>
            <button className={`secondary-button full ${isAssistant ? 'assistant-review-button' : ''}`} type="button" onClick={() => setQuickReviewOpen(true)}>{isAssistant ? 'Iniciar revisión' : 'Revisión rápida'}</button>
          </div>
        </aside>

        {mobileOpen && <button className="drawer-backdrop" type="button" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />}

        <div className="workspace">
          <header className="topbar">
            <button className="icon-button mobile-menu-button" type="button" aria-label="Abrir menú" onClick={() => setMobileOpen(true)}>☰</button>
            <div className="page-heading"><span className="eyebrow">{meta.eyebrow}</span><h1>{meta.title}</h1><p>{meta.subtitle}</p></div>
            <div className="topbar-actions">
              <button className="icon-button" type="button" aria-label="Buscar productos" onClick={() => navigate('inventory')}>⌕</button>
              {isAssistant ? <button className="primary-button" type="button" onClick={() => setQuickReviewOpen(true)}><span aria-hidden="true">✓</span>Iniciar revisión</button> : <button className="primary-button" type="button" onClick={() => openProduct()}><span aria-hidden="true">＋</span>Agregar producto</button>}
              <button className="profile-chip" type="button" title={`${membership.display_name} · ${membership.role}`} onClick={() => navigate('settings')}>{initials(membership.display_name)}</button>
            </div>
          </header>

          <main className="main-content">
            {error && <section className="panel error-panel"><strong>No fue posible sincronizar el hogar.</strong><span>{error}</span><button className="secondary-button" type="button" onClick={() => void refresh(false)}>Reintentar</button></section>}
            {view === 'dashboard' && (isAssistant ? (
              <AssistantHomePage products={data.products} onStartReview={() => setQuickReviewOpen(true)} onOpenInventory={() => navigate('inventory')} onOpenShopping={() => navigate('shopping')} />
            ) : (
              <DashboardPage
                household={membership.household}
                products={data.products}
                movements={data.movements}
                categories={data.categories}
                onOpenShopping={() => navigate('shopping')}
                onOpenInventory={() => navigate('inventory')}
                onQuickReview={() => setQuickReviewOpen(true)}
                onAdjustStock={adjustStock}
              />
            ))}
            {view === 'inventory' && (
              <InventoryPage
                products={data.products}
                categories={data.categories}
                canManageProducts={canManageProducts}
                canDeleteProducts={canDeleteProducts}
                onAddProduct={() => openProduct()}
                onEditProduct={openProduct}
                onDeleteProduct={deleteProduct}
                onDeleteAll={deleteEveryProduct}
                onAddBasicCatalog={addCatalog}
                onAdjustStock={adjustStock}
                onToggleShopping={toggleShopping}
              />
            )}
            {view === 'shopping' && <ShoppingPage products={data.products} canPurchase canManageShopping={canManageProducts} onPurchase={purchase} onSetShopping={setShopping} />}
            {view === 'history' && !isAssistant && <HistoryPage movements={data.movements} canClearHistory={canDeleteProducts} onClearHistory={clearHistory} />}
            {view === 'settings' && (
              <SettingsPage
                mode={repository.mode}
                household={membership.household}
                membership={membership}
                memberships={memberships}
                data={data}
                currentUserId={membership.user_id}
                onSwitch={onSwitch}
                onUpdateHouseholdName={updateHouseholdName}
                onUpdateMemberRole={updateMemberRole}
                onRemoveMember={removeMember}
                onExport={exportData}
                onImport={importLegacy}
                onDataChanged={dataChanged}
                onSignOut={onSignOut}
              />
            )}
          </main>
        </div>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Navegación móvil">
        <button className={`mobile-nav-item ${view === 'dashboard' ? 'active' : ''}`} type="button" onClick={() => navigate('dashboard')}><span>{isAssistant ? '✓' : '⌂'}</span><small>{isAssistant ? 'Revisión' : 'Inicio'}</small></button>
        <button className={`mobile-nav-item ${view === 'inventory' ? 'active' : ''}`} type="button" onClick={() => navigate('inventory')}><span>▦</span><small>{isAssistant ? 'Existencias' : 'Inventario'}</small></button>
        <button className="mobile-add-button" type="button" aria-label={canManageProducts ? 'Agregar producto' : 'Revisión rápida'} onClick={() => canManageProducts ? openProduct() : setQuickReviewOpen(true)}>{isAssistant ? '✓' : '＋'}</button>
        <button className={`mobile-nav-item ${view === 'shopping' ? 'active' : ''}`} type="button" onClick={() => navigate('shopping')}><span>🛒</span><small>Compras</small></button>
        <button className={`mobile-nav-item ${view === 'settings' ? 'active' : ''}`} type="button" onClick={() => navigate('settings')}><span>⚙</span><small>{isAssistant ? 'Mi acceso' : 'Ajustes'}</small></button>
      </nav>

      <ProductModal
        open={productModalOpen}
        product={editingProduct}
        categories={data.categories}
        locations={data.locations}
        onClose={() => {
          if (!productBusy) setProductModalOpen(false)
        }}
        onSave={saveProduct}
      />
      <QuickReviewModal
        open={quickReviewOpen}
        products={data.products}
        onSetLevel={(product, level) => quickReview(product, level === 'available' ? 'good' : level)}
        onClose={() => setQuickReviewOpen(false)}
      />
      <ToastRegion messages={toasts} />
    </>
  )
}

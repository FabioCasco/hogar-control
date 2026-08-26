import { useRef, useState, type FormEvent } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { SharedAccessManager } from '../components/SharedAccessManager'
import { errorMessage } from '../lib/errors'
import type {
  Household,
  HouseholdData,
  HouseholdMember,
  HouseholdRole,
  LegacyBackup,
  Membership,
  RepositoryMode,
} from '../types'

interface Props {
  mode: RepositoryMode
  household: Household
  membership: Membership
  memberships: Membership[]
  data: HouseholdData
  currentUserId: string
  onSwitch(householdId: string): void
  onUpdateHouseholdName(name: string): Promise<void>
  onUpdateMemberRole(member: HouseholdMember, role: HouseholdRole): Promise<void>
  onRemoveMember(member: HouseholdMember): Promise<void>
  onExport(): void
  onImport(backup: LegacyBackup): Promise<void>
  onDataChanged(): Promise<void>
  onSignOut(): Promise<void>
}

const ROLE_LABELS: Record<HouseholdRole, string> = {
  admin: 'Administrador',
  family: 'Familiar',
  assistant: 'Asesora del hogar',
}

export function SettingsPage({
  mode,
  household,
  membership,
  memberships,
  data,
  currentUserId,
  onSwitch,
  onUpdateHouseholdName,
  onUpdateMemberRole,
  onRemoveMember,
  onExport,
  onImport,
  onDataChanged,
  onSignOut,
}: Props) {
  const [householdName, setHouseholdName] = useState(household.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [removeTarget, setRemoveTarget] = useState<HouseholdMember | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const isAdmin = membership.role === 'admin'

  async function renameHousehold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await onUpdateHouseholdName(householdName)
      setNotice('Nombre del hogar actualizado.')
    } catch (caught) {
      setError(errorMessage(caught, 'No fue posible actualizar el hogar.'))
    } finally {
      setBusy(false)
    }
  }

  async function importFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const parsed = JSON.parse(await file.text()) as LegacyBackup
      await onImport(parsed)
      setNotice('Copia importada correctamente.')
    } catch (caught) {
      setError(errorMessage(caught, 'El archivo no es una copia válida de Hogar Control.'))
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function changeRole(member: HouseholdMember, role: HouseholdRole) {
    setBusy(true)
    setError('')
    try {
      await onUpdateMemberRole(member, role)
      await onDataChanged()
      setNotice(`Rol de ${member.display_name} actualizado.`)
    } catch (caught) {
      setError(errorMessage(caught, 'No fue posible cambiar el rol.'))
    } finally {
      setBusy(false)
    }
  }

  async function removeMember() {
    if (!removeTarget) return
    setBusy(true)
    setError('')
    try {
      await onRemoveMember(removeTarget)
      await onDataChanged()
      setNotice(`${removeTarget.display_name} ya no tiene acceso al hogar.`)
      setRemoveTarget(null)
    } catch (caught) {
      setError(errorMessage(caught, 'No fue posible retirar a la persona.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="content-stack settings-page">
      <section className="settings-overview">
        <div><span className="eyebrow light">Configuración del hogar</span><h2>{household.name}</h2><p>Tu rol actual es {ROLE_LABELS[membership.role].toLocaleLowerCase('es')}.</p></div>
        <div className="settings-overview-stat"><strong>{data.members.length}</strong><span>personas con acceso</span></div>
        <div className="settings-overview-stat"><strong>{data.products.length}</strong><span>productos activos</span></div>
      </section>

      {isAdmin && (
        <section className="settings-section">
          <div className="settings-section-heading"><div><span className="eyebrow">Identidad</span><h2>Nombre del hogar</h2><p>Es el nombre que verán todas las personas con acceso.</p></div></div>
          <form className="settings-card compact-settings-form" onSubmit={renameHousehold}>
            <label className="form-field"><span>Nombre</span><input value={householdName} onChange={(event) => setHouseholdName(event.target.value)} minLength={2} maxLength={60} required /></label>
            <button className="primary-button" type="submit" disabled={busy || householdName.trim() === household.name}>{busy ? 'Guardando…' : 'Guardar nombre'}</button>
          </form>
        </section>
      )}

      {isAdmin && mode === 'cloud' && <SharedAccessManager membership={membership} onChanged={onDataChanged} />}

      <section className="settings-section">
        <div className="settings-section-heading"><div><span className="eyebrow">Personas</span><h2>Miembros del hogar</h2><p>Consulta quién puede ver o actualizar el inventario.</p></div><span className="settings-count-chip">{data.members.length}</span></div>
        <div className="settings-card member-list-card">
          {data.members.map((member) => {
            const isCurrent = member.user_id === currentUserId
            return (
              <div className="member-row" key={member.user_id}>
                <div className="member-avatar">{member.display_name.slice(0, 1).toUpperCase()}</div>
                <div className="member-copy"><strong>{member.display_name}{isCurrent ? ' · Tú' : ''}</strong><span>{ROLE_LABELS[member.role]}</span></div>
                {isAdmin && !isCurrent ? (
                  <select className="filter-select member-role-select" value={member.role} onChange={(event) => void changeRole(member, event.target.value as HouseholdRole)} disabled={busy} aria-label={`Rol de ${member.display_name}`}>
                    <option value="family">Familiar</option>
                    <option value="assistant">Asesora del hogar</option>
                    <option value="admin">Administrador</option>
                  </select>
                ) : <span className="role-badge">{ROLE_LABELS[member.role]}</span>}
                {isAdmin && !isCurrent && <button className="text-button danger-text" type="button" onClick={() => setRemoveTarget(member)} disabled={busy}>Retirar</button>}
              </div>
            )
          })}
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-heading"><div><span className="eyebrow">Respaldo</span><h2>Exportar e importar</h2><p>Guarda una copia antes de realizar cambios masivos en el inventario.</p></div></div>
        <div className="settings-grid two-settings-columns">
          <article className="settings-card backup-card"><div className="settings-card-icon">↓</div><div><h3>Descargar copia</h3><p>Incluye productos, categorías, movimientos y miembros visibles.</p></div><button className="secondary-button" type="button" onClick={onExport}>Exportar JSON</button></article>
          <article className="settings-card backup-card"><div className="settings-card-icon">↑</div><div><h3>Importar inventario</h3><p>Agrega productos desde una copia anterior de Hogar Control.</p></div><input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(event) => void importFile(event.target.files?.[0])} /><button className="secondary-button" type="button" onClick={() => fileInput.current?.click()} disabled={busy || membership.role === 'assistant'}>Seleccionar archivo</button></article>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-heading"><div><span className="eyebrow">Sesión</span><h2>Mi acceso</h2><p>Cambia de hogar o cierra la sesión en este dispositivo.</p></div></div>
        <div className="settings-card session-card">
          <div><strong>{membership.display_name}</strong><span>{ROLE_LABELS[membership.role]} · {mode === 'cloud' ? 'Sincronización activa' : 'Modo demostración'}</span></div>
          {memberships.length > 1 && <select className="filter-select" value={membership.household_id} onChange={(event) => onSwitch(event.target.value)}>{memberships.map((item) => <option value={item.household_id} key={item.household_id}>{item.household.name}</option>)}</select>}
          <button className="secondary-button" type="button" onClick={() => void onSignOut()}>Cerrar sesión</button>
        </div>
      </section>

      {notice && <div className="settings-feedback success" role="status">{notice}</div>}
      {error && <div className="form-error visible" role="alert">{error}</div>}

      <ConfirmDialog
        open={Boolean(removeTarget)}
        eyebrow="Retirar acceso"
        title={`¿Retirar a ${removeTarget?.display_name ?? ''}?`}
        description="La persona dejará de ver y modificar este hogar. El historial de sus movimientos anteriores se conservará."
        confirmLabel="Retirar persona"
        busy={busy}
        onClose={() => setRemoveTarget(null)}
        onConfirm={removeMember}
      />
    </div>
  )
}

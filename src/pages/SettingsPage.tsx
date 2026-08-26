import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '../lib/catalogs'
import { formatDate } from '../lib/format'
import type {
  Household,
  HouseholdData,
  HouseholdInvite,
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
  onCreateInvite(role: Exclude<HouseholdRole, 'admin'>, maxUses: number): Promise<void>
  onRevokeInvite(invite: HouseholdInvite): Promise<void>
  onUpdateMemberRole(member: HouseholdMember, role: HouseholdRole): Promise<void>
  onRemoveMember(member: HouseholdMember): Promise<void>
  onExport(): void
  onImport(backup: LegacyBackup): Promise<void>
  onSignOut(): Promise<void>
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
  onCreateInvite,
  onRevokeInvite,
  onUpdateMemberRole,
  onRemoveMember,
  onExport,
  onImport,
  onSignOut,
}: Props) {
  const isAdmin = membership.role === 'admin'
  const [householdName, setHouseholdName] = useState(household.name)
  const [inviteRole, setInviteRole] = useState<Exclude<HouseholdRole, 'admin'>>('family')
  const [maxUses, setMaxUses] = useState(1)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => setHouseholdName(household.name), [household.name])

  function resetFeedback() {
    setMessage('')
    setError('')
  }

  async function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy('rename')
    resetFeedback()
    try {
      await onUpdateHouseholdName(householdName)
      setMessage('Nombre del hogar actualizado.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible actualizar el hogar.')
    } finally {
      setBusy('')
    }
  }

  async function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy('invite')
    resetFeedback()
    try {
      await onCreateInvite(inviteRole, maxUses)
      setMessage('Código creado. Ya aparece en la lista de invitaciones activas.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible crear la invitación.')
    } finally {
      setBusy('')
    }
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy('import')
    resetFeedback()
    try {
      const parsed = JSON.parse(await file.text()) as LegacyBackup
      await onImport(parsed)
      setMessage('La copia de la v0.1 se migró al hogar compartido.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible importar la copia.')
    } finally {
      setBusy('')
    }
  }

  async function revoke(invite: HouseholdInvite) {
    setBusy(`invite-${invite.id}`)
    resetFeedback()
    try {
      await onRevokeInvite(invite)
      setMessage('Invitación revocada.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible revocar la invitación.')
    } finally {
      setBusy('')
    }
  }

  async function updateRole(member: HouseholdMember, role: HouseholdRole) {
    setBusy(`member-${member.user_id}`)
    resetFeedback()
    try {
      await onUpdateMemberRole(member, role)
      setMessage(`Rol de ${member.display_name} actualizado.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible cambiar el rol.')
    } finally {
      setBusy('')
    }
  }

  async function remove(member: HouseholdMember) {
    if (!window.confirm(`¿Retirar a ${member.display_name} de este hogar?`)) return
    setBusy(`member-${member.user_id}`)
    resetFeedback()
    try {
      await onRemoveMember(member)
      setMessage(`${member.display_name} fue retirado del hogar.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible retirar al miembro.')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="content-stack">
      {(message || error) && <div className={`settings-feedback ${error ? 'error' : 'success'}`} role="status">{error || message}</div>}

      <section className="settings-grid">
        <article className="panel settings-card">
          <div className="panel-header"><div><h2>Cuenta y sincronización</h2><p>Estado de la aplicación y espacio activo.</p></div></div>
          <div className="settings-form">
            <div className="architecture-note">
              <strong>{mode === 'cloud' ? 'Nube conectada' : 'Modo demostración'}</strong>
              <span>{mode === 'cloud' ? 'Cambios sincronizados entre dispositivos.' : 'La información permanece en este navegador.'}</span>
            </div>
            {memberships.length > 1 && (
              <label className="form-field">
                <span>Hogar activo</span>
                <select value={membership.household_id} onChange={(event) => onSwitch(event.target.value)}>
                  {memberships.map((item) => <option value={item.household_id} key={item.household_id}>{item.household.name}</option>)}
                </select>
              </label>
            )}
            <button className="secondary-button" type="button" onClick={() => void onSignOut()}>{mode === 'cloud' ? 'Cerrar sesión' : 'Salir de la demostración'}</button>
          </div>
        </article>

        <article className="panel settings-card">
          <div className="panel-header"><div><h2>Datos del hogar</h2><p>Identidad del espacio compartido y tu nivel de acceso.</p></div></div>
          <form className="settings-form" onSubmit={rename}>
            <label className="form-field"><span>Nombre del hogar</span><input value={householdName} onChange={(event) => setHouseholdName(event.target.value)} maxLength={60} disabled={!isAdmin} /></label>
            <div className="role-summary">
              <span className={`role-pill ${membership.role}`}>{ROLE_LABELS[membership.role]}</span>
              <p>{ROLE_DESCRIPTIONS[membership.role]}</p>
            </div>
            {isAdmin && <button className="primary-button" type="submit" disabled={busy === 'rename' || householdName.trim() === household.name}>{busy === 'rename' ? 'Guardando…' : 'Guardar nombre'}</button>}
          </form>
        </article>

        <article className="panel settings-card">
          <div className="panel-header"><div><h2>Copia y migración</h2><p>Exporta los datos actuales o importa la copia JSON de la v0.1.</p></div></div>
          <div className="backup-actions">
            <button className="secondary-button" type="button" onClick={onExport}>Exportar copia del hogar</button>
            {isAdmin || membership.role === 'family' ? (
              <label className={`secondary-button file-button ${busy === 'import' ? 'disabled' : ''}`}>
                <input type="file" accept="application/json,.json" hidden disabled={busy === 'import'} onChange={(event) => void importFile(event)} />
                {busy === 'import' ? 'Importando…' : 'Importar copia v0.1'}
              </label>
            ) : <p className="permission-note">Tu rol permite revisar existencias, pero no importar productos.</p>}
          </div>
          <div className="architecture-note"><strong>Base compartida</strong><span>{data.products.length} productos · {data.movements.length} movimientos visibles.</span></div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header"><div><h2>Miembros del hogar</h2><p>El administrador controla quién puede configurar o solo revisar.</p></div><span className="toolbar-count">{data.members.length} miembros</span></div>
        <div className="member-list">
          {data.members.map((member) => (
            <div className="member-row" key={member.user_id}>
              <div className="member-avatar">{member.display_name.slice(0, 1).toUpperCase()}</div>
              <div className="member-copy"><strong>{member.display_name}{member.user_id === currentUserId ? ' · Tú' : ''}</strong><span>Desde {formatDate(member.created_at, { year: 'numeric' })}</span></div>
              {isAdmin && member.user_id !== currentUserId ? (
                <select value={member.role} disabled={busy === `member-${member.user_id}`} onChange={(event) => void updateRole(member, event.target.value as HouseholdRole)} aria-label={`Rol de ${member.display_name}`}>
                  <option value="admin">Administrador</option>
                  <option value="family">Familiar</option>
                  <option value="assistant">Asesora del hogar</option>
                </select>
              ) : <span className={`role-pill ${member.role}`}>{ROLE_LABELS[member.role]}</span>}
              {isAdmin && member.user_id !== currentUserId && <button className="icon-button small danger" type="button" disabled={busy === `member-${member.user_id}`} aria-label={`Retirar a ${member.display_name}`} onClick={() => void remove(member)}>×</button>}
            </div>
          ))}
        </div>
      </section>

      {isAdmin && (
        <section className="settings-grid">
          <article className="panel settings-card">
            <div className="panel-header"><div><h2>Crear invitación</h2><p>El código vence en siete días y no contiene contraseñas.</p></div></div>
            <form className="settings-form" onSubmit={createInvite}>
              <label className="form-field"><span>Rol asignado</span><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as Exclude<HouseholdRole, 'admin'>)}><option value="family">Familiar</option><option value="assistant">Asesora del hogar</option></select></label>
              <label className="form-field"><span>Número máximo de usos</span><input type="number" min="1" max="10" value={maxUses} onChange={(event) => setMaxUses(Math.max(1, Math.min(10, Number(event.target.value))))} /></label>
              <button className="primary-button" type="submit" disabled={busy === 'invite'}>{busy === 'invite' ? 'Generando…' : 'Generar código'}</button>
            </form>
          </article>

          <article className="panel settings-card">
            <div className="panel-header"><div><h2>Invitaciones activas</h2><p>Revoca cualquier código que ya no deba utilizarse.</p></div></div>
            <div className="invite-list">
              {data.invites.length ? data.invites.map((invite) => (
                <div className="invite-row" key={invite.id}>
                  <div><strong className="invite-code">{invite.code}</strong><span>{ROLE_LABELS[invite.role]} · {invite.uses}/{invite.max_uses} usos · vence {formatDate(invite.expires_at)}</span></div>
                  <div className="invite-actions">
                    <button className="text-button" type="button" onClick={() => void navigator.clipboard.writeText(invite.code)}>Copiar</button>
                    <button className="text-button danger-text" type="button" disabled={busy === `invite-${invite.id}`} onClick={() => void revoke(invite)}>Revocar</button>
                  </div>
                </div>
              )) : <p className="permission-note">No hay códigos activos.</p>}
            </div>
          </article>
        </section>
      )}
    </div>
  )
}

-- Supabase instala pgcrypto en el esquema extensions.
create or replace function public.create_household_invite(
  p_household_id uuid,
  p_role public.household_role,
  p_expires_days integer default 7,
  p_max_uses integer default 1
)
returns public.household_invites
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invite public.household_invites;
  v_code text;
begin
  if not public.user_has_household_role(p_household_id, array['admin'::public.household_role]) then
    raise exception 'Solo un administrador puede crear invitaciones.';
  end if;
  if p_role not in ('family', 'assistant') then
    raise exception 'La invitación solo puede asignar el rol Familiar o Asesora del hogar.';
  end if;
  if p_expires_days not between 1 and 30 then
    raise exception 'La vigencia debe estar entre 1 y 30 días.';
  end if;
  if p_max_uses not between 1 and 10 then
    raise exception 'El número de usos debe estar entre 1 y 10.';
  end if;

  loop
    v_code := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));
    exit when not exists (select 1 from public.household_invites where code = v_code);
  end loop;

  insert into public.household_invites(
    household_id, code, role, expires_at, max_uses, created_by
  ) values (
    p_household_id, v_code, p_role, now() + make_interval(days => p_expires_days), p_max_uses, auth.uid()
  ) returning * into v_invite;

  return v_invite;
end;
$$;


revoke all on function public.create_household_invite(uuid, public.household_role, integer, integer) from public, anon, authenticated;
grant execute on function public.create_household_invite(uuid, public.household_role, integer, integer) to authenticated;

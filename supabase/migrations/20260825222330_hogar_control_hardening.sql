-- Endurecimiento posterior a los asesores de Supabase.
-- Los helpers de autorización se mueven a un esquema no expuesto y
-- public conserva wrappers SECURITY INVOKER para RLS, Storage y RPC.

create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated;

alter function public.user_is_household_member(uuid) set schema app_private;
alter function public.user_has_household_role(uuid, public.household_role[]) set schema app_private;
alter function public.current_household_role(uuid) set schema app_private;

revoke all on function app_private.user_is_household_member(uuid) from public, anon, authenticated;
revoke all on function app_private.user_has_household_role(uuid, public.household_role[]) from public, anon, authenticated;
revoke all on function app_private.current_household_role(uuid) from public, anon, authenticated;
grant execute on function app_private.user_is_household_member(uuid) to authenticated;
grant execute on function app_private.user_has_household_role(uuid, public.household_role[]) to authenticated;
grant execute on function app_private.current_household_role(uuid) to authenticated;

create or replace function public.user_is_household_member(p_household_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.user_is_household_member(p_household_id);
$$;

create or replace function public.user_has_household_role(
  p_household_id uuid,
  p_roles public.household_role[]
)
returns boolean
language sql
stable
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.user_has_household_role(p_household_id, p_roles);
$$;

create or replace function public.current_household_role(p_household_id uuid)
returns public.household_role
language sql
stable
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.current_household_role(p_household_id);
$$;

revoke all on function public.user_is_household_member(uuid) from public, anon, authenticated;
revoke all on function public.user_has_household_role(uuid, public.household_role[]) from public, anon, authenticated;
revoke all on function public.current_household_role(uuid) from public, anon, authenticated;
grant execute on function public.user_is_household_member(uuid) to authenticated;
grant execute on function public.user_has_household_role(uuid, public.household_role[]) to authenticated;
grant execute on function public.current_household_role(uuid) to authenticated;

-- Índices de cobertura para las claves foráneas señaladas por el asesor.
create index if not exists households_created_by_idx on public.households(created_by);
create index if not exists household_invites_created_by_idx on public.household_invites(created_by);
create index if not exists movements_created_by_idx on public.movements(created_by);
create index if not exists movements_product_id_idx on public.movements(product_id);
create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_location_id_idx on public.products(location_id);
create index if not exists products_created_by_idx on public.products(created_by);
create index if not exists products_updated_by_idx on public.products(updated_by);

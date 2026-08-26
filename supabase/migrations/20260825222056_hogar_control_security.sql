-- Seguridad por fila.
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.categories enable row level security;
alter table public.locations enable row level security;
alter table public.products enable row level security;
alter table public.movements enable row level security;
alter table public.household_invites enable row level security;

revoke all on public.households, public.household_members, public.categories, public.locations,
  public.products, public.movements, public.household_invites from anon;

revoke all on public.households, public.household_members, public.categories, public.locations,
  public.products, public.movements, public.household_invites from authenticated;

grant usage on schema public to authenticated;
grant select on public.households, public.household_members, public.categories, public.locations,
  public.products, public.movements, public.household_invites to authenticated;

-- Solo lectura directa. Las mutaciones se ejecutan mediante funciones transaccionales autorizadas.
drop policy if exists households_select_member on public.households;
create policy households_select_member on public.households
for select to authenticated
using ((select public.user_is_household_member(id)));

drop policy if exists household_members_select_member on public.household_members;
drop policy if exists members_select_member on public.household_members;
create policy members_select_member on public.household_members
for select to authenticated
using ((select public.user_is_household_member(household_id)));

drop policy if exists categories_select_member on public.categories;
create policy categories_select_member on public.categories
for select to authenticated
using ((select public.user_is_household_member(household_id)));

drop policy if exists locations_select_member on public.locations;
create policy locations_select_member on public.locations
for select to authenticated
using ((select public.user_is_household_member(household_id)));

drop policy if exists products_select_member on public.products;
create policy products_select_member on public.products
for select to authenticated
using ((select public.user_is_household_member(household_id)));

drop policy if exists movements_select_member on public.movements;
create policy movements_select_member on public.movements
for select to authenticated
using ((select public.user_is_household_member(household_id)));

drop policy if exists invites_select_admin on public.household_invites;
create policy invites_select_admin on public.household_invites
for select to authenticated
using ((select public.user_has_household_role(household_id, array['admin'::public.household_role])));

-- Elimina políticas de escritura de versiones previas si la migración se reaplica.
drop policy if exists households_update_admin on public.households;
drop policy if exists households_delete_admin on public.households;
drop policy if exists members_update_admin on public.household_members;
drop policy if exists members_delete_admin on public.household_members;
drop policy if exists categories_write_manager on public.categories;
drop policy if exists locations_write_manager on public.locations;
drop policy if exists products_insert_manager on public.products;
drop policy if exists products_update_manager on public.products;
drop policy if exists products_delete_admin on public.products;
drop policy if exists movements_insert_manager on public.movements;
drop policy if exists invites_update_admin on public.household_invites;

-- PostgreSQL concede EXECUTE a PUBLIC por defecto: se revoca explícitamente antes de exponer RPCs.
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.protect_household_identity() from public, anon, authenticated;
revoke all on function public.validate_product_integrity() from public, anon, authenticated;
revoke all on function public.validate_movement_integrity() from public, anon, authenticated;
revoke all on function public.user_is_household_member(uuid) from public, anon, authenticated;
revoke all on function public.user_has_household_role(uuid, public.household_role[]) from public, anon, authenticated;
revoke all on function public.current_household_role(uuid) from public, anon, authenticated;
revoke all on function public.protect_last_household_admin() from public, anon, authenticated;
revoke all on function public.create_household(text) from public, anon, authenticated;
revoke all on function public.create_household_invite(uuid, public.household_role, integer, integer) from public, anon, authenticated;
revoke all on function public.accept_household_invite(text) from public, anon, authenticated;
revoke all on function public.adjust_product_stock(uuid, numeric, public.movement_type, text) from public, anon, authenticated;
revoke all on function public.set_product_review_level(uuid, text) from public, anon, authenticated;
revoke all on function public.purchase_product(uuid, numeric) from public, anon, authenticated;
revoke all on function public.set_product_shopping(uuid, boolean) from public, anon, authenticated;
revoke all on function public.save_product(uuid, text, uuid, uuid, text, text, text, text, text, numeric, numeric, numeric, boolean, uuid) from public, anon, authenticated;
revoke all on function public.archive_product(uuid) from public, anon, authenticated;
revoke all on function public.rename_household(uuid, text) from public, anon, authenticated;
revoke all on function public.revoke_household_invite(uuid) from public, anon, authenticated;
revoke all on function public.set_household_member_role(uuid, uuid, public.household_role) from public, anon, authenticated;
revoke all on function public.remove_household_member(uuid, uuid) from public, anon, authenticated;

-- Helpers requeridos por RLS y Storage.
grant execute on function public.user_is_household_member(uuid) to authenticated;
grant execute on function public.user_has_household_role(uuid, public.household_role[]) to authenticated;
grant execute on function public.current_household_role(uuid) to authenticated;

-- API transaccional disponible únicamente para usuarios autenticados.
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.create_household_invite(uuid, public.household_role, integer, integer) to authenticated;
grant execute on function public.accept_household_invite(text) to authenticated;
grant execute on function public.adjust_product_stock(uuid, numeric, public.movement_type, text) to authenticated;
grant execute on function public.set_product_review_level(uuid, text) to authenticated;
grant execute on function public.purchase_product(uuid, numeric) to authenticated;
grant execute on function public.set_product_shopping(uuid, boolean) to authenticated;
grant execute on function public.save_product(uuid, text, uuid, uuid, text, text, text, text, text, numeric, numeric, numeric, boolean, uuid) to authenticated;
grant execute on function public.archive_product(uuid) to authenticated;
grant execute on function public.rename_household(uuid, text) to authenticated;
grant execute on function public.revoke_household_invite(uuid) to authenticated;
grant execute on function public.set_household_member_role(uuid, uuid, public.household_role) to authenticated;
grant execute on function public.remove_household_member(uuid, uuid) to authenticated;

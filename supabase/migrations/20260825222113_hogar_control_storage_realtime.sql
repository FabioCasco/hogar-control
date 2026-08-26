-- Storage privado: la primera carpeta del archivo siempre es el household_id.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.storage_household_id(p_name text)
returns uuid
language sql
stable
set search_path = public, storage, pg_temp
as $$
  select case
    when coalesce((storage.foldername(p_name))[1], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then ((storage.foldername(p_name))[1])::uuid
    else null
  end;
$$;

revoke all on function public.storage_household_id(text) from public, anon, authenticated;
grant execute on function public.storage_household_id(text) to authenticated;

drop policy if exists product_images_select_member on storage.objects;
create policy product_images_select_member on storage.objects
for select to authenticated
using (
  bucket_id = 'product-images'
  and (select public.user_is_household_member(public.storage_household_id(name)))
);

drop policy if exists product_images_insert_manager on storage.objects;
create policy product_images_insert_manager on storage.objects
for insert to authenticated
with check (
  bucket_id = 'product-images'
  and (select public.user_has_household_role(
    public.storage_household_id(name),
    array['admin'::public.household_role, 'family'::public.household_role]
  ))
);

drop policy if exists product_images_update_manager on storage.objects;
create policy product_images_update_manager on storage.objects
for update to authenticated
using (
  bucket_id = 'product-images'
  and (select public.user_has_household_role(
    public.storage_household_id(name),
    array['admin'::public.household_role, 'family'::public.household_role]
  ))
)
with check (
  bucket_id = 'product-images'
  and (select public.user_has_household_role(
    public.storage_household_id(name),
    array['admin'::public.household_role, 'family'::public.household_role]
  ))
);

drop policy if exists product_images_delete_manager on storage.objects;
create policy product_images_delete_manager on storage.objects
for delete to authenticated
using (
  bucket_id = 'product-images'
  and (select public.user_has_household_role(
    public.storage_household_id(name),
    array['admin'::public.household_role, 'family'::public.household_role]
  ))
);

-- Postgres Changes es suficiente para esta aplicación doméstica de baja escala.
alter table public.products replica identity full;
alter table public.movements replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.products;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.movements;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.categories;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.locations;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.household_members;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.household_invites;
exception when duplicate_object then null;
end $$;

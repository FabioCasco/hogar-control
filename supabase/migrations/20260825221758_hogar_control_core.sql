create extension if not exists pgcrypto;

do $$ begin
  create type public.household_role as enum ('admin', 'family', 'assistant');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.movement_type as enum ('purchase', 'consumption', 'adjustment', 'review', 'initial');
exception when duplicate_object then null;
end $$;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 60),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.household_role not null default 'family',
  display_name text not null check (char_length(trim(display_name)) between 1 and 60),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 50),
  icon text not null default '📦' check (char_length(icon) between 1 and 12),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, name)
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  icon text not null default '⌂' check (char_length(icon) between 1 and 12),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, name)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 70),
  category_id uuid not null references public.categories(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  brand text not null default '' check (char_length(brand) <= 50),
  presentation text not null default '' check (char_length(presentation) <= 80),
  unit text not null default 'unidad' check (char_length(unit) between 1 and 30),
  emoji text not null default '📦' check (char_length(emoji) between 1 and 12),
  image_path text,
  current_stock numeric(12,2) not null default 0 check (current_stock >= 0),
  minimum_stock numeric(12,2) not null default 0 check (minimum_stock >= 0),
  ideal_stock numeric(12,2) not null default 1 check (ideal_stock > minimum_stock),
  on_shopping_list boolean not null default false,
  archived boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null check (char_length(trim(product_name)) between 1 and 100),
  type public.movement_type not null default 'adjustment',
  delta numeric(12,2) not null default 0,
  quantity_after numeric(12,2) not null default 0 check (quantity_after >= 0),
  note text not null default '' check (char_length(note) <= 250),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{8,12}$'),
  role public.household_role not null check (role in ('family', 'assistant')),
  expires_at timestamptz not null,
  max_uses integer not null default 1 check (max_uses between 1 and 10),
  uses integer not null default 0 check (uses >= 0 and uses <= max_uses),
  revoked_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists household_members_user_idx on public.household_members(user_id);
create index if not exists categories_household_idx on public.categories(household_id, active, sort_order);
create index if not exists locations_household_idx on public.locations(household_id, active, sort_order);
create index if not exists products_household_idx on public.products(household_id, archived, name);
create index if not exists products_household_status_idx on public.products(household_id, on_shopping_list, current_stock);
create index if not exists movements_household_created_idx on public.movements(household_id, created_at desc);
create index if not exists invites_household_idx on public.household_invites(household_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists households_set_updated_at on public.households;
create trigger households_set_updated_at before update on public.households
for each row execute function public.set_updated_at();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists locations_set_updated_at on public.locations;
create trigger locations_set_updated_at before update on public.locations
for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();

create or replace function public.protect_household_identity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.id <> old.id or new.created_by <> old.created_by then
    raise exception 'No se puede cambiar la identidad ni el creador del hogar.';
  end if;
  return new;
end;
$$;

drop trigger if exists households_protect_identity on public.households;
create trigger households_protect_identity
before update on public.households
for each row execute function public.protect_household_identity();

create or replace function public.validate_product_integrity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_category_household uuid;
  v_location_household uuid;
begin
  if tg_op = 'UPDATE' and (
    new.id <> old.id
    or new.household_id <> old.household_id
    or new.created_by <> old.created_by
  ) then
    raise exception 'No se puede trasladar el producto ni cambiar su creador.';
  end if;

  if auth.uid() is not null then
    if tg_op = 'INSERT' then new.created_by := auth.uid(); end if;
    new.updated_by := auth.uid();
  end if;

  select household_id into v_category_household
  from public.categories
  where id = new.category_id and active = true;
  if not found or v_category_household <> new.household_id then
    raise exception 'La categoría no pertenece al hogar del producto.';
  end if;

  select household_id into v_location_household
  from public.locations
  where id = new.location_id and active = true;
  if not found or v_location_household <> new.household_id then
    raise exception 'La ubicación no pertenece al hogar del producto.';
  end if;

  if new.image_path is not null and split_part(new.image_path, '/', 1) <> new.household_id::text then
    raise exception 'La fotografía no pertenece al hogar del producto.';
  end if;

  new.on_shopping_list := case
    when new.current_stock <= new.minimum_stock then true
    when new.current_stock >= new.ideal_stock then false
    else new.on_shopping_list
  end;

  return new;
end;
$$;

drop trigger if exists products_validate_integrity on public.products;
create trigger products_validate_integrity
before insert or update on public.products
for each row execute function public.validate_product_integrity();

create or replace function public.validate_movement_integrity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_product_household uuid;
begin
  if auth.uid() is not null then
    if not public.user_is_household_member(new.household_id) then
      raise exception 'No tienes acceso al hogar del movimiento.';
    end if;
    new.created_by := auth.uid();
  end if;

  if new.product_id is not null then
    select household_id into v_product_household
    from public.products
    where id = new.product_id;
    if not found or v_product_household <> new.household_id then
      raise exception 'El producto no pertenece al hogar del movimiento.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists movements_validate_integrity on public.movements;
create trigger movements_validate_integrity
before insert on public.movements
for each row execute function public.validate_movement_integrity();

-- Helpers de autorización. SECURITY DEFINER evita recursión de RLS en household_members.
create or replace function public.user_is_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = auth.uid()
  );
$$;

create or replace function public.user_has_household_role(
  p_household_id uuid,
  p_roles public.household_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = auth.uid()
      and hm.role = any(p_roles)
  );
$$;

create or replace function public.current_household_role(p_household_id uuid)
returns public.household_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select hm.role
  from public.household_members hm
  where hm.household_id = p_household_id
    and hm.user_id = auth.uid()
  limit 1;
$$;

-- Evita eliminar o degradar al último administrador del hogar.
create or replace function public.protect_last_household_admin()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_admin_count integer;
begin
  -- Permite la cascada cuando se elimina el hogar completo.
  if tg_op = 'DELETE' and not exists (
    select 1 from public.households where id = old.household_id
  ) then
    return old;
  end if;

  if old.role = 'admin'
     and (
       tg_op = 'DELETE'
       or (tg_op = 'UPDATE' and new.role <> 'admin')
     ) then
    select count(*) into v_admin_count
    from public.household_members
    where household_id = old.household_id and role = 'admin';

    if v_admin_count <= 1 then
      raise exception 'El hogar debe conservar al menos un administrador.';
    end if;
  end if;

  if tg_op = 'UPDATE' and (new.household_id <> old.household_id or new.user_id <> old.user_id) then
    raise exception 'No se puede trasladar una membresía. Elimina y crea una nueva.';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists household_members_protect_admin on public.household_members;
create trigger household_members_protect_admin
before update or delete on public.household_members
for each row execute function public.protect_last_household_admin();

-- Crea hogar, membresía administradora y catálogos iniciales en una sola transacción.
create or replace function public.create_household(p_name text)
returns public.households
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_household public.households;
  v_display_name text;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.';
  end if;
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 60 then
    raise exception 'El nombre del hogar debe tener entre 2 y 60 caracteres.';
  end if;

  v_display_name := coalesce(
    nullif(trim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
    nullif(split_part(auth.jwt() ->> 'email', '@', 1), ''),
    'Administrador'
  );

  insert into public.households(name, created_by)
  values (trim(p_name), auth.uid())
  returning * into v_household;

  insert into public.household_members(household_id, user_id, role, display_name)
  values (v_household.id, auth.uid(), 'admin', left(v_display_name, 60));

  insert into public.categories(household_id, name, icon, sort_order)
  values
    (v_household.id, 'Alimentos', '🍚', 10),
    (v_household.id, 'Bebidas', '🥤', 20),
    (v_household.id, 'Limpieza', '🧽', 30),
    (v_household.id, 'Higiene', '🧴', 40),
    (v_household.id, 'Lavandería', '🧺', 50),
    (v_household.id, 'Mascotas', '🐾', 60),
    (v_household.id, 'Hogar', '🏠', 70),
    (v_household.id, 'Botiquín', '🩹', 80),
    (v_household.id, 'Otros', '📦', 90);

  insert into public.locations(household_id, name, icon, sort_order)
  values
    (v_household.id, 'Despensa', '▤', 10),
    (v_household.id, 'Refrigerador', '❄', 20),
    (v_household.id, 'Congelador', '❄', 30),
    (v_household.id, 'Cocina', '🍳', 40),
    (v_household.id, 'Baño principal', '🛁', 50),
    (v_household.id, 'Baño secundario', '🛁', 60),
    (v_household.id, 'Lavandería', '🧺', 70),
    (v_household.id, 'Bodega', '📦', 80),
    (v_household.id, 'Mascotas', '🐾', 90),
    (v_household.id, 'Botiquín', '🩹', 100),
    (v_household.id, 'Otro', '⌂', 110);

  return v_household;
end;
$$;

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

create or replace function public.accept_household_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invite public.household_invites;
  v_display_name text;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;

  select * into v_invite
  from public.household_invites
  where code = upper(trim(p_code))
  for update;

  if not found then raise exception 'El código no existe.'; end if;
  if v_invite.revoked_at is not null then raise exception 'La invitación fue revocada.'; end if;
  if v_invite.expires_at <= now() then raise exception 'La invitación venció.'; end if;
  if v_invite.uses >= v_invite.max_uses then raise exception 'La invitación ya alcanzó su límite de usos.'; end if;

  if exists (
    select 1 from public.household_members
    where household_id = v_invite.household_id and user_id = auth.uid()
  ) then
    return v_invite.household_id;
  end if;

  v_display_name := coalesce(
    nullif(trim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
    nullif(split_part(auth.jwt() ->> 'email', '@', 1), ''),
    'Miembro'
  );

  insert into public.household_members(household_id, user_id, role, display_name)
  values (v_invite.household_id, auth.uid(), v_invite.role, left(v_display_name, 60));

  update public.household_invites
  set uses = uses + 1
  where id = v_invite.id;

  return v_invite.household_id;
end;
$$;

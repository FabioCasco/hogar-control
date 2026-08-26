create or replace function public.adjust_product_stock(
  p_product_id uuid,
  p_delta numeric,
  p_type public.movement_type default 'adjustment',
  p_note text default 'Actualización rápida'
)
returns public.products
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product public.products;
  v_old numeric(12,2);
  v_new numeric(12,2);
  v_actual_delta numeric(12,2);
begin
  select * into v_product from public.products where id = p_product_id and archived = false for update;
  if not found then raise exception 'El producto no existe o está archivado.'; end if;
  if not public.user_is_household_member(v_product.household_id) then raise exception 'No tienes acceso a este hogar.'; end if;

  v_old := v_product.current_stock;
  v_new := greatest(0, round((v_old + coalesce(p_delta, 0))::numeric, 2));
  v_actual_delta := v_new - v_old;

  update public.products
  set current_stock = v_new,
      on_shopping_list = case
        when v_new <= minimum_stock then true
        when v_new >= ideal_stock then false
        else on_shopping_list
      end,
      updated_by = auth.uid()
  where id = p_product_id
  returning * into v_product;

  if v_actual_delta <> 0 then
    insert into public.movements(
      household_id, product_id, product_name, type, delta, quantity_after, note, created_by
    ) values (
      v_product.household_id,
      v_product.id,
      v_product.name,
      p_type,
      v_actual_delta,
      v_new,
      left(coalesce(p_note, ''), 250),
      auth.uid()
    );
  end if;

  return v_product;
end;
$$;

create or replace function public.set_product_review_level(
  p_product_id uuid,
  p_level text
)
returns public.products
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product public.products;
  v_target numeric(12,2);
begin
  select * into v_product from public.products where id = p_product_id and archived = false for update;
  if not found then raise exception 'El producto no existe o está archivado.'; end if;
  if not public.user_is_household_member(v_product.household_id) then raise exception 'No tienes acceso a este hogar.'; end if;

  v_target := case lower(trim(p_level))
    when 'available' then v_product.ideal_stock
    when 'low' then round((v_product.minimum_stock + ((v_product.ideal_stock - v_product.minimum_stock) / 2))::numeric, 2)
    when 'out' then 0
    else null
  end;
  if v_target is null then raise exception 'Nivel de revisión no válido.'; end if;

  return public.adjust_product_stock(
    p_product_id,
    v_target - v_product.current_stock,
    'review',
    case lower(trim(p_level))
      when 'available' then 'Revisión: hay suficiente'
      when 'low' then 'Revisión: queda poco'
      else 'Revisión: no hay'
    end
  );
end;
$$;

create or replace function public.purchase_product(
  p_product_id uuid,
  p_quantity numeric default null
)
returns public.products
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product public.products;
  v_quantity numeric(12,2);
begin
  select * into v_product from public.products where id = p_product_id and archived = false for update;
  if not found then raise exception 'El producto no existe o está archivado.'; end if;
  if not public.user_is_household_member(v_product.household_id) then raise exception 'No tienes acceso a este hogar.'; end if;

  v_quantity := coalesce(p_quantity, greatest(1, v_product.ideal_stock - v_product.current_stock));
  if v_quantity <= 0 then raise exception 'La cantidad comprada debe ser mayor que cero.'; end if;

  return public.adjust_product_stock(p_product_id, v_quantity, 'purchase', 'Compra registrada');
end;
$$;

create or replace function public.set_product_shopping(
  p_product_id uuid,
  p_value boolean
)
returns public.products
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product public.products;
begin
  select * into v_product from public.products where id = p_product_id and archived = false for update;
  if not found then raise exception 'El producto no existe o está archivado.'; end if;
  if not public.user_has_household_role(
    v_product.household_id,
    array['admin'::public.household_role, 'family'::public.household_role]
  ) then
    raise exception 'Tu rol no puede cambiar manualmente la lista de compras.';
  end if;

  update public.products
  set on_shopping_list = case when current_stock <= minimum_stock then true else coalesce(p_value, false) end,
      updated_by = auth.uid()
  where id = p_product_id
  returning * into v_product;

  return v_product;
end;
$$;


-- Guarda productos y su movimiento inicial/ajuste en una sola transacción.
-- Las escrituras directas sobre products y movements permanecen bloqueadas para el cliente.
create or replace function public.save_product(
  p_household_id uuid,
  p_name text,
  p_category_id uuid,
  p_location_id uuid,
  p_brand text,
  p_presentation text,
  p_unit text,
  p_emoji text,
  p_image_path text,
  p_current_stock numeric,
  p_minimum_stock numeric,
  p_ideal_stock numeric,
  p_on_shopping_list boolean,
  p_product_id uuid default null
)
returns public.products
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product public.products;
  v_previous public.products;
  v_delta numeric(12,2);
  v_is_new boolean := p_product_id is null;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if not public.user_has_household_role(
    p_household_id,
    array['admin'::public.household_role, 'family'::public.household_role]
  ) then
    raise exception 'Tu rol no puede crear ni editar productos.';
  end if;

  if char_length(trim(coalesce(p_name, ''))) not between 1 and 70 then
    raise exception 'El nombre del producto debe tener entre 1 y 70 caracteres.';
  end if;
  if p_category_id is null or p_location_id is null then
    raise exception 'Selecciona categoría y ubicación.';
  end if;
  if coalesce(p_current_stock, -1) < 0 or coalesce(p_minimum_stock, -1) < 0 then
    raise exception 'Las existencias no pueden ser negativas.';
  end if;
  if coalesce(p_ideal_stock, 0) <= coalesce(p_minimum_stock, 0) then
    raise exception 'El stock ideal debe ser mayor que el mínimo.';
  end if;

  if v_is_new then
    insert into public.products(
      household_id, name, category_id, location_id, brand, presentation, unit, emoji,
      image_path, current_stock, minimum_stock, ideal_stock, on_shopping_list,
      created_by, updated_by
    ) values (
      p_household_id,
      trim(p_name),
      p_category_id,
      p_location_id,
      left(trim(coalesce(p_brand, '')), 50),
      left(trim(coalesce(p_presentation, '')), 80),
      left(trim(coalesce(nullif(p_unit, ''), 'unidad')), 30),
      left(trim(coalesce(nullif(p_emoji, ''), '📦')), 12),
      nullif(trim(coalesce(p_image_path, '')), ''),
      round(p_current_stock::numeric, 2),
      round(p_minimum_stock::numeric, 2),
      round(p_ideal_stock::numeric, 2),
      coalesce(p_on_shopping_list, false),
      auth.uid(),
      auth.uid()
    ) returning * into v_product;

    insert into public.movements(
      household_id, product_id, product_name, type, delta, quantity_after, note, created_by
    ) values (
      v_product.household_id,
      v_product.id,
      v_product.name,
      'initial',
      v_product.current_stock,
      v_product.current_stock,
      'Existencia inicial',
      auth.uid()
    );
  else
    select * into v_previous
    from public.products
    where id = p_product_id and archived = false
    for update;

    if not found then raise exception 'El producto no existe o está archivado.'; end if;
    if v_previous.household_id <> p_household_id then
      raise exception 'El producto no pertenece al hogar indicado.';
    end if;

    update public.products
    set name = trim(p_name),
        category_id = p_category_id,
        location_id = p_location_id,
        brand = left(trim(coalesce(p_brand, '')), 50),
        presentation = left(trim(coalesce(p_presentation, '')), 80),
        unit = left(trim(coalesce(nullif(p_unit, ''), 'unidad')), 30),
        emoji = left(trim(coalesce(nullif(p_emoji, ''), '📦')), 12),
        image_path = nullif(trim(coalesce(p_image_path, '')), ''),
        current_stock = round(p_current_stock::numeric, 2),
        minimum_stock = round(p_minimum_stock::numeric, 2),
        ideal_stock = round(p_ideal_stock::numeric, 2),
        on_shopping_list = coalesce(p_on_shopping_list, false),
        updated_by = auth.uid()
    where id = p_product_id
    returning * into v_product;

    v_delta := v_product.current_stock - v_previous.current_stock;
    if v_delta <> 0 then
      insert into public.movements(
        household_id, product_id, product_name, type, delta, quantity_after, note, created_by
      ) values (
        v_product.household_id,
        v_product.id,
        v_product.name,
        'adjustment',
        v_delta,
        v_product.current_stock,
        'Actualización desde la ficha del producto',
        auth.uid()
      );
    end if;
  end if;

  return v_product;
end;
$$;

create or replace function public.archive_product(p_product_id uuid)
returns public.products
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product public.products;
begin
  select * into v_product
  from public.products
  where id = p_product_id and archived = false
  for update;

  if not found then raise exception 'El producto no existe o ya está archivado.'; end if;
  if not public.user_has_household_role(
    v_product.household_id,
    array['admin'::public.household_role]
  ) then
    raise exception 'Solo un administrador puede archivar productos.';
  end if;

  update public.products
  set archived = true, updated_by = auth.uid()
  where id = p_product_id
  returning * into v_product;
  return v_product;
end;
$$;

create or replace function public.rename_household(p_household_id uuid, p_name text)
returns public.households
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_household public.households;
begin
  if not public.user_has_household_role(
    p_household_id,
    array['admin'::public.household_role]
  ) then
    raise exception 'Solo un administrador puede cambiar el nombre del hogar.';
  end if;
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 60 then
    raise exception 'El nombre del hogar debe tener entre 2 y 60 caracteres.';
  end if;

  update public.households
  set name = trim(p_name)
  where id = p_household_id
  returning * into v_household;
  if not found then raise exception 'El hogar no existe.'; end if;
  return v_household;
end;
$$;

create or replace function public.revoke_household_invite(p_invite_id uuid)
returns public.household_invites
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invite public.household_invites;
begin
  select * into v_invite
  from public.household_invites
  where id = p_invite_id
  for update;
  if not found then raise exception 'La invitación no existe.'; end if;
  if not public.user_has_household_role(
    v_invite.household_id,
    array['admin'::public.household_role]
  ) then
    raise exception 'Solo un administrador puede revocar invitaciones.';
  end if;

  update public.household_invites
  set revoked_at = coalesce(revoked_at, now())
  where id = p_invite_id
  returning * into v_invite;
  return v_invite;
end;
$$;

create or replace function public.set_household_member_role(
  p_household_id uuid,
  p_user_id uuid,
  p_role public.household_role
)
returns public.household_members
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.household_members;
begin
  if not public.user_has_household_role(
    p_household_id,
    array['admin'::public.household_role]
  ) then
    raise exception 'Solo un administrador puede cambiar roles.';
  end if;
  if p_role is null then raise exception 'Selecciona un rol válido.'; end if;

  update public.household_members
  set role = p_role
  where household_id = p_household_id and user_id = p_user_id
  returning * into v_member;
  if not found then raise exception 'El miembro no existe en este hogar.'; end if;
  return v_member;
end;
$$;

create or replace function public.remove_household_member(
  p_household_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.user_has_household_role(
    p_household_id,
    array['admin'::public.household_role]
  ) then
    raise exception 'Solo un administrador puede retirar miembros.';
  end if;

  delete from public.household_members
  where household_id = p_household_id and user_id = p_user_id;
  if not found then raise exception 'El miembro no existe en este hogar.'; end if;
end;
$$;

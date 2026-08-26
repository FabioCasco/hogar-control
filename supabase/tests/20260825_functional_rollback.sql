-- Hogar Control v0.3 — prueba funcional transaccional.
-- Crea tres usuarios QA, ejecuta los flujos críticos y revierte absolutamente todo.
-- Úsala únicamente en un proyecto nuevo o de pruebas.

begin;

insert into auth.users(
  id, email, aud, role, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) values
  ('00000000-0000-4000-8000-000000000101', 'admin.qa@hogar-control.invalid', 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{"full_name":"Administrador QA"}', now(), now(), false, false),
  ('00000000-0000-4000-8000-000000000102', 'familia.qa@hogar-control.invalid', 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{"full_name":"Familiar QA"}', now(), now(), false, false),
  ('00000000-0000-4000-8000-000000000103', 'asesora.qa@hogar-control.invalid', 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{"full_name":"Asesora QA"}', now(), now(), false, false);

set local role authenticated;

do $$
declare
  v_admin constant uuid := '00000000-0000-4000-8000-000000000101';
  v_family constant uuid := '00000000-0000-4000-8000-000000000102';
  v_assistant constant uuid := '00000000-0000-4000-8000-000000000103';
  v_household uuid;
  v_category uuid;
  v_location uuid;
  v_product uuid;
  v_invite text;
  v_denied boolean;
  v_stock numeric;
  v_members integer;
  v_movements integer;
begin
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_admin::text, 'role', 'authenticated',
    'email', 'admin.qa@hogar-control.invalid',
    'user_metadata', jsonb_build_object('full_name', 'Administrador QA')
  )::text, true);

  select id into v_household from public.create_household('Hogar QA');
  if (select count(*) from public.categories where household_id = v_household) <> 9 then
    raise exception 'QA: no se crearon las 9 categorías iniciales.';
  end if;
  if (select count(*) from public.locations where household_id = v_household) <> 11 then
    raise exception 'QA: no se crearon las 11 ubicaciones iniciales.';
  end if;

  select code into v_invite
  from public.create_household_invite(v_household, 'family', 7, 1);
  if char_length(v_invite) <> 12 then
    raise exception 'QA: el código Familiar debe tener 12 caracteres.';
  end if;

  perform set_config('request.jwt.claim.sub', v_family::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_family::text, 'role', 'authenticated',
    'email', 'familia.qa@hogar-control.invalid',
    'user_metadata', jsonb_build_object('full_name', 'Familiar QA')
  )::text, true);
  perform public.accept_household_invite(v_invite);

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_admin::text, 'role', 'authenticated',
    'email', 'admin.qa@hogar-control.invalid',
    'user_metadata', jsonb_build_object('full_name', 'Administrador QA')
  )::text, true);
  select code into v_invite
  from public.create_household_invite(v_household, 'assistant', 7, 1);

  perform set_config('request.jwt.claim.sub', v_assistant::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_assistant::text, 'role', 'authenticated',
    'email', 'asesora.qa@hogar-control.invalid',
    'user_metadata', jsonb_build_object('full_name', 'Asesora QA')
  )::text, true);
  perform public.accept_household_invite(v_invite);

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_admin::text, 'role', 'authenticated',
    'email', 'admin.qa@hogar-control.invalid',
    'user_metadata', jsonb_build_object('full_name', 'Administrador QA')
  )::text, true);
  select id into v_category from public.categories where household_id = v_household and name = 'Alimentos';
  select id into v_location from public.locations where household_id = v_household and name = 'Despensa';

  select id into v_product
  from public.save_product(
    v_household, 'Arroz QA', v_category, v_location,
    'Marca QA', 'Bolsa 1 kg', 'bolsa', '🍚', null,
    5, 2, 8, false, null
  );

  perform set_config('request.jwt.claim.sub', v_family::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_family::text, 'role', 'authenticated',
    'email', 'familia.qa@hogar-control.invalid',
    'user_metadata', jsonb_build_object('full_name', 'Familiar QA')
  )::text, true);
  perform public.adjust_product_stock(v_product, -2, 'consumption', 'Consumo QA');
  perform public.set_product_shopping(v_product, true);

  perform set_config('request.jwt.claim.sub', v_assistant::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_assistant::text, 'role', 'authenticated',
    'email', 'asesora.qa@hogar-control.invalid',
    'user_metadata', jsonb_build_object('full_name', 'Asesora QA')
  )::text, true);
  perform public.set_product_review_level(v_product, 'out');

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_admin::text, 'role', 'authenticated',
    'email', 'admin.qa@hogar-control.invalid',
    'user_metadata', jsonb_build_object('full_name', 'Administrador QA')
  )::text, true);
  perform public.set_household_member_role(v_household, v_family, 'admin');
  if (select role from public.household_members where household_id = v_household and user_id = v_family) <> 'admin' then
    raise exception 'QA: no fue posible promover al Familiar como Administrador.';
  end if;
  perform public.set_household_member_role(v_household, v_family, 'family');

  perform set_config('request.jwt.claim.sub', v_assistant::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_assistant::text, 'role', 'authenticated',
    'email', 'asesora.qa@hogar-control.invalid',
    'user_metadata', jsonb_build_object('full_name', 'Asesora QA')
  )::text, true);

  v_denied := false;
  begin
    perform public.save_product(
      v_household, 'Producto no permitido', v_category, v_location,
      '', '', 'unidad', '📦', null, 1, 0, 2, false, null
    );
  exception when others then
    if position('Tu rol no puede crear ni editar productos' in sqlerrm) > 0 then
      v_denied := true;
    else
      raise;
    end if;
  end;
  if not v_denied then raise exception 'QA: la asesora pudo crear un producto.'; end if;

  v_denied := false;
  begin
    perform public.set_product_shopping(v_product, false);
  exception when others then
    if position('Tu rol no puede cambiar manualmente la lista de compras' in sqlerrm) > 0 then
      v_denied := true;
    else
      raise;
    end if;
  end;
  if not v_denied then raise exception 'QA: la asesora pudo editar manualmente la lista.'; end if;

  perform set_config('request.jwt.claim.sub', v_family::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_family::text, 'role', 'authenticated',
    'email', 'familia.qa@hogar-control.invalid',
    'user_metadata', jsonb_build_object('full_name', 'Familiar QA')
  )::text, true);
  v_denied := false;
  begin
    perform public.archive_product(v_product);
  exception when others then
    if position('Solo un administrador puede archivar productos' in sqlerrm) > 0 then
      v_denied := true;
    else
      raise;
    end if;
  end;
  if not v_denied then raise exception 'QA: un familiar pudo archivar un producto.'; end if;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_admin::text, 'role', 'authenticated',
    'email', 'admin.qa@hogar-control.invalid',
    'user_metadata', jsonb_build_object('full_name', 'Administrador QA')
  )::text, true);

  select current_stock into v_stock from public.products where id = v_product;
  select count(*) into v_members from public.household_members where household_id = v_household;
  select count(*) into v_movements from public.movements where product_id = v_product;
  if v_stock <> 0 then raise exception 'QA: la revisión no dejó el stock en cero.'; end if;
  if v_members <> 3 then raise exception 'QA: se esperaban 3 miembros y hay %.', v_members; end if;
  if v_movements <> 3 then raise exception 'QA: se esperaban 3 movimientos y hay %.', v_movements; end if;

  perform public.archive_product(v_product);
  if not (select archived from public.products where id = v_product) then
    raise exception 'QA: el administrador no pudo archivar el producto.';
  end if;
end;
$$;

reset role;
rollback;

select jsonb_build_object(
  'passed', true,
  'profiles_tested', array['admin','family','assistant'],
  'persistent_test_rows', 0
) as functional_test;

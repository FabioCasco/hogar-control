-- Hogar Control v0.3 — comprobación estructural y de privilegios.

do $$
declare
  v_table text;
  v_function text;
  v_policy_count integer;
  v_storage_policy_count integer;
  v_realtime_count integer;
  v_private_helpers integer;
begin
  foreach v_table in array array[
    'households','household_members','categories','locations',
    'products','movements','household_invites'
  ] loop
    if to_regclass(format('public.%I', v_table)) is null then
      raise exception 'Falta la tabla public.%', v_table;
    end if;
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = v_table
        and c.relrowsecurity
    ) then
      raise exception 'RLS no está activo en public.%', v_table;
    end if;
  end loop;

  foreach v_function in array array[
    'create_household(text)',
    'create_household_invite(uuid,public.household_role,integer,integer)',
    'accept_household_invite(text)',
    'save_product(uuid,text,uuid,uuid,text,text,text,text,text,numeric,numeric,numeric,boolean,uuid)',
    'archive_product(uuid)',
    'adjust_product_stock(uuid,numeric,public.movement_type,text)',
    'set_product_review_level(uuid,text)',
    'purchase_product(uuid,numeric)',
    'set_product_shopping(uuid,boolean)',
    'rename_household(uuid,text)',
    'revoke_household_invite(uuid)',
    'set_household_member_role(uuid,uuid,public.household_role)',
    'remove_household_member(uuid,uuid)'
  ] loop
    if to_regprocedure('public.' || v_function) is null then
      raise exception 'Falta la función public.%', v_function;
    end if;
    if not has_function_privilege('authenticated', 'public.' || v_function, 'EXECUTE') then
      raise exception 'authenticated no puede ejecutar public.%', v_function;
    end if;
    if has_function_privilege('anon', 'public.' || v_function, 'EXECUTE') then
      raise exception 'anon no debe ejecutar public.%', v_function;
    end if;
  end loop;

  select count(*) into v_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = any(array[
      'households','household_members','categories','locations',
      'products','movements','household_invites'
    ]);
  if v_policy_count <> 7 then
    raise exception 'Se esperaban 7 políticas públicas de lectura y existen %.', v_policy_count;
  end if;

  select count(*) into v_storage_policy_count
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname like 'product_images_%';
  if v_storage_policy_count <> 4 then
    raise exception 'Se esperaban 4 políticas de Storage y existen %.', v_storage_policy_count;
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id = 'product-images'
      and public = false
      and file_size_limit = 8388608
      and allowed_mime_types @> array['image/jpeg','image/png','image/webp','image/gif']::text[]
  ) then
    raise exception 'El bucket product-images no coincide con la configuración esperada.';
  end if;

  select count(*) into v_realtime_count
  from pg_publication_tables
  where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = any(array[
      'products','movements','categories','locations',
      'household_members','household_invites'
    ]);
  if v_realtime_count <> 6 then
    raise exception 'Se esperaban 6 tablas en Realtime y existen %.', v_realtime_count;
  end if;

  if has_table_privilege('anon', 'public.products', 'SELECT') then
    raise exception 'anon no debe tener SELECT sobre products.';
  end if;
  if not has_table_privilege('authenticated', 'public.products', 'SELECT') then
    raise exception 'authenticated necesita SELECT sobre products, sujeto a RLS.';
  end if;
  if has_table_privilege('authenticated', 'public.products', 'INSERT')
     or has_table_privilege('authenticated', 'public.products', 'UPDATE')
     or has_table_privilege('authenticated', 'public.products', 'DELETE') then
    raise exception 'authenticated no debe escribir products directamente.';
  end if;
  if has_table_privilege('authenticated', 'public.movements', 'INSERT') then
    raise exception 'authenticated no debe insertar movements directamente.';
  end if;

  select count(*) into v_private_helpers
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'app_private'
    and p.proname = any(array[
      'user_is_household_member','user_has_household_role','current_household_role'
    ]);
  if v_private_helpers <> 3 then
    raise exception 'Se esperaban 3 helpers privados y existen %.', v_private_helpers;
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public','app_private')
      and p.prosecdef
      and p.proname = any(array[
        'create_household','create_household_invite','accept_household_invite',
        'adjust_product_stock','set_product_review_level','purchase_product',
        'set_product_shopping','save_product','archive_product','rename_household',
        'revoke_household_invite','set_household_member_role','remove_household_member',
        'user_is_household_member','user_has_household_role','current_household_role'
      ])
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, array[]::text[])) cfg
        where cfg like 'search_path=%'
      )
  ) then
    raise exception 'Existe una función SECURITY DEFINER sin search_path fijado.';
  end if;

  raise notice 'Hogar Control: comprobación estructural y de privilegios completada correctamente.';
end $$;

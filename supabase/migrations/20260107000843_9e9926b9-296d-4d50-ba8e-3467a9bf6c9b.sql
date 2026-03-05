-- Admin license management RPCs (fixed defaults and admin check)

-- 1) List licenses with basic filters
create or replace function public.admin_list_licenses(
  p_search text default null,
  p_status text default null,  -- 'active', 'inactive', 'expired'
  p_page integer default 1,
  p_page_size integer default 50
)
returns table (
  id uuid,
  code text,
  user_id uuid,
  is_active boolean,
  derived_status text,
  license_type text,
  expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  notes text
)
language sql
security definer
as $$
  select
    l.id,
    l.code,
    l.user_id,
    l.is_active,
    case
      when l.is_active is false then 'inactive'
      when l.expires_at is not null and l.expires_at < now() then 'expired'
      when l.is_active is true and (l.expires_at is null or l.expires_at >= now()) then 'active'
      else 'unknown'
    end as derived_status,
    l.license_type,
    l.expires_at,
    l.created_at,
    l.updated_at,
    l.notes
  from public.licenses l
  where
    (p_search is null or (
      l.code ilike '%' || p_search || '%' or
      l.notes ilike '%' || p_search || '%'
    ))
    and (p_status is null or
      case
        when l.is_active is false then 'inactive'
        when l.expires_at is not null and l.expires_at < now() then 'expired'
        when l.is_active is true and (l.expires_at is null or l.expires_at >= now()) then 'active'
        else 'unknown'
      end = p_status)
  order by l.created_at desc
  limit p_page_size
  offset greatest(p_page - 1, 0) * p_page_size;
$$;

comment on function public.admin_list_licenses is 'Super admin: listar licenças com filtros básicos para o painel /supadmin/licenca';

-- 2) Create a custom license (optionally attached to a user)
create or replace function public.admin_create_custom_license(
  p_user_id uuid,
  p_days integer,
  p_license_type text default 'standard',
  p_notes text default null,
  p_is_active boolean default true
)
returns public.licenses
language plpgsql
security definer
as $$
declare
  v_license public.licenses;
  v_days integer;
  v_expires_at timestamptz;
begin
  -- Ensure only admins can call
  if not public.is_current_user_admin() then
    raise exception 'Acesso negado: apenas administradores podem criar licenças personalizadas';
  end if;

  if p_days is null or p_days <= 0 then
    raise exception 'p_days must be a positive integer';
  end if;

  v_days := p_days;
  v_expires_at := now() + (v_days || ' days')::interval;

  insert into public.licenses (
    code,
    user_id,
    is_active,
    license_type,
    expires_at,
    notes,
    created_at,
    updated_at
  ) values (
    -- simple unique code based on random bytes
    encode(gen_random_bytes(12), 'hex'),
    p_user_id,
    p_is_active,
    p_license_type,
    v_expires_at,
    p_notes,
    now(),
    now()
  )
  returning * into v_license;

  return v_license;
end;
$$;

comment on function public.admin_create_custom_license is 'Super admin: criar licença personalizada para /supadmin/licenca';

-- 3) Full update of a license
create or replace function public.admin_update_license_full(
  p_license_id uuid,
  p_user_id uuid default null,
  p_is_active boolean default null,
  p_expires_at timestamptz default null,
  p_license_type text default null,
  p_notes text default null
)
returns public.licenses
language plpgsql
security definer
as $$
declare
  v_license public.licenses;
begin
  -- Ensure only admins can call
  if not public.is_current_user_admin() then
    raise exception 'Acesso negado: apenas administradores podem editar licenças';
  end if;

  update public.licenses l
  set
    user_id = coalesce(p_user_id, l.user_id),
    is_active = coalesce(p_is_active, l.is_active),
    expires_at = coalesce(p_expires_at, l.expires_at),
    license_type = coalesce(p_license_type, l.license_type),
    notes = coalesce(p_notes, l.notes),
    updated_at = now()
  where l.id = p_license_id
  returning * into v_license;

  if not found then
    raise exception 'License not found';
  end if;

  return v_license;
end;
$$;

comment on function public.admin_update_license_full is 'Super admin: atualizar completamente uma licença em /supadmin/licenca';

-- 4) Soft-delete a license (mark inactive and append note)
create or replace function public.admin_delete_license(
  p_license_id uuid,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
as $$
begin
  -- Ensure only admins can call
  if not public.is_current_user_admin() then
    raise exception 'Acesso negado: apenas administradores podem apagar licenças';
  end if;

  update public.licenses l
  set
    is_active = false,
    notes = coalesce(l.notes, '') ||
            case when p_reason is not null then E'\n[DELETADA]: ' || p_reason else E'\n[DELETADA]' end,
    updated_at = now()
  where l.id = p_license_id;

  return found;
end;
$$;

comment on function public.admin_delete_license is 'Super admin: apagar (soft delete) uma licença em /supadmin/licenca';

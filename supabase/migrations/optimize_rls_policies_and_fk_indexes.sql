do $$
declare
  r record;
  new_qual text;
  new_with_check text;
  using_clause text;
  check_clause text;
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
  loop
    new_qual := r.qual;
    new_with_check := r.with_check;

    if new_qual is not null then
      new_qual := replace(new_qual, 'auth.uid()', '(select auth.uid())');
      new_qual := replace(new_qual, 'auth.role()', '(select auth.role())');
    end if;

    if new_with_check is not null then
      new_with_check := replace(new_with_check, 'auth.uid()', '(select auth.uid())');
      new_with_check := replace(new_with_check, 'auth.role()', '(select auth.role())');
    end if;

    if (new_qual is distinct from r.qual) or (new_with_check is distinct from r.with_check) then
      using_clause := case when new_qual is not null then format(' using (%s)', new_qual) else '' end;
      check_clause := case when new_with_check is not null then format(' with check (%s)', new_with_check) else '' end;

      execute format(
        'alter policy %I on %I.%I%s%s',
        r.policyname,
        r.schemaname,
        r.tablename,
        using_clause,
        check_clause
      );
    end if;
  end loop;
end $$;

do $$
declare
  r record;
  cols text[];
  col_list text;
  idx_base text;
  idx_name text;
  has_index boolean;
begin
  for r in
    select
      n.nspname as schemaname,
      c.relname as tablename,
      con.conname as constraint_name,
      con.conkey as conkey
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where con.contype = 'f'
      and n.nspname = 'public'
  loop
    cols := array(
      select a.attname
      from unnest(r.conkey) with ordinality as k(attnum, ord)
      join pg_attribute a
        on a.attrelid = (quote_ident(r.schemaname) || '.' || quote_ident(r.tablename))::regclass
       and a.attnum = k.attnum
      order by k.ord
    );

    if cols is null or array_length(cols, 1) is null then
      continue;
    end if;

    select exists(
      select 1
      from pg_index i
      where i.indrelid = (quote_ident(r.schemaname) || '.' || quote_ident(r.tablename))::regclass
        and i.indisvalid
        and i.indisready
        and (string_to_array(i.indkey::text, ' ')::int2[])[1:array_length(r.conkey, 1)] = r.conkey::int2[]
    ) into has_index;

    if has_index then
      continue;
    end if;

    col_list := (
      select string_agg(format('%I', col), ', ')
      from unnest(cols) as col
    );

    idx_base := format('idx_%s__%s', r.tablename, array_to_string(cols, '__'));
    if length(idx_base) > 55 then
      idx_name := left(idx_base, 55) || '_' || substr(md5(idx_base), 1, 7);
    else
      idx_name := idx_base;
    end if;

    execute format('create index if not exists %I on %I.%I (%s)', idx_name, r.schemaname, r.tablename, col_list);
  end loop;
end $$;

drop index if exists public.idx_budget_parts_budget_id_optimized;

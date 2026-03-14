create or replace function public.create_quick_test_session(
  p_name text,
  p_expires_days int default 7
)
returns table (
  id uuid,
  share_token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_token text;
  v_attempt int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;

  delete from public.device_test_sessions
  where created_by = v_user_id
    and device_info->>'source' = 'quick_test'
    and expires_at <= now();

  delete from public.device_test_sessions
  where id in (
    select id
    from public.device_test_sessions
    where created_by = v_user_id
      and device_info->>'source' = 'quick_test'
    order by created_at desc
    offset 4
  );

  for v_attempt in 1..20 loop
    v_token := (floor(random() * 9000) + 1000)::int::text;
    begin
      insert into public.device_test_sessions (
        share_token,
        status,
        device_info,
        expires_at,
        created_by,
        service_order_id,
        test_results
      ) values (
        v_token,
        'pending',
        jsonb_build_object('name', trim(p_name), 'source', 'quick_test'),
        now() + make_interval(days => greatest(1, p_expires_days)),
        v_user_id,
        null,
        '{}'::jsonb
      )
      returning public.device_test_sessions.id,
                public.device_test_sessions.share_token,
                public.device_test_sessions.expires_at
      into id, share_token, expires_at;

      return next;
      return;
    exception
      when unique_violation then
        null;
    end;
  end loop;

  raise exception 'token_generation_failed' using errcode = '23514';
end;
$$;

revoke all on function public.create_quick_test_session(text, int) from public;
grant execute on function public.create_quick_test_session(text, int) to authenticated;


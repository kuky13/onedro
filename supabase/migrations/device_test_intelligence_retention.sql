create extension if not exists pgcrypto;
create extension if not exists pg_cron;

alter table public.device_test_sessions
  add column if not exists summary jsonb not null default '{}'::jsonb,
  add column if not exists raw_archived boolean not null default false;

create table if not exists public.device_test_retention_policies (
  source text primary key,
  retain_raw_days int not null default 7,
  retain_archive_days int not null default 180,
  rollup_keep_days int not null default 365,
  updated_at timestamptz not null default now()
);

create trigger update_device_test_retention_policies_updated_at
  before update on public.device_test_retention_policies
  for each row
  execute function public.update_updated_at_column();

insert into public.device_test_retention_policies (source, retain_raw_days, retain_archive_days, rollup_keep_days)
values
  ('quick_test', 7, 180, 365),
  ('diagnostic_share', 30, 365, 730),
  ('service_order', 90, 730, 1095)
on conflict (source) do update
set retain_raw_days = excluded.retain_raw_days,
    retain_archive_days = excluded.retain_archive_days,
    rollup_keep_days = excluded.rollup_keep_days;

create table if not exists public.device_test_critical_tests (
  test_id text primary key,
  severity text not null default 'critical'
);

insert into public.device_test_critical_tests (test_id, severity)
values
  ('display_touch', 'critical'),
  ('audio_speaker', 'critical'),
  ('audio_mic', 'critical'),
  ('camera_front', 'high'),
  ('camera_back', 'high'),
  ('buttons', 'critical'),
  ('battery', 'critical')
on conflict (test_id) do nothing;

create table if not exists public.device_test_session_archives (
  session_id uuid primary key references public.device_test_sessions(id) on delete cascade,
  source text not null,
  created_by uuid references auth.users(id),
  archived_at timestamptz not null default now(),
  raw_test_results jsonb not null,
  raw_device_info jsonb not null,
  raw_size_bytes int not null,
  raw_hash text not null
);

alter table public.device_test_session_archives
  alter column raw_test_results set compression lz4;

alter table public.device_test_session_archives
  alter column raw_device_info set compression lz4;

create table if not exists public.device_test_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  action text not null,
  session_id uuid,
  source text,
  actor_id uuid,
  details jsonb not null default '{}'::jsonb
);

create or replace function public.build_device_test_summary(p_test_results jsonb, p_source text default null)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_filtered jsonb;
  v_critical jsonb;
  v_perf jsonb;
  v_outliers jsonb;
begin
  select coalesce(
    jsonb_object_agg(e.key,
      jsonb_strip_nulls(
        jsonb_build_object(
          'status', e.value->>'status',
          'score', (e.value->>'score')::numeric,
          'duration_ms', (e.value->>'duration_ms')::int,
          'error', e.value->>'error',
          'completed_at', e.value->>'completed_at',
          'details', case
            when (e.value->>'status') is distinct from 'passed' then e.value->'details'
            else null
          end
        )
      )
    ),
    '{}'::jsonb
  )
  into v_filtered
  from jsonb_each(coalesce(p_test_results, '{}'::jsonb)) e;

  select coalesce(
    jsonb_agg(
      jsonb_strip_nulls(
        jsonb_build_object(
          'test_id', e.key,
          'error', e.value->>'error',
          'score', (e.value->>'score')::numeric
        )
      )
    ),
    '[]'::jsonb
  )
  into v_critical
  from jsonb_each(coalesce(p_test_results, '{}'::jsonb)) e
  join public.device_test_critical_tests ct on ct.test_id = e.key
  where (e.value->>'status') = 'failed';

  with vals as (
    select
      (e.value->>'status') as status,
      nullif((e.value->>'duration_ms')::int, 0) as duration_ms
    from jsonb_each(coalesce(p_test_results, '{}'::jsonb)) e
  )
  select jsonb_build_object(
    'total_tests', count(*),
    'passed', count(*) filter (where status = 'passed'),
    'failed', count(*) filter (where status = 'failed'),
    'skipped', count(*) filter (where status = 'skipped'),
    'avg_duration_ms', case when count(duration_ms) > 0 then round(avg(duration_ms))::int else null end,
    'total_duration_ms', coalesce(sum(duration_ms), 0)
  )
  into v_perf
  from vals;

  with each_test as (
    select e.key as test_id, e.value as v
    from jsonb_each(coalesce(p_test_results, '{}'::jsonb)) e
  ), outlier_rows as (
    select test_id, 'score'::text as metric, (v->>'score')::numeric as val, 'score<70'::text as rule
    from each_test
    where (v ? 'score') and (v->>'score')::numeric < 70
    union all
    select test_id, 'duration_ms', (v->>'duration_ms')::numeric, 'duration_ms>15000'
    from each_test
    where (v ? 'duration_ms') and (v->>'duration_ms')::numeric > 15000
    union all
    select test_id, 'battery.level', (v->'details'->>'level')::numeric, 'battery.level<30'
    from each_test
    where test_id = 'battery' and (v->'details' ? 'level') and (v->'details'->>'level')::numeric < 30
    union all
    select test_id, 'location.accuracy', (v->'details'->>'accuracy')::numeric, 'location.accuracy>100'
    from each_test
    where test_id = 'location' and (v->'details' ? 'accuracy') and (v->'details'->>'accuracy')::numeric > 100
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'test_id', test_id,
        'metric', metric,
        'value', val,
        'rule', rule
      )
    ),
    '[]'::jsonb
  )
  into v_outliers
  from outlier_rows;

  return jsonb_build_object(
    'filtered_results', v_filtered,
    'critical_failures', v_critical,
    'perf_metrics', v_perf,
    'outliers', v_outliers,
    'source', p_source
  );
end;
$$;

create or replace function public.device_test_sessions_set_summary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source text;
begin
  v_source := coalesce(new.device_info->>'source', null);

  if new.status = 'completed' and (old.status is distinct from 'completed') then
    new.summary := public.build_device_test_summary(new.test_results, v_source);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_device_test_sessions_set_summary on public.device_test_sessions;
create trigger trg_device_test_sessions_set_summary
  before update on public.device_test_sessions
  for each row
  execute function public.device_test_sessions_set_summary();

create or replace function public.archive_device_test_sessions(p_source text default 'quick_test', p_max_rows int default 500)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_retain_raw_days int;
  v_archived int := 0;
begin
  select retain_raw_days
  into v_retain_raw_days
  from public.device_test_retention_policies
  where source = p_source;

  if v_retain_raw_days is null then
    v_retain_raw_days := 7;
  end if;

  with candidates as (
    select s.*
    from public.device_test_sessions s
    where s.status = 'completed'
      and coalesce(s.device_info->>'source', '') = p_source
      and s.raw_archived = false
      and s.completed_at is not null
      and s.completed_at < now() - make_interval(days => v_retain_raw_days)
    order by s.completed_at asc
    limit greatest(1, p_max_rows)
  ), ins as (
    insert into public.device_test_session_archives (
      session_id,
      source,
      created_by,
      raw_test_results,
      raw_device_info,
      raw_size_bytes,
      raw_hash
    )
    select
      c.id,
      p_source,
      c.created_by,
      c.test_results,
      c.device_info,
      octet_length(convert_to(c.test_results::text, 'utf8')) + octet_length(convert_to(c.device_info::text, 'utf8')),
      encode(digest((c.test_results::text || '|' || c.device_info::text), 'sha256'), 'hex')
    from candidates c
    on conflict (session_id) do nothing
    returning session_id
  )
  update public.device_test_sessions s
  set
    test_results = coalesce(s.summary->'filtered_results', '{}'::jsonb),
    device_info = jsonb_strip_nulls(
      jsonb_build_object(
        'source', s.device_info->>'source',
        'name', s.device_info->>'name'
      )
    ),
    raw_archived = true
  where s.id in (select session_id from ins);

  get diagnostics v_archived = row_count;

  insert into public.device_test_audit_log(action, source, actor_id, details)
  values (
    'ARCHIVE_RAW',
    p_source,
    auth.uid(),
    jsonb_build_object('archived_rows', v_archived)
  );

  return v_archived;
end;
$$;

create table if not exists public.device_test_rollups_daily (
  day date not null,
  source text not null,
  created_by uuid,
  total_completed int not null,
  avg_score numeric,
  failures_by_test jsonb not null default '{}'::jsonb,
  outliers_count int not null default 0,
  critical_failures_count int not null default 0,
  created_at timestamptz not null default now(),
  primary key (day, source, created_by)
);

create or replace function public.rollup_device_tests_daily(p_day date default (current_date - 1))
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted int := 0;
begin
  with base as (
    select
      completed_at::date as day,
      device_info->>'source' as source,
      created_by,
      overall_score,
      summary
    from public.device_test_sessions
    where status = 'completed'
      and completed_at is not null
      and completed_at::date = p_day
  ), failures as (
    select
      b.day,
      b.source,
      b.created_by,
      e.key as test_id,
      count(*) as c
    from base b
    join lateral jsonb_each(coalesce(b.summary->'filtered_results', '{}'::jsonb)) e on true
    where (e.value->>'status') = 'failed'
    group by 1,2,3,4
  ), failures_json as (
    select day, source, created_by, jsonb_object_agg(test_id, c) as failures_by_test
    from failures
    group by 1,2,3
  ), agg as (
    select
      b.day,
      b.source,
      b.created_by,
      count(*) as total_completed,
      avg(b.overall_score) as avg_score,
      coalesce(sum(jsonb_array_length(coalesce(b.summary->'outliers', '[]'::jsonb))), 0) as outliers_count,
      coalesce(sum(jsonb_array_length(coalesce(b.summary->'critical_failures', '[]'::jsonb))), 0) as critical_failures_count
    from base b
    group by 1,2,3
  )
  insert into public.device_test_rollups_daily (
    day,
    source,
    created_by,
    total_completed,
    avg_score,
    failures_by_test,
    outliers_count,
    critical_failures_count
  )
  select
    a.day,
    a.source,
    a.created_by,
    a.total_completed,
    a.avg_score,
    coalesce(f.failures_by_test, '{}'::jsonb),
    a.outliers_count,
    a.critical_failures_count
  from agg a
  left join failures_json f
    on f.day = a.day and f.source = a.source and f.created_by is not distinct from a.created_by
  on conflict (day, source, created_by) do update
  set
    total_completed = excluded.total_completed,
    avg_score = excluded.avg_score,
    failures_by_test = excluded.failures_by_test,
    outliers_count = excluded.outliers_count,
    critical_failures_count = excluded.critical_failures_count;

  get diagnostics v_inserted = row_count;

  insert into public.device_test_audit_log(action, actor_id, details)
  values (
    'ROLLUP_DAILY',
    auth.uid(),
    jsonb_build_object('day', p_day, 'rows', v_inserted)
  );

  return v_inserted;
end;
$$;

select cron.schedule(
  'archive_quick_test_raw',
  '10 3 * * *',
  $$select public.archive_device_test_sessions('quick_test', 500);$$
);

select cron.schedule(
  'rollup_device_tests_daily',
  '15 3 * * *',
  $$select public.rollup_device_tests_daily(current_date - 1);$$
);

alter table public.device_test_session_archives enable row level security;
alter table public.device_test_rollups_daily enable row level security;
alter table public.device_test_retention_policies enable row level security;
alter table public.device_test_critical_tests enable row level security;
alter table public.device_test_audit_log enable row level security;

drop policy if exists "Owners can read archived sessions" on public.device_test_session_archives;
create policy "Owners can read archived sessions" on public.device_test_session_archives
  for select
  using (created_by = auth.uid());

drop policy if exists "Admins can manage device test policies" on public.device_test_retention_policies;
create policy "Admins can manage device test policies" on public.device_test_retention_policies
  for all
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid() and up.role = 'admin'
    )
  );

drop policy if exists "Admins can manage critical tests" on public.device_test_critical_tests;
create policy "Admins can manage critical tests" on public.device_test_critical_tests
  for all
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid() and up.role = 'admin'
    )
  );

drop policy if exists "Owners can read rollups" on public.device_test_rollups_daily;
create policy "Owners can read rollups" on public.device_test_rollups_daily
  for select
  using (created_by = auth.uid());

drop policy if exists "Admins can read audit" on public.device_test_audit_log;
create policy "Admins can read audit" on public.device_test_audit_log
  for select
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid() and up.role = 'admin'
    )
  );


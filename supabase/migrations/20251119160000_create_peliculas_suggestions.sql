-- Create table for user suggestions of missing peliculas models
create table if not exists public.peliculas_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  model text not null,
  brand text,
  notes text,
  status text default 'new',
  created_at timestamptz default now()
);

alter table public.peliculas_suggestions enable row level security;

-- Allow authenticated users to insert their own suggestions
create policy peliculas_suggestions_insert_self on public.peliculas_suggestions
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Allow users to read their own suggestions
create policy peliculas_suggestions_select_self on public.peliculas_suggestions
  for select
  to authenticated
  using (user_id = auth.uid());

-- Allow admins to read all
create policy peliculas_suggestions_select_admin on public.peliculas_suggestions
  for select
  to authenticated
  using (public.is_current_user_admin());

-- Allow admins to delete
create policy peliculas_suggestions_delete_admin on public.peliculas_suggestions
  for delete
  to authenticated
  using (public.is_current_user_admin());

comment on table public.peliculas_suggestions is 'User-submitted suggestions for missing peliculas models';

-- Create security_audit_log table
create table if not exists public.security_audit_log (
  id uuid default gen_random_uuid() primary key,
  event_type text not null,
  user_id uuid references auth.users(id),
  session_id text,
  ip_address text,
  user_agent text,
  resource_type text,
  resource_id text,
  action text not null,
  details jsonb default '{}'::jsonb,
  risk_level text check (risk_level in ('low', 'medium', 'high', 'critical')),
  timestamp timestamptz default now(),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.security_audit_log enable row level security;

-- Policies
-- Allow anyone to insert logs (needed for login failures, etc)
create policy "Enable insert for all users" on public.security_audit_log for insert with check (true);

-- Allow users to view their own logs
create policy "Enable select for own logs" on public.security_audit_log for select using (auth.uid() = user_id);

-- Grant access
grant all on public.security_audit_log to anon, authenticated, service_role;


create table public.ai_request_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  provider text not null,
  model text not null,
  source text not null default 'unknown',
  input_tokens int,
  output_tokens int,
  duration_ms int,
  status text not null default 'success',
  error_message text,
  user_id uuid references auth.users(id),
  metadata jsonb default '{}'
);

alter table public.ai_request_logs enable row level security;

create policy "Admins can view AI logs"
on public.ai_request_logs
for select
to authenticated
using (true);

create index idx_ai_request_logs_created_at on public.ai_request_logs(created_at desc);
create index idx_ai_request_logs_provider on public.ai_request_logs(provider);
create index idx_ai_request_logs_source on public.ai_request_logs(source);

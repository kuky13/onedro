create table if not exists subscription_plans (
  id uuid default gen_random_uuid() primary key,
  plan_type text unique not null check (plan_type in ('monthly', 'yearly')),
  name text not null,
  description text,
  price numeric not null,
  features text[] default '{}',
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table subscription_plans enable row level security;

-- Create policy to allow public read access
create policy "Allow public read access"
  on subscription_plans for select
  using (true);

-- Insert initial data
insert into subscription_plans (plan_type, name, description, price, features) values
  ('monthly', 'Plano Profissional Mensal', 'Para assistências que querem crescer', 10.00, ARRAY['Sistema de orçamentos e ordens de serviço', 'Gestão de clientes ilimitada', 'Cálculos automáticos', 'Suporte técnico incluso', 'Atualizações gratuitas', 'Backup automático']),
  ('yearly', 'Plano Profissional Anual', 'Para assistências que querem crescer com economia', 10.00, ARRAY['Sistema de orçamentos e ordens de serviço', 'Gestão de clientes ilimitada', 'Cálculos automáticos', 'Suporte técnico incluso', 'Atualizações gratuitas', 'Backup automático', '4 meses grátis']);

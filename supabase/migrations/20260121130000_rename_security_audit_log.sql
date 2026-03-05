-- Renomeia a tabela para evitar bloqueios de adblockers que filtram termos como "security" ou "audit"
alter table if exists public.security_audit_log rename to activity_events;

-- Atualiza políticas
drop policy if exists "Enable insert for all users" on public.activity_events;
drop policy if exists "Enable select for own logs" on public.activity_events;

create policy "Enable insert for all users" on public.activity_events for insert with check (true);
create policy "Enable select for own logs" on public.activity_events for select using (auth.uid() = user_id);

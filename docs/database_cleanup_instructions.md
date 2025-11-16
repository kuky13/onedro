# Instruções de Limpeza do Banco de Dados OneDrip

## CONTEXTO
O banco de dados Supabase do projeto OneDrip possui várias tabelas e colunas que não estão sendo utilizadas pela aplicação. Foi realizada uma análise técnica completa que identificou recursos obsoletos que podem ser removidos com segurança.

## OBJETIVO
Executar a limpeza do banco de dados removendo tabelas e colunas não utilizadas, seguindo um processo incremental e seguro com backup preventivo.

## ARQUIVOS CRIADOS
1. `backup_before_cleanup.sql` - Script de backup preventivo
2. `20251002000001_remove_unused_tables_phase1.sql` - Migração Fase 1
3. `20251002000002_remove_search_vector_column.sql` - Migração Fase 2
4. `20251002000003_remove_legacy_tables.sql` - Migração Fase 3

## TAREFAS A EXECUTAR

### FASE 1: BACKUP PREVENTIVO
1. **EXECUTAR PRIMEIRO:** Rode o script `backup_before_cleanup.sql` no banco de dados Supabase
2. **VERIFICAR:** Confirme que o schema `backup_2025_10_02` foi criado com todas as tabelas de backup
3. **VALIDAR:** Execute `SELECT * FROM backup_2025_10_02.backup_log;` para ver o resumo do backup

### FASE 2: APLICAR MIGRAÇÕES (NESTA ORDEM)
1. **Migração 1:** Execute `20251002000001_remove_unused_tables_phase1.sql`
   - Remove: `pix_transactions`, `login_attempts`, `rate_limit_tracking`, `rate_limiting`
   - **RISCO:** BAIXO (tabelas vazias, sem referências no código)

2. **Migração 2:** Execute `20251002000002_remove_search_vector_column.sql`
   - Remove: coluna `search_vector` da tabela `budgets` + 3 índices relacionados
   - **RISCO:** BAIXO (coluna não referenciada no código)

3. **Migração 3:** Execute `20251002000003_remove_legacy_tables.sql`
   - Remove: `user_activity_metrics`, `persistent_sessions`, `user_notifications_read`, `vip_backup`, `spam_patterns`, `service_order_shares`
   - **RISCO:** MÉDIO (algumas tabelas têm dados residuais, mas sem referências no código)

### FASE 3: VALIDAÇÃO
1. **VERIFICAR:** Confirme que as tabelas foram removidas do schema `public`
2. **TESTAR:** Execute a aplicação para garantir que não há erros
3. **MONITORAR:** Observe por alguns dias se há algum problema

## COMANDOS DE VERIFICAÇÃO

### Antes da limpeza:
```sql
-- Contar tabelas no schema public
SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = 'public';

-- Verificar se search_vector existe
SELECT column_name FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'search_vector';
```

### Depois da limpeza:
```sql
-- Verificar se as tabelas foram removidas
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
AND table_name IN ('pix_transactions', 'login_attempts', 'rate_limit_tracking', 'rate_limiting', 'user_activity_metrics', 'persistent_sessions', 'user_notifications_read', 'vip_backup', 'spam_patterns', 'service_order_shares');

-- Verificar se search_vector foi removida
SELECT column_name FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'search_vector';

-- Verificar se backup existe
SELECT COUNT(*) as backup_tables FROM information_schema.tables WHERE table_schema = 'backup_2025_10_02';
```

## RECURSOS QUE SERÃO REMOVIDOS

### TABELAS COMPLETAMENTE NÃO UTILIZADAS (Fase 1):
- `pix_transactions` - 0 referências no código, 0 registros
- `login_attempts` - 0 referências no código, 0 registros
- `rate_limit_tracking` - 0 referências no código, 0 registros
- `rate_limiting` - 0 referências no código, 0 registros

### COLUNA NÃO UTILIZADA (Fase 2):
- `budgets.search_vector` - 0 referências no código, + 3 índices GIN

### TABELAS LEGADAS (Fase 3):
- `user_activity_metrics` - 0 referências no código, 0 registros atuais
- `persistent_sessions` - 0 referências no código, 0 registros atuais
- `user_notifications_read` - 0 referências no código, 0 registros atuais
- `vip_backup` - 0 referências no código, 5 registros (backup de sistema antigo)
- `spam_patterns` - 0 referências no código, 9 registros
- `service_order_shares` - 0 referências no código, 4 registros

## BENEFÍCIOS ESPERADOS
- **Performance:** Menos tabelas e índices para manter
- **Manutenção:** Schema mais limpo e focado
- **Clareza:** Estrutura de dados mais compreensível
- **Espaço:** Redução do uso de armazenamento

## PLANO DE ROLLBACK
Se houver problemas, os dados podem ser restaurados do schema `backup_2025_10_02`. Exemplo:
```sql
-- Restaurar uma tabela se necessário
CREATE TABLE public.pix_transactions AS SELECT * FROM backup_2025_10_02.pix_transactions_backup;
```

## INSTRUÇÕES ESPECIAIS
- **EXECUTAR EM HORÁRIO DE BAIXO TRÁFEGO**
- **FAZER BACKUP COMPLETO DO BANCO ANTES DE COMEÇAR**
- **TESTAR EM AMBIENTE DE DESENVOLVIMENTO PRIMEIRO (se disponível)**
- **MONITORAR LOGS DE ERRO DA APLICAÇÃO APÓS CADA FASE**

## CONFIRMAÇÃO NECESSÁRIA
Após executar cada fase, confirme:
- [ ] Backup executado com sucesso
- [ ] Fase 1 aplicada sem erros
- [ ] Fase 2 aplicada sem erros
- [ ] Fase 3 aplicada sem erros
- [ ] Aplicação funcionando normalmente
- [ ] Nenhum erro nos logs

---

**IMPORTANTE:** Este processo foi baseado em análise técnica detalhada que confirmou que nenhum dos recursos a serem removidos possui referências no código-fonte da aplicação OneDrip.
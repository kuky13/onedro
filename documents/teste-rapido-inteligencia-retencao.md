# Teste Rápido — Inteligência de Armazenamento (filtragem, retenção, compressão e rollups)

## Objetivo
Reduzir o uso de armazenamento dos relatórios do **/teste-rapido** mantendo a integridade analítica.

O sistema passa a:
- Persistir apenas dados essenciais e relevantes por padrão (principalmente para `source = quick_test`).
- Identificar e reter **falhas críticas**, **métricas de performance** e **resultados fora do padrão**.
- Descartar automaticamente dados redundantes/irrelevantes.
- Aplicar **retenção configurável por tipo de teste**.
- Arquivar histórico com **compressão LZ4**.
- Gerar **relatórios consolidados periódicos** (rollups diários).

## O que mudou (alto nível)

### 1) Filtragem inteligente no cliente (/testar/:token)
Arquivo: [deviceTestStorage.ts](file:///d:/DEV/onedro/src/utils/deviceTestStorage.ts)

Quando `device_info.source === "quick_test"`:
- `device_info` é persistido de forma enxuta:
  - preserva `source` e `name`
  - remove `user_agent` completo e persiste `ua_hash` (SHA-256)
  - mantém apenas `platform`, `screen_resolution`, `viewport`, `language`
- `test_results` é persistido sanitizado:
  - remove `details` grandes para testes aprovados
  - mantém um subconjunto de métricas úteis (allowlist por teste)
  - preserva falhas (incluindo `error`) e mantém detalhes mínimos úteis

Integração: [DeviceTestPage.tsx](file:///d:/DEV/onedro/src/pages/DeviceTestPage.tsx)

### 2) Retenção configurável por tipo de teste (Supabase)
Migração: [device_test_intelligence_retention.sql](file:///d:/DEV/onedro/supabase/migrations/device_test_intelligence_retention.sql)

Tabela de configuração:
- `public.device_test_retention_policies`
  - `source` (ex.: `quick_test`, `diagnostic_share`, `service_order`)
  - `retain_raw_days`: dias mantendo o payload “raw”
  - `retain_archive_days`: dias mantendo o histórico arquivado
  - `rollup_keep_days`: dias mantendo rollups

### 3) Arquivamento + compressão LZ4 para histórico
Tabela:
- `public.device_test_session_archives`
  - `raw_test_results` e `raw_device_info` com `SET COMPRESSION lz4`

Processo:
- Função `public.archive_device_test_sessions(source, max_rows)`
  - move sessões concluídas antigas para `device_test_session_archives`
  - grava hash SHA-256 (`raw_hash`) para auditoria/integridade
  - compacta o registro principal (`device_test_sessions`) para ficar leve

Agendamento (pg_cron):
- `archive_quick_test_raw` diariamente 03:10 UTC

### 4) Resumo automatizado e rollups periódicos
Coluna:
- `public.device_test_sessions.summary`
  - preenchida automaticamente quando a sessão muda para `completed`
  - contém: `filtered_results`, `critical_failures`, `perf_metrics`, `outliers`

Rollups:
- Tabela `public.device_test_rollups_daily`
- Função `public.rollup_device_tests_daily(day)`
- Agendamento (pg_cron): diariamente 03:15 UTC

### 5) Auditoria
Tabela:
- `public.device_test_audit_log`

Eventos gravados:
- `ARCHIVE_RAW` (quantidade arquivada por execução)
- `ROLLUP_DAILY` (quantidade de linhas agregadas por dia)

## Definição de “dados essenciais”

### Falhas críticas
Tabela: `public.device_test_critical_tests`

Defaults:
- `display_touch`, `audio_speaker`, `audio_mic`, `buttons`, `battery` (critical)
- `camera_front`, `camera_back` (high)

### Métricas de performance
Resumo inclui:
- total de testes/passed/failed/skipped
- média e soma de `duration_ms`
- teste mais lento (no cliente)

### Outliers (fora do padrão)
Heurísticas default (podem evoluir para thresholds configuráveis):
- `score < 70`
- `duration_ms > 15000`
- `battery.level < 30`
- `location.accuracy > 100`

## Benchmarks

### Benchmark automatizado (unit test)
Arquivo: [deviceTestStorage.test.ts](file:///d:/DEV/onedro/src/utils/deviceTestStorage.test.ts)

O teste `benchmark: reduz significativamente payload sintético` cria um payload representativo (com `colors` enorme) e valida:
- redução > 60% do tamanho em bytes após filtragem.

### Benchmark sugerido em produção (SQL)
Comparar tamanhos e crescimento por tabela:

```sql
select
  relname,
  pg_size_pretty(pg_total_relation_size(relid)) as total
from pg_catalog.pg_statio_user_tables
where relname in (
  'device_test_sessions',
  'device_test_session_archives',
  'device_test_rollups_daily'
)
order by pg_total_relation_size(relid) desc;
```

Comparar tamanho médio do payload `test_results` por source:

```sql
select
  device_info->>'source' as source,
  round(avg(octet_length(convert_to(test_results::text, 'utf8')))) as avg_bytes
from public.device_test_sessions
group by 1
order by 2 desc;
```

## Operação / Ajustes

### Ajustar retenção
Somente admin (RLS) pode alterar `device_test_retention_policies`.

Exemplo:

```sql
update public.device_test_retention_policies
set retain_raw_days = 3
where source = 'quick_test';
```

### Forçar arquivamento/rollup manual

```sql
select public.archive_device_test_sessions('quick_test', 500);
select public.rollup_device_tests_daily(current_date - 1);
```


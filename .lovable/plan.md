
# Diferenciar testes rápidos e usar códigos de 4 dígitos

## Problema
- A query busca **todos** os `device_test_sessions`, misturando links de teste rápido com sessões de diagnóstico de outras partes do sistema.
- O `share_token` usa UUID, mas o usuário quer códigos curtos de 4 dígitos aleatórios.

## Solução

### `src/pages/TesteRapidoPage.tsx`

1. **Filtrar por origem**: Adicionar `source: 'quick_test'` dentro do campo `device_info` ao criar, e filtrar com `.filter('device_info->>source', 'eq', 'quick_test')` ao buscar.

2. **Token de 4 dígitos**: Substituir `crypto.randomUUID()` por uma função que gera 4 dígitos aleatórios (ex: `Math.floor(1000 + Math.random() * 9000).toString()`). Adicionar retry caso o token já exista (colisão).

3. **Exibir código curto**: A URL do link continuará sendo `/testar/1234`, e o nome exibido usará o campo `device_info.name`.

| Mudança | Detalhe |
|---------|---------|
| Geração do token | `crypto.randomUUID()` → 4 dígitos aleatórios |
| Insert `device_info` | Adicionar `source: 'quick_test'` |
| Query fetch | Filtrar `device_info->>source = 'quick_test'` |

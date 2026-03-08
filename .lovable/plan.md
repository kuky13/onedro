
Objetivo
- Corrigir `/share/service-order/OS0005` para exibir exatamente o mesmo preço mostrado em `/service-orders` (sem diferença de escala).

Diagnóstico da causa
- Em `ServiceOrderPublicShare.tsx`, o valor está sendo formatado com divisão por 100 (`serviceOrder.total_price / 100`).
- Em `ServiceOrdersPageSimple.tsx`, o mesmo campo é exibido direto (sem `/100`), então as telas ficam inconsistentes.
- Resultado: no compartilhamento público ocorre “dupla conversão” de escala para esse contexto.

Plano de correção
1) Padronizar a formatação do total em `/share/service-order/:id`
- Arquivo: `src/components/ServiceOrderPublicShare.tsx`
- Ajustar os 2 pontos de exibição do total:
  - Card “Pagamento”
  - Bloco “Valor Total” em “Serviço”
- Trocar de `format(serviceOrder.total_price / 100)` para formatação do valor bruto (mesma base do `/service-orders`).

2) Evitar regressão futura
- Aplicar o mesmo padrão de formatação entre páginas (ideal: helper único para valores de OS em reais, sem divisão por 100 nesse fluxo).
- Manter consistência entre link público, listagem e detalhes internos.

3) Verificação funcional (E2E rápido)
- Abrir a mesma OS nas duas telas:
  - `/service-orders`
  - `/share/service-order/OS0005`
- Confirmar que o valor exibido é idêntico nas duas views.
- Revalidar mais 1-2 ordens para garantir que não há variação por status/realtime.

Critério de aceite
- O valor em `/share/service-order/OSXXXX` fica igual ao da listagem `/service-orders` para a mesma OS.
- Não há mais diferença de escala (ex.: 1.510 vs 15,10 ou 151.000).

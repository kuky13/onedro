

## Problema

Quando o orçamento tem `budget_parts`, os detalhes expandidos mostram o estilo "Peças / Serviços" com badges coloridos e botão "Adicionar à Loja" (imagem 2). Quando **não** tem parts, mostra o estilo limpo "Informações" com labels e valores organizados (imagem 1). O usuário quer que **sempre** use o estilo limpo da imagem 1.

## Solução

**Arquivo**: `src/components/worm/WormBudgetCard.tsx` (linhas 312-395)

Unificar os dois blocos (com parts e sem parts) em um só estilo "Informações":

- Remover o bloco "Peças / Serviços" com badges (linhas 313-360)
- Quando houver parts, iterar sobre elas usando o mesmo layout limpo do fallback: grid com labels "Qualidade", "Garantia", "À vista", "Parcelado" — cada part como uma seção
- Manter o botão "Adicionar à Loja" separado, fora do card de informações
- Se houver múltiplas parts, mostrar cada uma em seu próprio bloco "Informações" com o nome da qualidade como título

Layout por part:
```
Informações
  Qualidade        Garantia
  Original Nac.    6 meses
  À vista          Parcelado
  R$ 600,00        R$ 680,00 • 4x
```


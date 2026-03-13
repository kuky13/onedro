

## Plan: Atualizar página de Termos de Uso

### Mudanças principais

**1. Seção 9 - Pagamentos e Cobrança (linhas 293-315)**
- Adicionar que os pagamentos são processados via **AbacatePay** (intermediador de pagamento)
- Mencionar métodos aceitos: PIX
- Incluir CNPJ da empresa nas informações de cobrança

**2. Seção 10.2 - Reembolsos Após Prazo (linhas 340-353)**
- Substituir "Mercado Pago" por "AbacatePay"
- Substituir taxa de "4,99%" pela taxa do AbacatePay (tipicamente 1,99% para PIX)
- Atualizar referência de cartão de crédito para focar em PIX

**3. Seção 10.3 - Forma de Reembolso (linhas 356-367)**
- Remover referência a cartão de crédito/operadora (já que AbacatePay foca em PIX)
- Manter opção de devolução via PIX como principal

**4. Seção 17 - Contato (linhas 492-515)**
- Adicionar CNPJ (64.797.431/0001-03) na seção de contato também

**5. Header (linhas 61-64)**
- Atualizar data do contrato para março de 2026
- Adicionar CNPJ no cabeçalho

### Arquivos modificados
- `src/pages/TermsPage.tsx`


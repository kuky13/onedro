

# Plano: Integrar templates customizáveis na geração real de PDFs

## Situação atual
- A página `/service-orders/pdf` já existe com editor de templates e placeholders
- Os templates são salvos no banco (`os_pdf_templates`)
- **Porém**: o gerador de PDF (`serviceOrderPdfUtils.ts`) e o de etiquetas (`PrintLabelDialog.tsx`) são 100% hardcoded — ignoram completamente os templates salvos

O objetivo é fazer os templates salvos **realmente controlarem** o que aparece nos PDFs gerados.

---

## Abordagem: Template estruturado por seções

Texto puro não é suficiente para controlar um PDF visual com logo, cores, colunas e QR codes. A solução é usar um **formato de seções** no template, onde cada bloco do PDF é uma seção configurável:

```text
[CABECALHO]
{logo} {nome_empresa}
{telefone} • {email} • {cnpj}
{endereco}

[BADGE_OS]
OS #{num_os} - {data_entrada}

[STATUS]
Status: {status} | Prioridade: {prioridade} | Pagamento: {status_pagamento}

[SECAO: DADOS DO CLIENTE]
Nome: {nome_cliente}
Telefone: {telefone_cliente}
Endereço: {endereco_cliente}

[SECAO: DADOS DO EQUIPAMENTO]
Equipamento: {modelo_dispositivo}
Tipo: {tipo_dispositivo}
IMEI/Serial: {imei_serial}

[SECAO: PROBLEMA RELATADO]
{defeito}

[SECAO: VALORES]
Mão de Obra: {custo_mao_obra}
Peças: {custo_pecas}
TOTAL: {valor_total}

[SECAO: DATAS]
Entrada: {data_entrada}
Previsão: {data_previsao}
Saída: {data_saida}
Entrega: {data_entrega}

[SECAO: OBSERVAÇÕES]
{observacoes}
Técnico: {obs_tecnico}
Cliente: {obs_cliente}

[GARANTIA]
Garantia: {garantia_meses} meses
{termos_cancelamento}
{lembretes_garantia}

[ASSINATURAS]
```

O usuário pode **remover seções**, **reordenar**, **editar textos** livremente. O renderizador interpreta cada `[SECAO: ...]` como um bloco visual com a barra de acento lateral.

---

## Implementação (4 etapas)

### 1. Template padrão pré-preenchido
- Ao criar novo template de OS, o editor já vem preenchido com o template padrão completo (todas as seções acima)
- Ao criar novo template de etiqueta, vem com o layout padrão da etiqueta
- Inserir templates padrão globais via SQL migration

### 2. Atualizar o editor (`OsPdfTemplateEditor`)
- Adicionar novos placeholders: `{logo}`, `{custo_mao_obra}`, `{custo_pecas}`, `{prioridade}`, `{obs_tecnico}`, `{obs_cliente}`, `{endereco_cliente}`, `{tipo_dispositivo}`
- Adicionar botões para inserir blocos `[SECAO: nome]`, `[CABECALHO]`, `[ASSINATURAS]`, `[GARANTIA]`
- Melhorar preview: renderizar seções com estilo visual (barras coloridas, backgrounds) simulando o PDF real

### 3. Renderizador de template no `serviceOrderPdfUtils.ts`
- Criar função `generatePdfFromTemplate(template: string, orderData, companyData)`:
  - Parsear o template em blocos por `[TAG]` ou `[SECAO: nome]`
  - Para cada bloco, substituir placeholders pelos dados reais
  - Renderizar no jsPDF usando os mesmos helpers visuais existentes (drawSectionTitle, drawField, etc.)
  - `{logo}` → carrega e insere imagem da empresa
  - Linhas em branco após substituição (campo vazio) são omitidas automaticamente
- Atualizar `generateServiceOrderPDF` para: buscar template padrão do usuário → se existir, usar `generatePdfFromTemplate`; senão, usar layout hardcoded atual (fallback)

### 4. Integrar na chamada de geração
- `ServiceOrdersPageSimple.tsx` → `handleGeneratePDF`: buscar o template padrão do usuário (via `useDefaultOsPdfTemplate`) e passar para `saveServiceOrderPDF`
- `PrintLabelDialog.tsx` → `handleDownloadPDF`: buscar template de etiqueta e renderizar com placeholders substituídos
- A assinatura de `saveServiceOrderPDF` passa a aceitar `templateContent?: string` opcional

---

## Detalhes técnicos

**Parser de seções:**
```typescript
// "[SECAO: DADOS DO CLIENTE]\nNome: {nome_cliente}\n..." 
// → { type: 'section', title: 'DADOS DO CLIENTE', lines: ['Nome: João', ...] }
// "[CABECALHO]" → { type: 'header' }
// "[ASSINATURAS]" → { type: 'signatures' }
```

**Blocos especiais** (renderização própria):
- `[CABECALHO]` → logo + nome empresa + contato (layout visual do header)
- `[BADGE_OS]` → pill/badge teal com número da OS
- `[STATUS]` → pills coloridas (status, prioridade, pagamento)
- `[GARANTIA]` → segunda página com termos
- `[ASSINATURAS]` → linhas de assinatura técnico/cliente

**Blocos genéricos** `[SECAO: titulo]`:
- Renderiza barra lateral de acento + título
- Cada linha vira um campo key:value (se tem `:`) ou texto livre

**Fallback**: se o template não tiver `[CABECALHO]`, usa layout padrão. Se não tiver `[GARANTIA]`, não gera segunda página.


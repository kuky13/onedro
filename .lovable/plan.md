

# Plano: Página de Configuração de PDFs para Ordens de Serviço (`/service-orders/pdf`)

## Objetivo
Criar uma página dedicada em `/service-orders/pdf` onde o usuário pode personalizar **dois tipos de PDF** usando templates com chaves `{placeholder}`:
1. **PDF da Ordem de Serviço (A4)** — o recibo completo gerado por `serviceOrderPdfUtils.ts`
2. **Etiqueta Térmica (58mm/80mm)** — a etiqueta gerada por `PrintLabelDialog.tsx`

Inclui preview ao vivo do resultado final com dados de exemplo.

---

## Arquitetura

O projeto já possui um sistema idêntico para o módulo Worm (orçamentos):
- `pdf_templates` table no Supabase
- `usePdfTemplates` hook (CRUD)
- `PdfTemplateEditor` com placeholders clicáveis e preview

A nova página seguirá o mesmo padrão, mas com **dois editores separados por abas** (OS PDF + Etiqueta Térmica), cada um com suas próprias chaves e preview visual.

```text
/service-orders/pdf
┌─────────────────────────────────────────┐
│  ← Voltar    Configuração de PDFs       │
├─────────────────────────────────────────┤
│  [Tab: PDF da OS]  [Tab: Etiqueta]      │
├─────────────────────────────────────────┤
│  Lista de templates do tipo selecionado │
│  [+ Novo Template]                      │
│                                         │
│  ┌─ Template Card ───────────────────┐  │
│  │ Nome: "Recibo Padrão"  ★ Padrão  │  │
│  │ Preview truncado do conteúdo...   │  │
│  │ [Editar] [Excluir]               │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘

Editor (Sheet lateral):
┌──────────────────┬──────────────────────┐
│ Nome do Template │                      │
│ [Chaves clicáveis]                      │
│                  │                      │
│  Textarea com    │  Preview ao vivo     │
│  template texto  │  (simula PDF real    │
│  usando {chaves} │   com dados exemplo) │
│                  │                      │
└──────────────────┴──────────────────────┘
```

---

## Implementação (5 etapas)

### 1. Nova tabela `os_pdf_templates` no Supabase
- Campos: `id`, `user_id`, `template_name`, `template_type` (`os_receipt` | `thermal_label`), `template_content`, `is_default`, `created_at`, `updated_at`
- RLS: usuário vê só seus templates + templates globais (`user_id IS NULL`)
- Trigger: ao setar `is_default = true`, desmarcar os demais do mesmo tipo/usuário

### 2. Hook `useOsPdfTemplates`
- CRUD completo seguindo o padrão de `usePdfTemplates.ts`
- Filtro por `template_type`
- `useDefaultOsPdfTemplate(userId, type)` para buscar o template ativo

### 3. Componente `OsPdfTemplateEditor`
Dois modos baseados no `template_type`:

**Modo OS Receipt** — Chaves disponíveis:
- Empresa: `{nome_empresa}`, `{telefone}`, `{email}`, `{endereco}`, `{cnpj}`
- OS: `{num_os}`, `{status}`, `{prioridade}`, `{data_entrada}`, `{data_saida}`, `{data_previsao}`, `{data_entrega}`
- Cliente: `{nome_cliente}`, `{telefone_cliente}`, `{endereco_cliente}`
- Equipamento: `{modelo_dispositivo}`, `{tipo_dispositivo}`, `{imei_serial}`
- Serviço: `{problema_relatado}`, `{observacoes}`, `{obs_tecnico}`, `{obs_cliente}`
- Valores: `{valor_total}`, `{custo_mao_obra}`, `{custo_pecas}`, `{status_pagamento}`
- Garantia: `{garantia_meses}`, `{termos_cancelamento}`, `{lembretes_garantia}`

**Modo Etiqueta Térmica** — Chaves disponíveis:
- `{nome_empresa}`, `{telefone}`, `{num_os}`, `{data_entrada}`
- `{nome_cliente}`, `{modelo_dispositivo}`, `{defeito}`
- `{qr_code}` (renderizado automaticamente)

Preview ao vivo com dados fictícios (igual ao `PdfTemplateEditor` atual).

### 4. Página `ServiceOrderPdfConfigPage`
- Rota: `/service-orders/pdf`
- Tabs com Radix UI para alternar entre OS Receipt e Etiqueta Térmica
- Lista de templates, botão criar, sheet lateral com editor
- Seguir layout visual da `WormPdfConfig`

### 5. Integrar templates nos geradores existentes
- `serviceOrderPdfUtils.ts`: aceitar `template_content` opcional; se presente, substituir chaves e renderizar no PDF ao invés do layout hardcoded
- `PrintLabelDialog.tsx`: carregar template padrão de etiqueta do banco; se existir, usar o conteúdo customizado para montar o `drawLabel`
- Adicionar rota no `App.tsx` dentro do guard `UnifiedProtectionGuard`
- Adicionar link de acesso na página de OS (botão "Configurar PDFs")

---

## Chaves suportadas (resumo)

| Chave | Tipo | Descrição |
|-------|------|-----------|
| `{nome_empresa}` | Ambos | Nome da loja |
| `{telefone}` | Ambos | Telefone da empresa |
| `{cnpj}` | OS | CNPJ |
| `{endereco}` | OS | Endereço da empresa |
| `{num_os}` | Ambos | Número da OS formatado |
| `{nome_cliente}` | Ambos | Nome do cliente |
| `{modelo_dispositivo}` | Ambos | Modelo do aparelho |
| `{defeito}` | Ambos | Problema relatado |
| `{valor_total}` | OS | Valor total do serviço |
| `{status}` | OS | Status traduzido |
| `{data_entrada}` | Ambos | Data de entrada |
| `{garantia_meses}` | OS | Meses de garantia |
| `{qr_code}` | Etiqueta | QR Code automático |

---

## Detalhes técnicos

- A tabela `os_pdf_templates` é separada da `pdf_templates` (Worm) para evitar conflitos de escopo
- O preview da etiqueta térmica simula visualmente as dimensões 58mm/80mm com CSS `aspect-ratio` e fonte monospace
- O preview do PDF A4 simula o layout com seções coloridas (accent bars, pills) iguais ao PDF real
- Templates padrão (globais) serão inseridos via migration SQL para ambos os tipos
- O campo `template_type` permite expansão futura (ex: nota fiscal, recibo simplificado)


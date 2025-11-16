# Sistema de Templates de Mensagem WhatsApp - Documentação Técnica

## 1. Visão Geral do Sistema Atual

### 1.1 Componentes Existentes

O sistema atual de mensagens WhatsApp no `/worm` utiliza:

- **WormQuickBudgetGenerator.tsx**: Componente principal que gera orçamentos e mensagens WhatsApp
- **generateServiceWhatsAppMessage()**: Função que formata a mensagem com base nos dados do orçamento
- **useWhatsAppTemplates**: Hook que gerencia templates personalizados
- **whatsapp_message_templates**: Tabela no Supabase para armazenar templates

### 1.2 Fluxo Atual

1. Usuário seleciona serviços e preenche dados do cliente
2. Sistema gera orçamento automaticamente
3. Mensagem WhatsApp é criada usando template padrão
4. Usuário pode copiar ou enviar diretamente pelo WhatsApp

### 1.3 Template Atual (Padrão)

```
📱{nome_empresa}

*Aparelho:* {aparelho}
*Serviço:* {nome_reparo}

{detalhes_pecas}

*Serviços Adicionais:*
{servicos_inclusos}

*🛡️ Garantia até {garantia_meses} meses*
*🚫 Não cobre danos por água ou quedas*

📝 *OBSERVAÇÕES*
{observacoes}

*📅 Válido até: {data_validade}*
```

## 2. Análise dos Componentes Existentes

### 2.1 WormQuickBudgetGenerator.tsx

**Localização**: `src/components/worm/WormQuickBudgetGenerator.tsx`

**Funções principais**:
- Gerencia estado do cliente selecionado
- Controla opções de serviço selecionadas
- Gera mensagem WhatsApp após criação do orçamento
- Exibe preview da mensagem

**Problemas identificados**:
- Não permite seleção de template personalizado
- Usa apenas template padrão hardcoded
- Não tem interface para gerenciar templates

### 2.2 useWhatsAppTemplates Hook

**Localização**: `src/hooks/worm/useWhatsAppMessageTemplates.ts`

**Funcionalidades**:
- Busca templates do usuário
- Cria novos templates
- Define template padrão
- Gerencia estado de templates

**Estado atual**: Funcional mas subutilizado

### 2.3 generateWhatsAppMessageFromTemplate

**Localização**: `src/utils/whatsappTemplateUtils.ts`

**Capacidades**:
- Processa templates com variáveis dinâmicas
- Suporta substituição de placeholders
- Formata valores monetários
- Gerencia múltiplas peças e serviços

## 3. Proposta de Arquitetura

### 3.1 Objetivos

1. **Manter template atual como padrão**
2. **Adicionar interface para seleção de templates**
3. **Permitir criação e edição de templates**
4. **Integrar com sistema existente sem quebrar funcionalidade**

### 3.2 Estrutura de Dados

```typescript
interface WhatsAppTemplate {
  id: string;
  user_id: string;
  template_name: string;
  message_template: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  category?: 'budget' | 'service' | 'custom';
  description?: string;
}

interface TemplateVariable {
  name: string;
  description: string;
  example: string;
  required: boolean;
}
```

### 3.3 Variáveis Disponíveis

| Variável | Descrição | Exemplo | Obrigatório |
|----------|-----------|---------|-------------|
| `{nome_empresa}` | Nome da empresa | Assistência Tech | Sim |
| `{cliente}` | Nome do cliente | João Silva | Não |
| `{aparelho}` | Modelo do aparelho | iPhone 12 Pro | Sim |
| `{nome_reparo}` | Nome do serviço/reparo | Troca de Tela | Sim |
| `{preco_vista}` | Preço à vista | R$ 299,00 | Sim |
| `{preco_parcelado}` | Preço parcelado | R$ 349,00 | Não |
| `{parcelas}` | Número de parcelas | 4x | Não |
| `{valor_parcela}` | Valor da parcela | R$ 87,25 | Não |
| `{garantia_meses}` | Meses de garantia | 3 meses | Sim |
| `{servicos_inclusos}` | Serviços adicionais | • Película grátis | Não |
| `{observacoes}` | Observações do orçamento | Entrega em 2 dias | Não |
| `{data_validade}` | Data de validade | 15/12/2024 | Sim |
| `{detalhes_pecas}` | Detalhes das peças | *Tela Original*... | Não |

## 4. Componentes UI Necessários

### 4.1 TemplateSelector Component

**Localização**: `src/components/worm/WormTemplateSelector.tsx`

**Funcionalidades**:
- Dropdown para seleção de templates
- Preview do template selecionado
- Indicador de template padrão
- Botão para gerenciar templates

```typescript
interface TemplateSelectorProps {
  selectedTemplateId: string | null;
  onTemplateSelect: (templateId: string) => void;
  templates: WhatsAppTemplate[];
  disabled?: boolean;
}
```

### 4.2 TemplateManager Modal

**Localização**: `src/components/worm/WormTemplateManager.tsx`

**Funcionalidades**:
- Listar todos os templates
- Criar novo template
- Editar template existente
- Definir template padrão
- Excluir templates customizados
- Preview com dados de exemplo

### 4.3 TemplateEditor Component

**Localização**: `src/components/worm/WormTemplateEditor.tsx`

**Funcionalidades**:
- Editor de texto com syntax highlighting para variáveis
- Inserção rápida de variáveis
- Validação de template
- Preview em tempo real
- Contador de caracteres

## 5. Fluxo de Usuário

### 5.1 Selecionar Template Existente

1. Usuário abre gerador de orçamento
2. Sistema carrega templates disponíveis
3. Usuário seleciona template no dropdown
4. Sistema preview mensagem com dados do orçamento
5. Usuário confirma e gera mensagem

### 5.2 Criar Novo Template

1. Usuário clica em "Gerenciar Templates"
2. Sistema abre modal de gerenciamento
3. Usuário clica em "Novo Template"
4. Sistema abre editor de template
5. Usuário define nome e conteúdo
6. Usuário testa com preview
7. Usuário salva template
8. Template aparece na lista de seleção

### 5.3 Editar Template Existente

1. Usuário abre gerenciador de templates
2. Seleciona template para editar
3. Faz alterações no editor
4. Preview mostra mudanças
5. Salva alterações
6. Template atualizado na lista

## 6. Integração com Sistema Existente

### 6.1 Modificações em WormQuickBudgetGenerator

**Adições necessárias**:

```typescript
// Novos imports
import { useWhatsAppTemplates } from '@/hooks/worm/useWhatsAppMessageTemplates';
import { WormTemplateSelector } from './WormTemplateSelector';
import { generateWhatsAppMessageFromTemplate } from '@/utils/whatsappTemplateUtils';

// Novos estados
const [selectedTemplateId, setSelectedTemplateId] = useState<string>('default');
const { data: templates } = useWhatsAppTemplates(user?.id);

// Modificar handleGenerate
const handleGenerate = () => {
  // ... validações existentes ...
  
  generateBudget({
    templateIds,
    clientId: selectedClientId,
    clientData: { name: clientName, phone: clientPhone },
    notes,
    validUntil
  }, {
    onSuccess: (data) => {
      const companyData = getCompanyDataForPDF();
      const companyName = companyData.shop_name || 'Nossa Loja';
      
      // Usar template selecionado
      const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);
      const message = selectedTemplate 
        ? generateWhatsAppMessageFromTemplate(selectedTemplate.message_template, data, companyName, profile?.budget_warning_days)
        : generateServiceWhatsAppMessage(data, companyName);
      
      setGeneratedMessage(message);
      toast.success('Orçamento gerado com sucesso!');
    }
  });
};
```

### 6.2 Atualização do Hook useWhatsAppTemplates

**Adições necessárias**:

```typescript
// Novas funções no hook
const useSetDefaultTemplate = () => {
  return useMutation({
    mutationFn: async ({ templateId, userId }: { templateId: string; userId: string }) => {
      // Remover default de todos os templates do usuário
      await supabase
        .from('whatsapp_message_templates')
        .update({ is_default: false })
        .eq('user_id', userId);
      
      // Definir novo template como default
      const { data, error } = await supabase
        .from('whatsapp_message_templates')
        .update({ is_default: true })
        .eq('id', templateId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast.success('Template padrão atualizado');
    }
  });
};
```

## 7. Implementação Detalhada

### 7.1 Estrutura de Arquivos

```
src/
├── components/worm/
│   ├── WormQuickBudgetGenerator.tsx (modificado)
│   ├── WormTemplateSelector.tsx (novo)
│   ├── WormTemplateManager.tsx (novo)
│   └── WormTemplateEditor.tsx (novo)
├── hooks/worm/
│   └── useWhatsAppMessageTemplates.ts (modificado)
├── utils/
│   ├── whatsappTemplateUtils.ts (modificado)
│   └── templateVariables.ts (novo)
└── types/
    └── whatsappTemplates.ts (novo)
```

### 7.2 Componente WormTemplateSelector

```typescript
export const WormTemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplateId,
  onTemplateSelect,
  templates,
  disabled
}) => {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="space-y-2">
      <Label>Template da Mensagem</Label>
      <Select
        value={selectedTemplateId}
        onValueChange={onTemplateSelect}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione um template" />
        </SelectTrigger>
        <SelectContent>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              <div className="flex items-center gap-2">
                {template.template_name}
                {template.is_default && (
                  <Badge variant="secondary" className="text-xs">Padrão</Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full"
      >
        <Settings className="h-4 w-4 mr-2" />
        Gerenciar Templates
      </Button>
      
      {open && (
        <WormTemplateManager
          open={open}
          onOpenChange={setOpen}
          templates={templates}
        />
      )}
    </div>
  );
};
```

### 7.3 Variáveis de Template

```typescript
// src/utils/templateVariables.ts
export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  {
    name: 'nome_empresa',
    description: 'Nome da empresa/loja',
    example: 'Assistência Tech',
    required: true
  },
  {
    name: 'cliente',
    description: 'Nome do cliente',
    example: 'João Silva',
    required: false
  },
  {
    name: 'aparelho',
    description: 'Modelo do aparelho',
    example: 'iPhone 12 Pro',
    required: true
  },
  // ... outras variáveis
];
```

## 8. Validações e Segurança

### 8.1 Validações de Template

- Verificar se todas as variáveis obrigatórias estão presentes
- Validar tamanho máximo da mensagem (WhatsApp limit: 4096 caracteres)
- Prevenir injeção de código malicioso
- Garantir que variáveis sejam substituídas corretamente

### 8.2 Segurança

- Templates só podem ser editados pelo proprietário
- Validar permissões antes de salvar alterações
- Sanitizar entrada do usuário
- Limitar número de templates por usuário

## 9. Testes Recomendados

### 9.1 Testes Unitários

- Testar substituição de variáveis
- Testar formatação de valores monetários
- Testar validação de templates
- Testar preview com dados de exemplo

### 9.2 Testes de Integração

- Testar fluxo completo de criação de template
- Testar seleção e uso de template
- Testar atualização de template padrão
- Testar deleção de template

## 10. Considerações de Performance

### 10.1 Otimizações

- Cache de templates no cliente
- Lazy loading do editor de templates
- Debounce na preview em tempo real
- Paginação na lista de templates

### 10.2 Limites

- Máximo 50 templates por usuário
- Máximo 20 variáveis por template
- Preview limitado a 500 caracteres
- Cache de 5 minutos para templates

## 11. Manutenção e Escalabilidade

### 11.1 Manutenção

- Logs de alterações em templates
- Versionamento de templates (opcional)
- Backup de templates importantes
- Migração de templates entre ambientes

### 11.2 Escalabilidade

- Índices no banco de dados para queries rápidas
- Particionamento por usuário
- Arquivamento de templates antigos
- Exportação/importação de templates

## 12. Próximos Passos

1. **Fase 1**: Implementar componente WormTemplateSelector
2. **Fase 2**: Criar modal de gerenciamento de templates
3. **Fase 3**: Desenvolver editor de templates com preview
4. **Fase 4**: Integrar com WormQuickBudgetGenerator
5. **Fase 5**: Adicionar validações e testes
6. **Fase 6**: Documentar para usuários finais

## 13. Conclusão

Esta implementação permitirá que os usuários personalizem completamente as mensagens WhatsApp enviadas aos clientes, mantendo a simplicidade e eficiência do sistema atual. O template padrão será preservado, garantindo que usuários existentes não sejam afetados, enquanto novos recursos são adicionados de forma incremental e opcional.
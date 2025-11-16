## 1. Visão Geral do Produto

Sistema de personalização de templates de mensagem WhatsApp para a seção `/worm` do sistema de orçamentos. O sistema permitirá que usuários criem, editem e selecionem templates personalizados para as mensagens enviadas aos clientes via WhatsApp, mantendo o template atual como padrão.

**Problema a resolver**: Usuários precisam personalizar mensagens WhatsApp para diferentes tipos de serviços ou clientes, mas atualmente só podem usar o template padrão fixo.

**Valor do produto**: Aumenta a flexibilidade e profissionalismo das comunicações, permitindo mensagens mais segmentadas e personalizadas para diferentes contextos de negócio.

## 2. Recursos Principais

### 2.1 Gerenciamento de Templates

**Recurso: Criar novo template**
- Interface intuitiva para criar templates com variáveis dinâmicas
- Preview em tempo real com dados de exemplo
- Validação de variáveis obrigatórias
- Limite de 50 templates por usuário

**Recurso: Editar template existente**
- Editor com syntax highlighting para variáveis
- Botões de atalho para inserir variáveis
- Histórico de alterações (opcional)
- Proteção contra exclusão acidental

**Recurso: Definir template padrão**
- Botão "Definir como padrão" em cada template
- Indicador visual do template atualmente padrão
- Confirmação antes de mudar o padrão
- Template padrão usado automaticamente em novos orçamentos

### 2.2 Seleção de Templates

**Recurso: Dropdown de seleção**
- Localizado no WormQuickBudgetGenerator
- Mostra nome do template e indicador "Padrão"
- Ordenado por: padrão primeiro, depois alfabeticamente
- Pesquisa rápida (opcional para muitos templates)

**Recurso: Preview antes de gerar**
- Mostra preview da mensagem com dados do orçamento atual
- Atualização em tempo real ao mudar template
- Indica variáveis que não serão preenchidas

### 2.3 Template Padrão (Atual)

**Recurso: Manter compatibilidade**
- Template atual continua funcionando como antes
- Usado automaticamente se nenhum template personalizado for selecionado
- Não requer nenhuma ação do usuário existente
- Preserva toda funcionalidade atual

## 3. Páginas e Módulos

### 3.1 Modal de Gerenciamento de Templates

**Localização**: Modal acionado pelo botão "Gerenciar Templates"

**Módulos**:
- **Header**: Título "Templates de Mensagem WhatsApp" + botão "Novo Template"
- **Lista de Templates**: Cards com nome, preview, botões de ação
- **Ações por Template**: Editar, Definir como Padrão, Excluir (se customizado)
- **Estado Vazio**: Mensagem quando não há templates personalizados

### 3.2 Editor de Template

**Localização**: Modal ou drawer para criar/editar

**Módulos**:
- **Nome do Template**: Input para identificação
- **Editor de Texto**: Área principal com syntax highlighting
- **Variáveis Rápidas**: Botões para inserir variáveis com um clique
- **Preview**: Lado a lado com o editor
- **Validação**: Indicadores de variáveis obrigatórias faltantes
- **Ações**: Salvar, Cancelar, Testar

### 3.3 Seletor de Template (WormQuickBudgetGenerator)

**Localização**: Dentro do formulário de geração de orçamento

**Módulos**:
- **Label**: "Template da Mensagem"
- **Dropdown**: Lista de templates disponíveis
- **Botão Gerenciar**: Link para abrir modal de gerenciamento
- **Preview**: Área opcional para ver mensagem antes de gerar

## 4. Fluxos de Usuário

### 4.1 Usuário Novo (Primeiro Acesso)

1. Usuário abre gerador de orçamento
2. Sistema mostra template padrão selecionado automaticamente
3. Usuário vê botão "Gerenciar Templates" mas não é obrigado a usar
4. Toda experiência continua igual ao atual
5. Usuário pode descobrir recurso quando quiser

### 4.2 Criar Primeiro Template Personalizado

1. Usuário clica "Gerenciar Templates"
2. Sistema abre modal com estado vazio
3. Usuário clica "Novo Template"
4. Sistema abre editor com template padrão pré-preenchido
5. Usuário modifica e salva
6. Template aparece no dropdown automaticamente
7. Sistema seleciona novo template para uso imediato

### 4.3 Usar Template Existente

1. Usuário abre gerador de orçamento
2. Abre dropdown de templates
3. Seleciona template desejado
4. Sistema mostra preview (se ativado)
5. Usuário preenche dados do orçamento
6. Gera mensagem com template selecionado
7. Envia ou copia mensagem normalmente

### 4.4 Editar Template

1. Usuário clica "Gerenciar Templates"
2. Localiza template na lista
3. Clica botão "Editar"
4. Faz alterações no editor
5. Visualiza preview com dados de exemplo
6. Salva alterações
7. Template atualizado imediatamente em todos os lugares

## 5. Design e Interface

### 5.1 Estilo Visual

**Cores**:
- Primária: Esquema atual do sistema (azul/primário)
- Sucesso: Verde para indicar template padrão
- Atenção: Amarelo para templates não salvos
- Neutro: Cinzas para interface secundária

**Componentes**:
- Cards com sombra suave para lista de templates
- Badges "Padrão" em verde para template ativo
- Botões com ícones consistentes (lápis para editar, lixeira para excluir)
- Dropdown com preview ao hover (opcional)

### 5.2 Interações

**Feedback Visual**:
- Loading states durante carregamento
- Toast notifications para ações (salvar, excluir, definir padrão)
- Confirmações modais para ações destrutivas
- Animações suaves em transições

**Acessibilidade**:
- Labels claros para todos os campos
- Atalhos de teclado no editor
- Contraste adequado para leitura
- Navegação por tabulação completa

## 6. Requisitos Técnicos

### 6.1 Performance

- Carregamento de templates < 500ms
- Preview em tempo real < 200ms de delay
- Salvar template < 1s
- Limite de 50 templates por usuário
- Cache local para templates frequentes

### 6.2 Segurança

- Validação de entrada contra XSS
- Sanitização de templates antes de salvar
- Permissões verificadas em todas as operações
- Rate limiting para criar/editar templates
- Logs de auditoria para mudanças

### 6.3 Compatibilidade

- Manter retrocompatibilidade total
- Funcionar offline com cache (opcional)
- Suportar todos os navegadores modernos
- Mobile responsive para uso em tablets
- Degradar graciosamente se APIs falharem

## 7. Métricas de Sucesso

### 7.1 Adoção

- % de usuários que criam pelo menos 1 template personalizado
- Número médio de templates por usuário ativo
- Taxa de uso de templates personalizados vs padrão
- Tempo médio para criar primeiro template

### 7.2 Satisfação

- NPS do recurso entre usuários beta
- Taxa de retenção de templates (não excluem após criar)
- Feedback qualitativo sobre facilidade de uso
- Redução de solicitações de suporte sobre personalização

### 7.3 Performance

- Tempo médio de carregamento de templates
- Taxa de erro em operações CRUD
- Uso de cache e redução de chamadas API
- Performance em dispositivos móveis

## 8. Cronograma e Priorização

### 8.1 MVP (2 semanas)

- [ ] Componente WormTemplateSelector
- [ ] Modal de gerenciamento básico
- [ ] Editor simples com preview
- [ ] Integração com WormQuickBudgetGenerator
- [ ] Manter template padrão funcionando

### 8.2 Melhorias (1 semana adicional)

- [ ] Pesquisa em lista de templates
- [ ] Preview com dados reais do orçamento
- [ ] Validação avançada de templates
- [ ] Importar/exportar templates
- [ ] Templates pré-definidos por categoria

### 8.3 Features Avançadas (futuro)

- [ ] Versionamento de templates
- [ ] Compartilhar templates entre usuários
- [ ] Templates condicionais baseados em regras
- [ ] Analytics de uso de templates
- [ ] A/B testing de templates

## 9. Riscos e Mitigações

### 9.1 Riscos Técnicos

**Risco**: Quebrar funcionalidade existente
- **Mitigação**: Testes extensivos e rollback planejado

**Risco**: Performance degradar com muitos templates
- **Mitigação**: Paginação, cache e limites impostos

**Risco**: Dados de templates corrompidos
- **Mitigação**: Backup automático e validação estrita

### 9.2 Riscos de UX

**Risco**: Usuários acham complexo demais
- **Mitigação**: Design minimalista e descoberta gradual

**Risco**: Template padrão não é mais usado
- **Mitigação**: Manter sempre visível e fácil de selecionar

**Risco**: Templates criados mas não utilizados
- **Mitigação**: Tutoriais e exemplos de uso efetivo

## 10. Conclusão

Este sistema de templates de mensagem WhatsApp transformará a forma como usuários interagem com clientes no `/worm`, proporcionando:

- **Flexibilidade**: Mensagens personalizadas para diferentes contextos
- **Eficiência**: Templates reutilizáveis economizam tempo
- **Profissionalismo**: Comunicações mais alinhadas com marca
- **Escalabilidade**: Sistema preparado para crescimento futuro

O foco em manter simplicidade e compatibilidade garante que usuários existentes não sejam impactados, enquanto novos recursos agregam valor significativo para usuários avançados.
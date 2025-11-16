# Sistema de Configuração de Marca

Este diretório contém componentes administrativos para gerenciar facilmente a marca da aplicação.

## 🎯 Como Alterar o Nome da Aplicação

### Método 1: Interface Administrativa (Recomendado)

1. **Acesse o Gerenciador de Marca:**
   - Navegue para `/brand-config` ou use o componente `BrandConfigManager`

2. **Altere as Configurações:**
   - Modifique o nome da aplicação e outras informações
   - Veja o preview em tempo real
   - Baixe o novo arquivo de configuração

3. **Aplique as Mudanças:**
   - Substitua o arquivo `src/config/app.ts` pelo arquivo baixado
   - Recarregue a aplicação

### Método 2: Edição Direta

1. **Edite o arquivo de configuração:**
   ```typescript
   // src/config/app.ts
   export const APP_CONFIG = {
     name: 'SeuNovoNome',
     fullName: 'SeuNovoNome - Sistema de Orçamentos',
     // ... outras configurações
   };
   ```

2. **Recarregue a aplicação**

## 🔄 O que é Atualizado Automaticamente

Quando você altera a configuração, **TODOS** esses elementos são atualizados automaticamente:

### Interface do Usuário
- ✅ Headers e navegação
- ✅ Títulos de páginas
- ✅ Textos de marketing
- ✅ Prompts de instalação PWA
- ✅ Mensagens e notificações

### Configurações Técnicas
- ✅ Metadados HTML (parcialmente - requer rebuild)
- ✅ Configurações PWA (parcialmente - requer rebuild)
- ✅ Chaves de localStorage
- ✅ Nomes de arquivos de backup

### Banco de Dados
- ✅ Dados padrão em migrações (requer nova migração)
- ✅ Títulos de seções
- ✅ Textos de exemplo

## 📁 Arquivos Envolvidos

### Configuração Central
- `src/config/app.ts` - **Arquivo principal** (altere apenas este!)
- `src/hooks/useAppConfig.ts` - Hooks para acessar configuração

### Componentes que Usam Configuração
- `src/components/adaptive/TabletHeaderNav.tsx`
- `src/components/PWAInstallPrompt.tsx`
- `src/plans/components/PlansHero.tsx`
- `src/pages/Index.tsx`
- `src/pages/ResetPasswordPage.tsx`
- `src/pages/PurchaseSuccessPage.tsx`
- E muitos outros...

### Arquivos que Precisam de Rebuild
- `index.html` - Meta tags
- `public/manifest.json` - PWA
- `capacitor.config.ts` - App mobile

## 🛠️ Componentes Administrativos

### `BrandConfigManager`
Interface completa para gerenciar todas as configurações de marca.

**Recursos:**
- Editor visual de configurações
- Preview em tempo real
- Download do arquivo de configuração
- Validação de campos obrigatórios
- Sugestões automáticas



## 🎨 Personalização Avançada

### Adicionando Novos Campos

1. **Adicione no arquivo de configuração:**
   ```typescript
   // src/config/app.ts
   export const APP_CONFIG = {
     // ... configurações existentes
     newField: 'Novo Valor'
   };
   ```

2. **Adicione no hook:**
   ```typescript
   // src/hooks/useAppConfig.ts
   export const useNewField = () => {
     return APP_CONFIG.newField;
   };
   ```

3. **Use nos componentes:**
   ```tsx
   import { useNewField } from '@/hooks/useAppConfig';
   
   const MyComponent = () => {
     const newField = useNewField();
     return <div>{newField}</div>;
   };
   ```

### Criando Temas de Marca

Você pode criar diferentes configurações para diferentes marcas:

```typescript
// src/config/brands/brand1.ts
export const BRAND1_CONFIG = {
  name: 'Marca1',
  // ... configurações específicas
};

// src/config/brands/brand2.ts  
export const BRAND2_CONFIG = {
  name: 'Marca2',
  // ... configurações específicas
};
```

## 🚀 Benefícios do Sistema

1. **Centralizado:** Uma única fonte de verdade
2. **Automático:** Mudanças se propagam automaticamente
3. **Tipado:** IntelliSense completo com TypeScript
4. **Testável:** Componentes de validação incluídos
5. **Flexível:** Fácil de estender e personalizar
6. **Manutenível:** Mudanças futuras são simples

## 📋 Checklist para Mudança de Marca

- [ ] Alterar configuração em `src/config/app.ts`
- [ ] Testar com `ConfigValidationTest`
- [ ] Verificar interface do usuário
- [ ] Atualizar `index.html` se necessário
- [ ] Atualizar `public/manifest.json` se necessário
- [ ] Testar PWA e compartilhamento
- [ ] Verificar emails e contatos
- [ ] Testar em diferentes dispositivos

## 🆘 Solução de Problemas

### Mudanças não aparecem
- Recarregue a página (Ctrl+F5)
- Verifique se o arquivo `app.ts` foi salvo
- Verifique o console para erros

### Alguns textos não mudaram
- Verifique se o componente está usando o hook correto
- Alguns textos podem estar hardcoded (procure por "Oliver" no código)

### PWA não atualiza
- Limpe o cache do navegador
- Atualize o arquivo `manifest.json`
- Reinstale o PWA

## 📞 Suporte

Se precisar de ajuda, verifique:
1. Este README
2. Comentários no código
3. Componente de validação
4. Console do navegador para erros
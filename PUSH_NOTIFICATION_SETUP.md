# 🔔 Guia de Configuração - Push Notifications OneDrip

## ✅ Status Atual da Implementação

### 🎉 Já Implementado
- ✅ Database migrations (tabelas `user_push_subscriptions`, `push_notifications`, `push_notification_logs`)
- ✅ RPC function `get_push_notification_stats()` para estatísticas
- ✅ Edge Function `send-push-notification` configurada
- ✅ Service Worker atualizado com suporte a push
- ✅ Hook `usePushNotifications` para frontend
- ✅ Hook `usePushAdmin` para painel administrativo
- ✅ Componente `NotificationSettings` para usuários
- ✅ Componente `PushNotificationPanel` para admins
- ✅ Script de geração de chaves VAPID

---

## 🚀 Próximos Passos (Execute nesta ordem)

### **Etapa 1: Gerar Chaves VAPID**

Execute o script de geração no terminal:

```bash
npm run generate-vapid
```

Ou diretamente:

```bash
node scripts/generate-vapid-keys.js
```

**Resultado esperado:**
```
🔑 Generating VAPID keys for push notifications...

✅ VAPID keys generated successfully!

📋 Copy these keys to your .env file:

VITE_VAPID_PUBLIC_KEY=BHx...abc (87 caracteres)
VAPID_PRIVATE_KEY=xyz...123 (43 caracteres)  
VAPID_EMAIL=mailto:your-email@example.com
```

**⚠️ IMPORTANTE:** 
- Copie essas 3 chaves e guarde em local seguro!
- Você precisará delas no próximo passo

---

### **Etapa 2: Adicionar Secrets no Supabase**

#### 2.1 Via Interface da Lovable (RECOMENDADO)

Você já viu o modal "Add Secrets" que apareceu. Preencha os 3 campos:

1. **VAPID_PUBLIC_KEY**: Cole a chave pública gerada (começa com "B", ~87 caracteres)
2. **VAPID_PRIVATE_KEY**: Cole a chave privada gerada (~43 caracteres)
3. **VAPID_SUBJECT**: Digite: `mailto:admin@onedrip.com`

Clique em **Submit**.

#### 2.2 Alternativa: Via Dashboard do Supabase

Se preferir adicionar manualmente:

1. Acesse: https://supabase.com/dashboard/project/oghjlypdnmqecaavekyr/settings/functions
2. Vá em **Edge Functions** → **Environment Variables**
3. Adicione as 3 variáveis:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT`

---

### **Etapa 3: Atualizar Variável de Ambiente Frontend**

Adicione a chave pública ao arquivo `.env`:

```bash
VITE_VAPID_PUBLIC_KEY=<sua-chave-publica-aqui>
```

**⚠️ Apenas a chave PÚBLICA vai no frontend!**

---

### **Etapa 4: Deploy da Edge Function**

A edge function já está configurada em `supabase/config.toml` e será deployada automaticamente no próximo build.

Para deploy manual (se necessário):
```bash
supabase functions deploy send-push-notification
```

---

### **Etapa 5: Aplicar Migration SQL**

A migration já foi criada em:
```
supabase/migrations/20241231000001_create_push_notification_stats_function.sql
```

Ela será aplicada automaticamente. Para aplicar manualmente:
```bash
supabase db push
```

---

### **Etapa 6: Restart do Service Worker**

Após adicionar as variáveis de ambiente:

1. Abra o DevTools (F12)
2. Vá em **Application** → **Service Workers**
3. Clique em **Unregister** no service worker atual
4. Recarregue a página (F5)
5. O novo service worker será registrado com as chaves VAPID corretas

---

## 📱 Testando o Sistema

### **Teste 1: Usuário - Habilitar Notificações**

1. Faça login como **usuário comum**
2. Vá em **Configurações** (`/settings`)
3. Clique na aba **Notificações**
4. Habilite o switch "Receber notificações push"
5. Clique em "Permitir" quando o navegador solicitar permissão
6. Clique no botão "Testar" para enviar uma notificação de teste
7. Você deve receber uma notificação push! 🎉

### **Teste 2: Admin - Enviar Notificação**

1. Faça login como **admin** ou **super_admin**
2. Vá em **Super Admin** → **Notifications** (`/supadmin/notifications`)
3. Preencha o formulário:
   - **Título**: "Teste de Notificação"
   - **Mensagem**: "Esta é uma notificação de teste!"
   - **Destinatário**: Selecione "Enviar para mim mesmo"
4. Clique em "Enviar Notificação"
5. Você deve receber a notificação! 🎊

### **Teste 3: Verificar Estatísticas**

No painel admin em `/supadmin/notifications`, verifique:
- ✅ **Total Enviadas**: Deve aparecer o número de notificações enviadas
- ✅ **Taxa de Entrega**: Deve mostrar a porcentagem de sucesso
- ✅ **Histórico**: Deve listar as notificações enviadas recentemente

---

## 🐛 Troubleshooting

### **Problema: "VAPID keys not configured"**

**Solução:**
- Verifique se adicionou os 3 secrets no Supabase Edge Functions
- Confirme que deployou a edge function após adicionar os secrets
- Restart do service worker (veja Etapa 6 acima)

### **Problema: "NotificationPermission denied"**

**Solução:**
- Usuário bloqueou as notificações no navegador
- Instruções para desbloquear:
  - **Chrome**: Settings → Privacy and security → Site Settings → Notifications
  - **Firefox**: Address bar → Lock icon → Permissions → Notifications
  - **Safari**: Safari → Settings → Websites → Notifications

### **Problema: Notificação não aparece**

**Checklist:**
1. ✅ Service Worker está registrado? (DevTools → Application)
2. ✅ Permissão foi concedida? (Deve estar "granted")
3. ✅ Subscription está ativa no banco? (Verificar tabela `user_push_subscriptions`)
4. ✅ VAPID keys estão corretas? (Verificar logs da edge function)

### **Problema: Erro 401 "Unauthorized" na Edge Function**

**Solução:**
- Verifique se o usuário está autenticado
- Confirme que o token JWT está sendo enviado no header
- Verifique se o usuário tem role `admin` ou `super_admin`

---

## 📊 Monitoramento e Logs

### **Logs da Edge Function**

Para ver os logs em tempo real:

1. Via Lovable: Use a ferramenta de logs do Supabase
2. Via Dashboard: https://supabase.com/dashboard/project/oghjlypdnmqecaavekyr/logs/edge-functions

**Buscar por:**
- `🔐 VAPID configuration check` - Verifica se as chaves estão carregadas
- `📤 Sending push to:` - Mostra quando está enviando para um endpoint
- `✅ Push response: 201` - Sucesso no envio
- `❌ Push error` - Erros no envio

### **Logs do Service Worker**

No navegador:
1. Abra DevTools (F12)
2. Vá em **Console**
3. Filtre por `[SW]` para ver logs do Service Worker

**Buscar por:**
- `🔔 [SW] Push message received` - Notificação recebida
- `📭 [SW] Showing notification` - Notificação sendo exibida
- `❌ [SW] Error` - Erros do service worker

---

## 🔐 Segurança

### **Chaves VAPID**

- ✅ **Chave Privada**: NUNCA exponha no frontend ou commit no Git
- ✅ **Chave Pública**: Pode ser exposta no frontend (é esperado)
- ✅ **Consistência**: Use as MESMAS chaves em todos os ambientes

### **RLS Policies**

Já implementadas:
- ✅ Usuários só veem suas próprias subscriptions
- ✅ Apenas admins podem enviar notificações
- ✅ Apenas admins podem ver estatísticas e logs

---

## 🎯 Funcionalidades Disponíveis

### **Para Usuários**
- ✅ Habilitar/desabilitar notificações push
- ✅ Gerenciar dispositivos registrados
- ✅ Testar notificações
- ✅ Ver status de permissão

### **Para Administradores**
- ✅ Enviar notificações para:
  - Todos os usuários
  - Usuários por role (admin/manager/user)
  - Usuário específico
- ✅ Ver estatísticas de entrega
- ✅ Ver histórico de notificações enviadas
- ✅ Ver logs detalhados por notificação
- ✅ Enviar notificações de teste

---

## 📚 Arquitetura

```
┌─────────────────────────────────────────┐
│           FRONTEND (React)              │
│                                         │
│  - NotificationSettings (user)          │
│  - PushNotificationPanel (admin)        │
│  - usePushNotifications hook            │
│  - usePushAdmin hook                    │
└──────────────┬──────────────────────────┘
               │
        Service Worker
               │
┌──────────────▼──────────────────────────┐
│         SUPABASE BACKEND                │
│                                         │
│  Edge Function: send-push-notification  │
│  (com VAPID authentication)             │
│                                         │
│  Database Tables:                       │
│  - user_push_subscriptions              │
│  - push_notifications                   │
│  - push_notification_logs               │
│                                         │
│  RPC Function:                          │
│  - get_push_notification_stats()        │
└──────────────┬──────────────────────────┘
               │
        Push Protocol
               │
┌──────────────▼──────────────────────────┐
│       PUSH SERVICE PROVIDERS            │
│                                         │
│  - FCM (Android/Chrome)                 │
│  - APNs (iOS Safari 16.4+)              │
│  - WebPush (Desktop)                    │
└─────────────────────────────────────────┘
```

---

## ✨ Você está pronto!

Após seguir todos os passos acima, seu sistema de push notifications estará **100% funcional**! 🎉

**Dúvidas?** Consulte a documentação completa em `PUSH_NOTIFICATIONS_IMPLEMENTATION.md`

---

**Última atualização:** 31/12/2024

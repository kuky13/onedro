

## Transformar o WebChat em experiencia tipo WhatsApp Web

### Problemas identificados

1. **Realtime channel CLOSED** — O canal Supabase fecha imediatamente, o que impede atualizacoes em tempo real. O nome do canal usa o instanceName (`instance-onedrip_49e47da50de6`) mas nenhum broadcaster envia para esse canal (o webhook usa outro padrao).

2. **Busca nao funciona** — O input de pesquisa existe mas nao filtra nada (sem estado, sem logica).

3. **Mensagens sempre vazias** — O banco `whatsapp_messages` provavelmente nao tem dados para esse usuario/instancia. O "Sincronizar Mensagens" chama `#sync` que dispara `loadMessages(chatId, true)`, que tenta a Evolution API e falha (404). Resultado: sempre "Nenhuma mensagem encontrada localmente".

4. **Header ocupando espaco demais** — O header superior com "Voltar para Instancias", status, IA, instancia ativa tira ~80px do layout. No WhatsApp Web real nao existe isso.

5. **Contatos sem ordem logica** — 595 contatos sem ordenacao por ultima mensagem. Quem nao tem mensagem recente aparece misturado.

6. **Botoes nao funcionais** — O botao "+" (novo contato), o botao de search na janela de chat, e o botao de 3 pontos (MoreVertical) nao fazem nada.

7. **Mobile nao responsivo** — Sidebar fixa em 400px, nao esconde em telas pequenas.

---

### Plano de correcao

#### 1. Sidebar de busca funcional
**Arquivo: `WebChat.tsx`**
- Adicionar estado `searchQuery`
- Conectar o input de pesquisa a esse estado
- Filtrar `filteredChats` pelo nome ou numero do contato usando `searchQuery`

#### 2. Ordenar contatos por ultima mensagem
**Arquivo: `WebChat.tsx`**
- Apos mapear os chats, ordenar por `lastMessageDate` descendente
- Contatos sem mensagem recente ficam no final

#### 3. Remover header redundante e integrar ao layout WhatsApp Web
**Arquivo: `WebChat.tsx`**
- Remover o header superior com "Voltar para Instancias", status da conexao, IA etc
- Mover o botao de logout e status para dentro do header da sidebar (junto ao avatar)
- O `onBack` sera chamado pelo botao de logout ou por um icone discreto
- Resultado: layout fullscreen como WhatsApp Web real

#### 4. Responsividade mobile
**Arquivo: `WebChat.tsx`**
- Em telas < 768px, mostrar apenas a sidebar OU a conversa (nao ambos)
- Ao selecionar um chat, esconder sidebar e mostrar conversa com botao de voltar
- Ao clicar voltar, mostrar sidebar novamente

#### 5. Corrigir canal Realtime
**Arquivo: `WebChat.tsx`**
- O canal fecha porque nenhum producer envia broadcast para `instance-{instanceName}`
- Solucao: trocar para subscription na tabela `whatsapp_messages` via Postgres Changes (INSERT) filtrado pelo `owner_id` do usuario
- Isso captura mensagens novas inseridas pelo webhook automaticamente
- Remover a dependencia de broadcast que nunca funciona

#### 6. Remover botoes sem funcao
**Arquivo: `ChatWindow.tsx`**
- Remover os botoes de Search e MoreVertical do header da conversa (nao fazem nada)
- Remover o botao "+" do input area (nao implementado)
- Manter apenas o input de texto e o botao de enviar

#### 7. Melhorar estado vazio de mensagens
**Arquivo: `ChatWindow.tsx`**
- Trocar "Nenhuma mensagem encontrada localmente" por mensagem mais amigavel: "Inicie uma conversa enviando uma mensagem"
- Remover o botao "Sincronizar Mensagens" que nunca funciona (Evolution GO nao tem endpoint de historico)
- Mostrar apenas o campo de input para o usuario comecar a digitar

#### 8. Polling mais inteligente
**Arquivo: `WebChat.tsx`**
- Ativar polling de chats a cada 15s (para atualizar a lista lateral com novas mensagens)
- Manter polling de mensagens a cada 3s quando realtime nao estiver conectado

---

### Arquivos a alterar
- `src/components/whatsapp/WebChat.tsx` — busca, ordenacao, layout, realtime, responsividade
- `src/components/whatsapp/ChatWindow.tsx` — remover botoes mortos, melhorar estado vazio
- `src/components/whatsapp/ChatList.tsx` — ajustes visuais menores para WhatsApp Web feel

### Resultado esperado
- Layout fullscreen tipo WhatsApp Web (sem header redundante)
- Busca funcional na barra lateral
- Contatos ordenados por ultima mensagem
- Mensagens em tempo real via Postgres Changes
- Mobile responsivo (sidebar ou conversa, nao ambos)
- Sem botoes mortos ou mensagens confusas


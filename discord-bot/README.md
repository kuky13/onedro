# 🤖 Drippy — Bot do Discord (OneDrip)

Bot do Discord da Drippy, assistente virtual da OneDrip, powered by Claude AI.

## Funcionalidades

- Responde em **DMs** diretas ao bot
- Responde a **@menções** em qualquer canal do servidor
- Responde automaticamente em **canais de suporte** configurados (sem precisar de @mention)
- Histórico de conversa por usuário (últimas 10 trocas)
- Sistema de humor adaptativo (Drippy fica mais fria se o usuário for grosseiro)
- Base de conhecimento técnica sobre assistência técnica de celulares

### Comandos especiais (sem barra, só digitando)

| Comando | Descrição |
|---------|-----------|
| `!drippy reset` | Limpa o histórico da conversa (útil quando quer mudar de assunto) |
| `!drippy humor` | Mostra o humor atual da Drippy com você |

---

## Configuração

### 1. Criar o bot no Discord

1. Acesse [discord.com/developers/applications](https://discord.com/developers/applications)
2. Clique em **New Application** → dê o nome "Drippy" (ou qualquer outro)
3. Vá em **Bot** → clique em **Add Bot**
4. Em **Privileged Gateway Intents**, ative:
   - ✅ **Message Content Intent** (obrigatório)
5. Copie o **Token** (guarde com segurança)

### 2. Convidar o bot para o servidor

Na aba **OAuth2 → URL Generator**:
- Scopes: `bot`
- Bot Permissions: `Send Messages`, `Read Messages/View Channels`, `Read Message History`
- Copie a URL gerada e acesse no navegador para convidar

### 3. Obter a chave da API da Anthropic

Acesse [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) e crie uma chave.

---

## Deploy na VPS

### Requisitos

- Node.js 18+ (`node --version`)
- npm
- PM2 (`npm install -g pm2`)

### Passo a passo

```bash
# 1. Copiar o projeto para a VPS (de onde estiver o código)
scp -r ./discord-bot usuario@ip-da-vps:/opt/drippy-discord
# ou clonar do GitHub se você pushar o projeto

# 2. Na VPS, entrar na pasta
cd /opt/drippy-discord

# 3. Instalar dependências
npm install

# 4. Criar o arquivo .env baseado no exemplo
cp .env.example .env
nano .env
# Preencha DISCORD_TOKEN e ANTHROPIC_API_KEY

# 5. Criar pasta de logs
mkdir -p logs

# 6. Iniciar com PM2
pm2 start ecosystem.config.js

# 7. Verificar se está rodando
pm2 status
pm2 logs drippy-discord

# 8. Configurar PM2 para reiniciar automaticamente ao ligar a VPS
pm2 save
pm2 startup
# Execute o comando que o PM2 mostrar (ex: sudo env PATH=... pm2 startup systemd ...)
```

### Comandos úteis no servidor

```bash
pm2 status                    # Ver status do bot
pm2 logs drippy-discord       # Ver logs em tempo real
pm2 restart drippy-discord    # Reiniciar o bot
pm2 stop drippy-discord       # Parar o bot
pm2 delete drippy-discord     # Remover da lista do PM2
```

### Configurar canal de suporte (opcional)

Para que a Drippy responda automaticamente em um canal específico sem precisar de @mention:

1. No Discord, ative **Modo Desenvolvedor**: Configurações → Avançado → Modo Desenvolvedor
2. Clique com o botão direito no canal → **Copiar ID do canal**
3. No arquivo `.env`, adicione:
   ```
   SUPPORT_CHANNEL_IDS=ID_DO_CANAL
   ```
4. Para múltiplos canais: `SUPPORT_CHANNEL_IDS=ID1,ID2,ID3`
5. Reinicie o bot: `pm2 restart drippy-discord`

---

## Estrutura

```
discord-bot/
├── src/
│   ├── index.js          # Bot principal (Discord.js)
│   ├── drippy.js         # Integração Claude API + histórico + mood
│   └── systemPrompt.js   # Personalidade da Drippy para Discord
├── .env.example          # Modelo de variáveis de ambiente
├── .gitignore
├── ecosystem.config.js   # Configuração PM2
├── package.json
└── README.md
```

---

## Custos estimados

O bot usa a API da Anthropic (Claude). Custo aproximado por conversa (10 mensagens):

- Modelo claude-sonnet-4-6: ~$0.003–$0.01 por conversa
- Para um servidor pequeno com 50 conversas/dia: ~$0.15–$0.50/dia

Monitore o uso em [console.anthropic.com](https://console.anthropic.com).

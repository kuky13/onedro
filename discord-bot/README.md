# 🤖 Drippy — Bot do Discord (OneDrip)

Bot do Discord da Drippy, assistente virtual da OneDrip, powered by **Google Gemini** (gratuito).

## Funcionalidades

- Responde em **DMs** diretas ao bot
- Responde a **@menções** em qualquer canal do servidor
- Responde automaticamente em **canais de suporte** configurados
- Histórico de conversa por usuário (últimas 10 trocas)
- Sistema de humor adaptativo (Drippy fica mais fria se o usuário for grosseiro)
- Base de conhecimento técnica sobre assistência técnica de celulares

### Comandos

| Comando | Descrição |
|---------|-----------|
| `!drippy reset` | Limpa o histórico da conversa |
| `!drippy humor` | Mostra o humor atual da Drippy com você |

---

## Passo a passo completo para rodar na VPS

### Parte 1 — Pegar a chave do Gemini (grátis)

1. Acesse **https://aistudio.google.com/apikey**
2. Faça login com sua conta Google
3. Clique em **"Create API Key"**
4. Copie a chave (formato: `AIzaSy...`)
5. Guarde com segurança

### Parte 2 — Criar o bot no Discord

1. Acesse **https://discord.com/developers/applications**
2. Clique em **"New Application"** → nome: `Drippy`
3. Na aba **"Bot"**:
   - Clique em **"Add Bot"**
   - Em **"Privileged Gateway Intents"**, ative:
     - ✅ **MESSAGE CONTENT INTENT** (obrigatório!)
   - Copie o **Token** do bot
4. Na aba **"OAuth2" → "URL Generator"**:
   - Scopes: marque `bot`
   - Bot Permissions: marque `Send Messages`, `Read Messages/View Channels`, `Read Message History`
   - Copie a **URL gerada** e abra no navegador para convidar o bot ao seu servidor

### Parte 3 — Instalar na VPS

Conecte na sua VPS via SSH e execute:

```bash
# 1. Instalar Node.js 18+ (se não tiver)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Instalar PM2 (gerenciador de processo)
sudo npm install -g pm2

# 3. Clonar o projeto (ou copiar a pasta discord-bot)
git clone https://github.com/kuky13/onedro.git /opt/onedro
cd /opt/onedro/discord-bot

# 4. Instalar dependências
npm install

# 5. Criar o arquivo .env
cp .env.example .env
nano .env
```

No `nano`, preencha:
```
DISCORD_TOKEN=seu_token_do_discord
GEMINI_API_KEY=sua_chave_do_gemini
```
Salve com `Ctrl+O`, `Enter`, `Ctrl+X`.

```bash
# 6. Criar pasta de logs
mkdir -p logs

# 7. Iniciar o bot com PM2
pm2 start ecosystem.config.js

# 8. Verificar se está rodando
pm2 status

# 9. Ver os logs (feedback visual em tempo real)
pm2 logs drippy-discord

# 10. Configurar para iniciar automaticamente quando a VPS ligar/reiniciar
pm2 save
pm2 startup
# ↑ Execute o comando que o PM2 mostrar (começa com "sudo env PATH=...")
```

### Parte 4 — Monitorar o bot

```bash
# Ver status com informações detalhadas
pm2 status

# Ver logs em tempo real (Ctrl+C para sair)
pm2 logs drippy-discord

# Ver métricas de CPU/memória em tempo real
pm2 monit

# Dashboard web (opcional — acessar via navegador)
pm2 plus
# ↑ Cria um dashboard em https://app.pm2.io (grátis para 1 servidor)

# Ver últimos erros
pm2 logs drippy-discord --err --lines 50

# Reiniciar o bot
pm2 restart drippy-discord

# Parar o bot
pm2 stop drippy-discord
```

### Parte 5 — Configurar canal de suporte (opcional)

Para a Drippy responder automaticamente em um canal sem precisar de @mention:

1. No Discord: **Configurações** → **Avançado** → ative **Modo Desenvolvedor**
2. Clique com o botão direito no canal → **Copiar ID do canal**
3. Edite o `.env`:
   ```bash
   nano /opt/onedro/discord-bot/.env
   ```
   Adicione a linha:
   ```
   SUPPORT_CHANNEL_IDS=id_do_canal_aqui
   ```
4. Reinicie: `pm2 restart drippy-discord`

---

## Estrutura

```
discord-bot/
├── src/
│   ├── index.js          # Bot principal (Discord.js)
│   ├── drippy.js         # Integração Gemini API + histórico + mood
│   └── systemPrompt.js   # Personalidade da Drippy
├── .env.example          # Modelo de variáveis
├── .gitignore
├── ecosystem.config.js   # Config PM2
├── package.json
└── README.md
```

## Custos

- **Gemini API**: **GRÁTIS** (tier free: 15 requisições/min, 1 milhão de tokens/min)
- **VPS**: O que você já paga
- **Discord Bot**: Grátis

Para monitorar uso do Gemini: https://aistudio.google.com/apikey (mostra consumo)

require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ActivityType,
} = require("discord.js");

const { askDrippy, clearHistory, getUserMood } = require("./drippy");

// ─── Validação de variáveis de ambiente ───────────────────────────────────────
const required = ["DISCORD_TOKEN", "GEMINI_API_KEY"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[ERRO] Variável de ambiente obrigatória não definida: ${key}`);
    process.exit(1);
  }
}

// Canais onde a Drippy responde automaticamente (sem precisar de @mention)
// Separar por vírgula no .env: SUPPORT_CHANNEL_IDS=123456,789012
const SUPPORT_CHANNEL_IDS = new Set(
  (process.env.SUPPORT_CHANNEL_IDS || "").split(",").filter(Boolean)
);

// ─── Cliente Discord ──────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// ─── Cooldown para evitar spam ────────────────────────────────────────────────
const cooldowns = new Map(); // userId -> timestamp
const COOLDOWN_MS = 3000; // 3 segundos entre mensagens

function isOnCooldown(userId) {
  const last = cooldowns.get(userId);
  if (!last) return false;
  return Date.now() - last < COOLDOWN_MS;
}

// ─── Processamento de mensagem ────────────────────────────────────────────────
async function handleMessage(message) {
  if (message.author.bot) return;

  const isDM = !message.guild;
  const isMentioned = message.mentions.has(client.user);
  const isSupportChannel = SUPPORT_CHANNEL_IDS.has(message.channel.id);

  // Responde em: DMs, @mentions, ou canais de suporte configurados
  if (!isDM && !isMentioned && !isSupportChannel) return;

  const userId = message.author.id;

  if (isOnCooldown(userId)) {
    return; // Ignora silenciosamente durante o cooldown
  }

  // Extrair texto limpo (remover @mention do início)
  let content = message.content
    .replace(`<@${client.user.id}>`, "")
    .replace(`<@!${client.user.id}>`, "")
    .trim();

  // Comando especial: !drippy reset — limpa histórico da conversa
  if (content.toLowerCase() === "!drippy reset") {
    clearHistory(userId);
    await message.reply("Conversa reiniciada! Como posso ajudar? 😊");
    return;
  }

  // Comando especial: !drippy humor — mostra o humor atual
  if (content.toLowerCase() === "!drippy humor") {
    const mood = getUserMood(userId);
    const emoji = mood >= 80 ? "😊" : mood >= 60 ? "😐" : mood >= 40 ? "😑" : mood >= 20 ? "🥶" : "❄️";
    await message.reply(`Meu humor com você agora: **${mood}/100** ${emoji}`);
    return;
  }

  if (!content) {
    await message.reply("Oi! Como posso ajudar? 😊");
    return;
  }

  cooldowns.set(userId, Date.now());

  // Mostrar "digitando..." enquanto processa
  await message.channel.sendTyping();

  try {
    const { reply } = await askDrippy(userId, content);

    // Discord tem limite de 2000 caracteres por mensagem
    if (reply.length <= 1900) {
      await message.reply(reply);
    } else {
      // Dividir em partes respeitando o limite
      const chunks = splitMessage(reply, 1900);
      for (const chunk of chunks) {
        await message.channel.send(chunk);
      }
    }
  } catch (error) {
    console.error("[Bot] Erro ao processar mensagem:", error.message);
    await message.reply(
      "Tive um problema técnico agora. Tente novamente em alguns segundos. Se o erro persistir, fale com nossa equipe no WhatsApp: (64) 99602-8022 😊"
    );
  }
}

// Divide uma string longa em chunks de no máximo maxLength caracteres
function splitMessage(text, maxLength) {
  const chunks = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    // Tentar quebrar em parágrafo, depois em linha, depois no limite
    let breakAt = remaining.lastIndexOf("\n\n", maxLength);
    if (breakAt < maxLength * 0.5) breakAt = remaining.lastIndexOf("\n", maxLength);
    if (breakAt < maxLength * 0.5) breakAt = remaining.lastIndexOf(" ", maxLength);
    if (breakAt <= 0) breakAt = maxLength;

    chunks.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

// ─── Eventos do bot ───────────────────────────────────────────────────────────
client.once(Events.ClientReady, (c) => {
  console.log(`✅ Drippy online como: ${c.user.tag}`);
  console.log(`   Servidores: ${c.guilds.cache.size}`);
  console.log(`   Canais de suporte configurados: ${SUPPORT_CHANNEL_IDS.size || "nenhum (apenas DMs e @mentions)"}`);

  c.user.setActivity("assistências técnicas 🔧", { type: ActivityType.Watching });
});

client.on(Events.MessageCreate, async (message) => {
  try {
    await handleMessage(message);
  } catch (error) {
    console.error("[Bot] Erro não tratado no MessageCreate:", error);
  }
});

client.on(Events.Error, (error) => {
  console.error("[Discord] Erro de cliente:", error.message);
});

// ─── Iniciar ──────────────────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error("[ERRO] Falha ao conectar ao Discord:", err.message);
  process.exit(1);
});

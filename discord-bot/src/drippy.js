const Anthropic = require("@anthropic-ai/sdk");
const { buildSystemPrompt } = require("./systemPrompt");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Histórico de conversa por usuário: userId -> [{role, content}]
const conversationHistory = new Map();

// Mood por usuário: userId -> number (0-100)
const userMoods = new Map();

const MAX_HISTORY_MESSAGES = 20; // 10 trocas (user + assistant)
const MOOD_DECREASE_RUDE = 15;
const MOOD_INCREASE_NICE = 5;
const MOOD_DEFAULT = 100;

// Palavras que indicam grosseria/xingamentos em português
const RUDE_PATTERNS = [
  /\bporra\b/i, /\bmerda\b/i, /\bviado\b/i, /\bidiota\b/i, /\bestúpid/i,
  /\bburro\b/i, /\bimbecil\b/i, /\bcrétino\b/i, /\bfilho da puta\b/i,
  /\bfdp\b/i, /\bvsf\b/i, /\bsua mãe\b/i, /\blixo\b/i, /\binútil\b/i,
];

function getUserMood(userId) {
  return userMoods.get(userId) ?? MOOD_DEFAULT;
}

function adjustMood(userId, message) {
  let mood = getUserMood(userId);
  const isRude = RUDE_PATTERNS.some((p) => p.test(message));

  if (isRude) {
    mood = Math.max(0, mood - MOOD_DECREASE_RUDE);
  } else {
    mood = Math.min(100, mood + MOOD_INCREASE_NICE);
  }

  userMoods.set(userId, mood);
  return mood;
}

function getHistory(userId) {
  return conversationHistory.get(userId) || [];
}

function addToHistory(userId, role, content) {
  const history = getHistory(userId);
  history.push({ role, content });

  // Manter apenas as últimas MAX_HISTORY_MESSAGES mensagens
  if (history.length > MAX_HISTORY_MESSAGES) {
    history.splice(0, history.length - MAX_HISTORY_MESSAGES);
  }

  conversationHistory.set(userId, history);
}

function clearHistory(userId) {
  conversationHistory.delete(userId);
  userMoods.delete(userId);
}

async function askDrippy(userId, userMessage) {
  const mood = adjustMood(userId, userMessage);

  addToHistory(userId, "user", userMessage);

  const history = getHistory(userId);
  // O último item é a mensagem que acabamos de adicionar — enviamos todo o histórico
  const messages = history.map((m) => ({ role: m.role, content: m.content }));

  try {
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
      max_tokens: 1024,
      system: buildSystemPrompt(mood),
      messages,
    });

    const reply = response.content[0]?.text || "Desculpa, tive um problema ao processar sua mensagem.";

    addToHistory(userId, "assistant", reply);

    return { reply, mood };
  } catch (error) {
    console.error("[Drippy] Erro ao chamar Claude API:", error.message);
    // Remover a mensagem do usuário do histórico se a API falhou
    const hist = getHistory(userId);
    if (hist.length > 0 && hist[hist.length - 1].role === "user") {
      hist.pop();
    }
    throw error;
  }
}

module.exports = { askDrippy, clearHistory, getUserMood };

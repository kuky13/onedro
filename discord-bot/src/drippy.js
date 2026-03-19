const { GoogleGenerativeAI } = require("@google/generative-ai");
const { buildSystemPrompt } = require("./systemPrompt");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Histórico de conversa por usuário: userId -> [{role, parts}]
const conversationHistory = new Map();

// Mood por usuário: userId -> number (0-100)
const userMoods = new Map();

const MAX_HISTORY_MESSAGES = 20; // 10 trocas (user + model)
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

function addToHistory(userId, role, text) {
  const history = getHistory(userId);
  // Gemini usa "user" e "model" como roles
  history.push({ role, parts: [{ text }] });

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

  // Buscar histórico ANTES de adicionar a mensagem atual
  const history = getHistory(userId);

  // Criar modelo com system prompt baseado no mood atual
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    systemInstruction: buildSystemPrompt(mood),
  });

  // Iniciar chat com histórico existente
  const chat = model.startChat({ history });

  try {
    const result = await chat.sendMessage(userMessage);
    const reply = result.response.text();

    // Adicionar ambos ao histórico local
    addToHistory(userId, "user", userMessage);
    addToHistory(userId, "model", reply);

    return { reply, mood };
  } catch (error) {
    console.error("[Drippy] Erro ao chamar Gemini API:", error.message);
    throw error;
  }
}

module.exports = { askDrippy, clearHistory, getUserMood };

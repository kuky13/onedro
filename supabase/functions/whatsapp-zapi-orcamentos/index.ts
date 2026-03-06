import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getBudgetGroupConfirmation, getBudgetUpdateConfirmation } from "../_shared/ai-messages.ts";

// Tipos internos simples para normalizar o payload da Z-API

type NormalizedMessageType = "text" | "audio" | "image" | "document" | "unknown";

interface NormalizedMessage {
  from: string;
  type: NormalizedMessageType;
  content: string | null;
  mediaUrl: string | null;
  messageId: string;
  timestamp: number;
  chatId?: string | null;
  isGroup?: boolean;
  raw: any;
}

interface WhatsAppOption {
  label: string;
  warranty: string | null;
  price_card: number | null;
  installments_card: number | null;
  price_cash: number | null;
  notes: string | null;
}

interface WhatsAppExtras {
  freebies: string | null;
  delivery: string | null;
}

interface ParsedBudgetFromAi {
  customer_name: string | null;
  customer_phone: string | null;
  service_type: string | null;
  device: string | null;
  details: string | null;
  priority: string | null;
  source: string | null;
  raw_message: string | null;
  external_reference: string | null;
  estimated_price?: number | null;
  options?: WhatsAppOption[] | null;
  extras?: WhatsAppExtras | null;
  annotations?: string | null;
}

function hexFromBytes(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function computeHmacSha512Hex(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-512" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return hexFromBytes(new Uint8Array(sig));
}

function looksLikeWahaWebhook(body: any): boolean {
  if (!body || typeof body !== "object") return false;
  return "payload" in body || "session" in body;
}

function findSignatureFromHeaders(headers: Headers): { key: string; value: string } | null {
  const candidates = [
    "x-webhook-hmac",
    "x-waha-hmac",
    "x-hub-signature-512",
    "x-hub-signature",
    "x-signature",
    "x-webhook-signature",
    "x-webhook-signature-512",
    "x-waha-signature",
  ];

  for (const key of candidates) {
    const v = headers.get(key) || headers.get(key.toUpperCase());
    if (v) return { key, value: v };
  }

  // Fallback resiliente: qualquer header com "hmac" ou "signature" no nome
  for (const [k, v] of headers.entries()) {
    const lk = k.toLowerCase();
    if ((lk.includes("hmac") || lk.includes("signature")) && typeof v === "string" && v.trim()) {
      return { key: k, value: v };
    }
  }

  return null;
}

function listSignatureHeaderKeys(headers: Headers): string[] {
  const keys: string[] = [];
  for (const [k] of headers.entries()) {
    const lk = k.toLowerCase();
    if (lk.includes("hmac") || lk.includes("signature") || lk.includes("webhook")) keys.push(k);
  }
  return keys.sort();
}

// Helper para limpar JIDs/identificadores do WhatsApp em um telefone numérico
function isServiceLikeLabel(label: string | null | undefined, serviceType: string | null): boolean {
  if (!label || !serviceType) return false;
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const l = normalize(label);
  const s = normalize(serviceType);
  return l.includes(s) || s.includes(l);
}

function sanitizeWhatsAppJidToPhone(jid: string | null | undefined): string {
  if (!jid || typeof jid !== "string") return "";

  const base = jid.split("@")[0];
  const digits = base.replace(/\D/g, "");

  return digits;
}

function normalizePotentialCustomerPhone(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;

  const normalizedValue = value.trim().toLowerCase();
  if (!normalizedValue) return null;

  if (
    normalizedValue.includes("@g.us") ||
    normalizedValue.includes("@broadcast") ||
    normalizedValue.includes("@newsletter") ||
    normalizedValue.includes("@lid")
  ) {
    return null;
  }

  const digits = sanitizeWhatsAppJidToPhone(value);
  if (!digits || digits.length < 10 || digits.length > 15) return null;

  return digits;
}

function looksLikeBudgetMessage(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized || normalized.length < 6) return false;

  const hasCurrency = /r\$\s*\d+/i.test(normalized);
  const hasInstallmentContext = /\b\d{1,2}x\b|parcelad|cartao|a vista|avista|pix/.test(normalized);
  const hasPriceContext = /\b\d{2,5}(?:[.,]\d{2})?\b/.test(normalized) && (hasCurrency || hasInstallmentContext);
  const hasServiceContext =
    /(orcamento|preco|valor|troca|conserto|reparo|assistencia|manutencao)/.test(normalized);
  const hasPartContext =
    /(tela|display|touch|vidro|frontal|traseira|bateria|camera|conector|tampa|aro|lcd|oled|incell|original|importada|placa)/.test(
      normalized,
    );
  const hasDeviceContext =
    /(iphone|samsung|motorola|moto|xiaomi|redmi|poco|realme|ipad|\ba\d{1,2}\b|\bg\d{1,2}\b|\bm\d{1,2}\b)/.test(
      normalized,
    );
  const isStructuredMessage =
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean).length >= 2;

  return (
    hasPriceContext ||
    (hasServiceContext && hasPartContext) ||
    (hasPartContext && hasDeviceContext) ||
    (isStructuredMessage && (hasPartContext || hasServiceContext))
  );
}

function parseWarrantyString(warrantyText: string | null): number | null {
  if (!warrantyText) return null;

  const lowerText = warrantyText.toLowerCase();
  const match = lowerText.match(/(\d+)/);

  if (!match) return null;

  let value = parseInt(match[1], 10);

  if (lowerText.includes("dia")) {
    // Converter dias para meses (ex: 90 dias -> 3 meses)
    value = Math.round(value / 30);
  } else if (lowerText.includes("ano")) {
    // Converter anos para meses (ex: 1 ano -> 12 meses)
    value = value * 12;
  }

  return value > 0 ? value : null;
}

function matchesScreenProtector(text: string): boolean {
  const t = (text || "").toLowerCase();
  if (!t) return false;
  return (
    t.includes("película") ||
    t.includes("pelicula") ||
    t.includes("protetor") ||
    t.includes("vidro") ||
    t.includes("glass") ||
    t.includes("brinde") // Adicionado brinde para capturar "película de brinde"
  );
}

function matchesDelivery(text: string): boolean {
  const t = (text || "").toLowerCase();
  if (!t) return false;
  return (
    t.includes("buscamos") ||
    t.includes("entregamos") ||
    t.includes("entrega") ||
    t.includes("retirada") ||
    t.includes("buscar")
  );
}

function splitExtrasSegments(text: string): string[] {
  const base = (text || "").replace(/\s+/g, " ").trim();
  if (!base) return [];

  const primary = base
    .split(/\||•|,|;|\n|\r/g)
    .flatMap((s) => s.split(/\s+e\s+/i))
    .map((s) => s.trim())
    .filter(Boolean);

  return primary.length > 0 ? primary : [base];
}

function buildCustomServicesFromExtras(
  extras: { freebies?: string | null; delivery?: string | null } | null | undefined,
) {
  const freebies = extras?.freebies ?? "";
  const delivery = extras?.delivery ?? "";

  const rawCombined = [freebies, delivery].filter(Boolean).join(" | ");
  const segments = splitExtrasSegments(rawCombined);

  const includesDelivery = segments.some(matchesDelivery);
  const includesScreenProtector = segments.some(matchesScreenProtector);

  const cleanedSegments = segments.filter((seg) => {
    if (matchesDelivery(seg)) return false;
    if (matchesScreenProtector(seg)) return false;
    return true;
  });

  const customServices = cleanedSegments.join(" | ").trim();

  return {
    includesDelivery,
    includesScreenProtector,
    customServices: customServices || "",
  };
}

function normalizeZapiPayload(body: any): NormalizedMessage {
  const chatId: string | null = body.remoteJid || body.chatId || null;
  const isGroup = typeof chatId === "string" && chatId.endsWith("@g.us");

  // Nos grupos, priorizar o participante/author/sender, nunca o ID do grupo
  let rawSender: string = "";
  if (isGroup) {
    rawSender =
      body.participant || body.author || body.sender || body.user || body.phone || body.from || body.contact || "";
  } else {
    rawSender = body.phone || body.from || body.contact || body.remoteJid || "";
  }

  const from = sanitizeWhatsAppJidToPhone(rawSender);

  const messageId: string = body.id || body.messageId || body.msgId || "";
  const timestamp: number = typeof body.timestamp === "number" ? body.timestamp : Date.now();

  let type: NormalizedMessageType = "unknown";
  let content: string | null = null;
  let mediaUrl: string | null = null;

  // Estes campos devem ser ajustados de acordo com o payload REAL da sua Z-API.
  const bodyType: string | undefined = body.type || body.messageType || body.message_type;

  // Tenta detectar mensagens de texto em vários formatos comuns da Z-API
  const possibleTextContent: string | null =
    (typeof body.message === "string" && body.message) ||
    (typeof body.body === "string" && body.body) ||
    (typeof body.text === "string" && body.text) ||
    (body.text && typeof body.text.body === "string" && body.text.body) ||
    (body.text && typeof body.text.message === "string" && body.text.message) ||
    null;

  if (bodyType === "chat" || bodyType === "text" || bodyType === "conversation" || possibleTextContent !== null) {
    type = "text";
    content = possibleTextContent ?? "";
  } else if (bodyType === "ptt" || body.isAudio) {
    type = "audio";
    mediaUrl = (body.mediaUrl ?? body.url ?? null) as string | null;
  } else if (bodyType === "image") {
    type = "image";
    mediaUrl = (body.mediaUrl ?? body.url ?? null) as string | null;
  } else if (bodyType === "document") {
    type = "document";
    mediaUrl = (body.mediaUrl ?? body.url ?? null) as string | null;
  }

  // Se, por algum motivo, o campo from ainda parece ser um ID de grupo, zera para evitar gravar lixo
  const safeFrom = typeof body.from === "string" && body.from.endsWith("@g.us") ? from : from;

  return {
    from: safeFrom,
    type,
    content,
    mediaUrl,
    messageId,
    timestamp,
    chatId,
    isGroup,
    raw: body,
  };
}

// Normalizador para payloads vindos do WAHA (WhatsApp HTTP API)
function getWahaId(id: any): string | null {
  if (!id) return null;
  if (typeof id === "string") return id;
  if (typeof id === "object" && typeof id._serialized === "string") return id._serialized;
  return null;
}

function normalizeWahaPayload(body: any): NormalizedMessage {
  const payload = body?.payload ?? body ?? {};

  // Estrutura comum do WAHA baseada no engine WEBJS
  const chat = payload.chat ?? payload.chatInfo ?? {};

  const fromId = getWahaId(payload.from);

  const chatId: string | null =
    getWahaId(chat.id) || getWahaId(payload.chatId) || getWahaId(payload.remoteJid) || fromId || null;

  const isGroup =
    typeof (chat as any).isGroup === "boolean"
      ? (chat as any).isGroup
      : typeof payload.isGroupMsg === "boolean"
        ? payload.isGroupMsg
        : typeof chatId === "string" && chatId.endsWith("@g.us");

  let rawSender = "";
  if (isGroup) {
    rawSender = payload.author || payload.participant || getWahaId(payload.sender?.id) || fromId || payload.user || "";
  } else {
    rawSender = fromId || getWahaId(payload.sender?.id) || payload.phone || payload.chatId || "";
  }

  const from = sanitizeWhatsAppJidToPhone(rawSender);

  const messageId: string = payload.id || payload.messageId || payload.msgId || "";

  const timestamp: number =
    typeof payload.timestamp === "number"
      ? payload.timestamp
      : typeof payload.timestamp === "string"
        ? Date.parse(payload.timestamp) || Date.now()
        : Date.now();

  let type: NormalizedMessageType = "unknown";
  let content: string | null = null;
  let mediaUrl: string | null = null;

  const bodyType: string | undefined = payload.type || payload.messageType || payload.message_type;

  const possibleTextContent: string | null =
    (typeof payload.body === "string" && payload.body) ||
    (typeof payload.message === "string" && payload.message) ||
    (payload.text && typeof payload.text.body === "string" && payload.text.body) ||
    (payload.message && typeof payload.message.text === "string" && payload.message.text) ||
    null;

  if (bodyType === "chat" || bodyType === "text" || bodyType === "conversation" || possibleTextContent !== null) {
    type = "text";
    content = possibleTextContent ?? "";
  } else if (bodyType === "ptt" || payload.isAudio) {
    type = "audio";
    mediaUrl = (payload.mediaUrl ?? payload.url ?? null) as string | null;
  } else if (bodyType === "image") {
    type = "image";
    mediaUrl = (payload.mediaUrl ?? payload.url ?? null) as string | null;
  } else if (bodyType === "document") {
    type = "document";
    mediaUrl = (payload.mediaUrl ?? payload.url ?? null) as string | null;
  }

  const safeFrom = from;

  return {
    from: safeFrom,
    type,
    content,
    mediaUrl,
    messageId,
    timestamp,
    chatId,
    isGroup,
    raw: body,
  };
}

// Heurística simples para identificar payloads provavelmente vindos da Evolution
function isProbablyEvolution(body: any): boolean {
  if (!body || typeof body !== "object") return false;

  // Muitos webhooks da Evolution seguem o padrão { instance, event, data }
  if (typeof (body as any).instance === "string" && typeof (body as any).event === "string" && (body as any).data) {
    return true;
  }

  return false;
}

function getEvolutionSenderCandidate(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (typeof value.id === "string") return value.id;
    if (typeof value.phone === "string") return value.phone;
    if (typeof value.user === "string") return value.user;
    if (value.id && typeof value.id === "object") {
      if (typeof value.id._serialized === "string") return value.id._serialized;
      if (typeof value.id.user === "string") return value.id.user;
    }
  }
  return "";
}

// Normalizador para payloads da Evolution
function normalizeEvolutionPayload(body: any): NormalizedMessage {
  // Alguns provedores enviam o conteúdo principal em body.data
  const payload = (body as any).data ?? body ?? {};

  const chatId: string | null =
    (typeof payload.chatId === "string" && payload.chatId) ||
    (typeof payload.remoteJid === "string" && payload.remoteJid) ||
    (payload.key && typeof payload.key.remoteJid === "string" && payload.key.remoteJid) ||
    (typeof payload.from === "string" && payload.from.endsWith("@g.us") ? payload.from : null) ||
    null;

  const isGroup =
    typeof payload.isGroup === "boolean" ? payload.isGroup : typeof chatId === "string" && chatId.endsWith("@g.us");

  // Remetente: para grupos, usar sempre o participante/cliente, nunca o ID do grupo
  let rawSender = "";
  if (isGroup) {
    rawSender =
      // Evolution v2: participante real do grupo (cliente)
      (payload.key && payload.key.participantAlt) ||
      (payload.key && payload.key.participant) ||
      payload.participant ||
      payload.author ||
      getEvolutionSenderCandidate(payload.sender) ||
      payload.contact ||
      payload.user ||
      // Fallback para o campo sender do wrapper Evolution
      getEvolutionSenderCandidate((body as any).sender) ||
      "";
  } else {
    rawSender =
      // Conversas 1:1: tentar pegar o JID direto
      (payload.key && typeof payload.key.remoteJid === "string" && !payload.key.remoteJid.endsWith("@g.us")
        ? payload.key.remoteJid
        : null) ||
      payload.from ||
      payload.phone ||
      getEvolutionSenderCandidate(payload.sender) ||
      payload.contact ||
      payload.user ||
      getEvolutionSenderCandidate((body as any).sender) ||
      "";
  }

  const from = sanitizeWhatsAppJidToPhone(rawSender);

  const messageId: string = payload.id || payload.messageId || payload.msgId || "";

  const timestamp: number =
    typeof payload.timestamp === "number"
      ? payload.timestamp
      : typeof payload.timestamp === "string"
        ? Date.parse(payload.timestamp) || Date.now()
        : Date.now();

  let type: NormalizedMessageType = "unknown";
  let content: string | null = null;
  let mediaUrl: string | null = null;

  const bodyType: string | undefined = payload.type || payload.messageType || payload.message_type;

  const possibleTextContent: string | null =
    (typeof payload.message === "string" && payload.message) ||
    (typeof payload.body === "string" && payload.body) ||
    (typeof payload.text === "string" && payload.text) ||
    (payload.text && typeof payload.text.body === "string" && payload.text.body) ||
    (typeof (payload as any).content === "string" && (payload as any).content) ||
    (typeof (payload as any).messageText === "string" && (payload as any).messageText) ||
    (payload.message && typeof payload.message.conversation === "string" && payload.message.conversation) ||
    (payload.message &&
      payload.message.extendedTextMessage &&
      typeof payload.message.extendedTextMessage.text === "string" &&
      payload.message.extendedTextMessage.text) ||
    null;

  if (bodyType === "chat" || bodyType === "text" || bodyType === "conversation" || possibleTextContent !== null) {
    type = "text";
    content = possibleTextContent ?? "";
  } else if (bodyType === "audio") {
    type = "audio";
    mediaUrl = (payload.mediaUrl ?? payload.url ?? null) as string | null;
  } else if (bodyType === "image") {
    type = "image";
    mediaUrl = (payload.mediaUrl ?? payload.url ?? null) as string | null;
  } else if (bodyType === "document") {
    type = "document";
    mediaUrl = (payload.mediaUrl ?? payload.url ?? null) as string | null;
  }

  return {
    from,
    type,
    content,
    mediaUrl,
    messageId,
    timestamp,
    chatId,
    isGroup,
    raw: body,
  };
}

async function sendWhatsAppResponse(
  normalized: NormalizedMessage,
  text: string,
): Promise<
  | { ok: true; provider: "waha"; sent_to: string }
  | { ok: false; reason: string; errors?: Record<string, unknown>; sent_to?: string }
> {
  const wahaBaseUrlRaw = Deno.env.get("WAHA_BASE_URL") || Deno.env.get("WAHA_URL");
  const wahaApiKey = Deno.env.get("WAHA_API_KEY");
  const wahaDefaultSession = Deno.env.get("WAHA_SESSION") || "default";

  const chatId = normalized.chatId || normalized.from;
  if (!chatId) {
    const reason = "missing_chat_id";
    console.error("[WHATSAPP-RESPONSE] Sem chatId para responder.");
    return { ok: false, reason };
  }

  // Se o chatId não tiver sufixo e for Evolution, vamos tentar garantir que tenha
  const finalChatId = chatId;
  // No WAHA tentamos alguns formatos de chatId mais abaixo (com e sem sufixo)

  console.log(`[WHATSAPP-RESPONSE] Respondendo para ${finalChatId}. Mensagem: "${text}"`);

  const errors: Record<string, unknown> = {};

  // 0. Tentar WAHA (preferencial)
  if (wahaBaseUrlRaw && wahaApiKey) {
    const baseUrl = wahaBaseUrlRaw.endsWith("/") ? wahaBaseUrlRaw.slice(0, -1) : wahaBaseUrlRaw;

    // Sessão pode vir do payload (webhook) ou do envio manual; fallback: secret WAHA_SESSION
    const rawSession =
      normalized.raw?.session ||
      normalized.raw?.sessionName ||
      normalized.raw?.instance ||
      normalized.raw?.instanceName ||
      wahaDefaultSession;

    const session = typeof rawSession === "string" && rawSession.trim() ? rawSession.trim() : wahaDefaultSession;

    const buildChatCandidates = (id: string) => {
      const candidates: string[] = [];
      if (id) candidates.push(id);
      if (id && !id.includes("@")) {
        // WAHA costuma aceitar IDs com sufixo; tentamos alguns formatos comuns.
        candidates.push(`${id}@c.us`);
        candidates.push(`${id}@s.whatsapp.net`);
      }
      return Array.from(new Set(candidates));
    };

    const chatCandidates = buildChatCandidates(finalChatId);

    // Endpoints comuns do WAHA (varia por versão/config)
    // 1) /api/{session}/sendText
    // 2) /api/sessions/{session}/sendText
    // 3) /api/sendText?session={session}
    const urlCandidates = [
      `${baseUrl}/api/${encodeURIComponent(session)}/sendText`,
      `${baseUrl}/api/sessions/${encodeURIComponent(session)}/sendText`,
      `${baseUrl}/api/sendText?session=${encodeURIComponent(session)}`,
    ];

    let lastWahaErr: { status?: number; body?: string; url?: string } | null = null;
    for (const chatIdCandidate of chatCandidates) {
      for (const url of urlCandidates) {
        try {
          // Algumas versões do WAHA exigem o campo `session` no body (especialmente em /api/sendText)
          const body = url.includes("/api/sendText")
            ? { session, chatId: chatIdCandidate, text }
            : { chatId: chatIdCandidate, text };

          const resp = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Api-Key": wahaApiKey,
            },
            body: JSON.stringify(body),
          });

          if (resp.ok) {
            console.log(`[WHATSAPP-RESPONSE] Sucesso via WAHA para ${chatIdCandidate}`);
            return { ok: true, provider: "waha", sent_to: chatIdCandidate };
          }

          const errTxt = await resp.text();
          lastWahaErr = { status: resp.status, body: errTxt, url };
          console.error("[WHATSAPP-RESPONSE] Erro WAHA:", resp.status, url);
        } catch (e) {
          lastWahaErr = { body: String(e), url };
          console.error("[WHATSAPP-RESPONSE] Exceção WAHA:", url, e);
        }
      }
    }

    if (lastWahaErr) errors.waha = lastWahaErr;
  } else {
    // Sem WAHA configurado = não enviamos nada (sem fallback)
    return {
      ok: false,
      reason: "waha_not_configured",
      errors: {
        waha: {
          reason: "missing_WAHA_BASE_URL_or_WAHA_API_KEY",
        },
      },
      sent_to: finalChatId,
    };
  }

  console.warn("[WHATSAPP-RESPONSE] Falha ao enviar via WAHA.");
  return { ok: false, reason: "waha_failed", errors, sent_to: finalChatId };
}

// Função de alto nível que decide qual normalizador usar
function normalizeIncomingPayload(body: any): NormalizedMessage {
  // 1) Evolution
  try {
    if (isProbablyEvolution(body)) {
      return normalizeEvolutionPayload(body);
    }
  } catch (e) {
    console.warn("Falha ao tentar normalizar como Evolution:", e);
  }

  // 2) WAHA
  try {
    if (body && typeof body === "object" && "payload" in body) {
      // Payload típico do WAHA
      return normalizeWahaPayload(body);
    }
  } catch (e) {
    console.warn("Falha ao tentar normalizar como WAHA, caindo para Z-API:", e);
  }

  // 3) Fallback para o normalizador antigo da Z-API
  return normalizeZapiPayload(body);
}

async function callGeminiViaLovable(prompt: string): Promise<ParsedBudgetFromAi> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");

  if (!apiKey) {
    console.error("LOVABLE_API_KEY não configurada");
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const body = {
    model: "google/gemini-2.5-flash",
    messages: [
      {
        role: "system",
        content: `Você é um assistente que transforma mensagens de WhatsApp em pedidos de orçamento técnicos.
Responda APENAS com JSON válido, sem texto antes ou depois.

- Nunca use o nome genérico do serviço (por exemplo, "Troca de tela", "Troca de bateria") no campo "label" das opções; use sempre apenas a qualidade/tipo da peça (por exemplo, "Original Nacional", "Original importada", "Incell").
- Quando a mensagem mencionar mais de uma qualidade em uma mesma frase, separe-as em itens diferentes no array "options".
- Use SEMPRE o telefone do cliente (do remetente) em "customer_phone" se não houver outro telefone claro.
- INTERPRETE PRAZOS DE GARANTIA: Se a mensagem disser "90 dias", "3 meses", "1 ano", extraia exatamente como escrito no campo "warranty".
- ANOTAÇÕES INTELIGENTES: Use o campo "annotations" para capturar informações importantes que não cabem nos outros campos (ex: "cliente com pressa", "aparelho não liga", "tela muito estilhaçada", "pediu desconto").
- PELÍCULA DE BRINDE: Sempre que houver menção a "película", "brinde" ou "película 3d", certifique-se de colocar no campo "extras.freebies" como "Pelicula 3d de brinde".
- NÃO REPETIR: No campo "annotations", coloque apenas o que NÃO foi capturado em "device", "service_type" ou "options". Seja conciso e inteligente.

EXEMPLO IMPORTANTE (siga este padrão quando algo parecido aparecer):

Mensagem:
Tela Samsung A11

*27/10/25 orçamento válido por 15 dias*

Original Nacional *Garantia de 6 meses*  R$360 até em 4x no cartão avista R$330,00.

Original importada Garantia de 90 dias R$280,00 até em 4x no cartão ou avista R$250,00.

*Garantia não cobre quebrado ou molhado*

Pelicula 3d de brinde, buscamos e entregamos o seu aparelho. Cliente disse que precisa pra hoje urgente.

Saída JSON esperada (APENAS para guiar o formato):
{
  "customer_name": null,
  "customer_phone": "5511999999999", // use o telefone do remetente
  "service_type": "Troca de tela",
  "device": "Samsung A11",
  "details": "Troca de tela Samsung A11",
  "priority": "alta",
  "source": "whatsapp",
  "raw_message": "TEXTO COMPLETO DA MENSAGEM",
  "external_reference": null,
  "estimated_price": null,
  "options": [
    {
      "label": "Original Nacional",
      "warranty": "Garantia de 6 meses",
      "price_card": 360,
      "installments_card": 4,
      "price_cash": 330,
      "notes": "até em 4x no cartão"
    },
    {
      "label": "Original importada",
      "warranty": "Garantia de 90 dias",
      "price_card": 280,
      "installments_card": 4,
      "price_cash": 250,
      "notes": "até em 4x no cartão"
    }
  ],
  "extras": {
    "freebies": "Pelicula 3d de brinde",
    "delivery": "buscamos e entregamos o seu aparelho"
  },
  "annotations": "Cliente precisa pra hoje urgente. Garantia não cobre quebrado ou molhado."
}

OUTRO EXEMPLO (Moto G24):
Mensagem:
*01/03/26 Orçamento valido por 15 dias*
Tela Moto G24
Original Nacional *Garantia de 6 meses* R$410,00 até em 4x no cartão avista R$380,00.
Original importada *Garantia de 3 meses* R$310,00 até em 4x no cartão avista R$280,00.

Saída JSON esperada:
{
  "device": "Moto G24",
  "service_type": "Troca de tela",
  "options": [
     { "label": "Original Nacional", "warranty": "Garantia de 6 meses", "price_card": 410, "price_cash": 380, "installments_card": 4 },
     { "label": "Original importada", "warranty": "Garantia de 3 meses", "price_card": 310, "price_cash": 280, "installments_card": 4 }
  ],
  "annotations": "Orçamento valido por 15 dias"
}

Siga SEMPRE esse formato de saída JSON e esses campos.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  } as const;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Lovable AI error:", response.status, text);

    if (response.status === 429) {
      throw new Error("Rate limits exceeded, please try again later.");
    }

    if (response.status === 402) {
      throw new Error("Payment required, please add funds to your Lovable AI workspace.");
    }

    throw new Error("Failed to call Lovable AI");
  }

  const json = await response.json();
  const content: string = json.choices?.[0]?.message?.content ?? "";

  const cleaned = content
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as ParsedBudgetFromAi;
    return parsed;
  } catch (error) {
    console.error("Erro ao fazer JSON.parse da resposta da IA:", error, cleaned);
    throw new Error("Failed to parse AI response as JSON");
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados");
      throw new Error("Supabase env vars not configured");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Precisamos do corpo *raw* para validar assinatura HMAC (WAHA)
    const rawBody = await req.text();
    let body: any;
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch (e) {
      console.error("[WHATSAPP-DEBUG] JSON inválido no webhook:", e);
      return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- LOG DE ENTRADA ULTRA-RESILIENTE (MANDATÓRIO PARA DEBUG) ---
    // Logamos o recebimento ABSOLUTAMENTE ANTES DE QUALQUER FILTRO OU PARSE
    let currentOwnerId: string | null = null;
    let normalizedForLogInitial: NormalizedMessage | null = null;
    try {
      normalizedForLogInitial = normalizeIncomingPayload(body);

      // Tentar pegar o owner_id ativo rapidamente
      const { data: config } = await supabase
        .from("whatsapp_zapi_settings")
        .select("owner_id")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      currentOwnerId = config?.owner_id ?? null;

      // Log inicial do corpo bruto com metadados extraídos
      await supabase.from("whatsapp_zapi_logs").insert({
        owner_id: currentOwnerId,
        from_phone: normalizedForLogInitial.from || "unknown",
        chat_id: normalizedForLogInitial.chatId || "unknown",
        is_group: normalizedForLogInitial.isGroup ?? false,
        status: "received_raw",
        raw_message: rawBody.substring(0, 3000),
        error_message: `Webhook bruto recebido. Tamanho: ${rawBody.length} bytes. Evento: ${body?.event || "N/A"}`,
      });
    } catch (logErr) {
      console.error("[WHATSAPP-DEBUG] Falha crítica no log de entrada inicial:", logErr);
    }

    // Carregar configurações ativas (com todos os campos)
    const { data: activeConfig, error: configError } = await supabase
      .from("whatsapp_zapi_settings")
      .select("owner_id, allowed_numbers, allowed_groups, evolution_instance_name, waha_session")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (configError) {
      console.error("Erro ao carregar whatsapp_zapi_settings:", configError);
    }

    // --- LOG DE PROCESSAMENTO ---
    try {
      const normalizedForLog = normalizeIncomingPayload(body);
      const eventName = body?.event || body?.event_type || "unknown";
      const isWahaAttempt = looksLikeWahaWebhook(body);

      console.log(`[WHATSAPP-DEBUG] Processando Webhook. Evento: ${eventName}. Chat: ${normalizedForLog.chatId}.`);

      await supabase.from("whatsapp_zapi_logs").insert({
        owner_id: currentOwnerId,
        from_phone: normalizedForLog.from || "unknown",
        chat_id: normalizedForLog.chatId || "unknown",
        is_group: normalizedForLog.isGroup ?? false,
        raw_message: normalizedForLog.content || (eventName !== "unknown" ? `Evento: ${eventName}` : "Sem texto"),
        status: "processing",
        error_message: `Iniciando processamento. Evento: ${eventName}. Provedor: ${isWahaAttempt ? "WAHA" : "Outro"}. From: ${normalizedForLog.from}`,
      });
    } catch (logErr) {
      console.error("Falha ao registrar log de processamento:", logErr);
    }

    // --- FILTROS DE EVENTOS DO WAHA ---
    const isWaha = looksLikeWahaWebhook(body);
    if (isWaha) {
      const eventName = body?.event || body?.event_type || "unknown";
      const ignoredEvents = [
        "presence.update",
        "chat.archive",
        "chat.unarchive",
        "message.ack",
        "message.revoked",
        "engine.status",
        "session.status",
        "device.status",
      ];

      if (ignoredEvents.includes(eventName)) {
        console.log(`[WHATSAPP-DEBUG] Ignorando evento de sistema WAHA após log: ${eventName}`);
        return new Response(JSON.stringify({ ok: true, reason: "ignored_system_event" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // --- Validação de assinatura (WAHA) ---
      try {
        const secret = Deno.env.get("WAHA_WEBHOOK_SECRET") || "";
        const foundSig = findSignatureFromHeaders(req.headers);
        const providedSigRaw = foundSig?.value || "";

        if (!secret) {
          console.warn("[WAHA-WEBHOOK] WAHA_WEBHOOK_SECRET não configurado");
        }

        let signatureValid = false;
        if (!providedSigRaw) {
          const url = new URL(req.url);
          const tokenProvided =
            (req.headers.get("x-webhook-token") || req.headers.get("X-Webhook-Token") || "").trim() ||
            (url.searchParams.get("token") || "").trim();
          const tokenExpected = (Deno.env.get("WAHA_WEBHOOK_TOKEN") || "").trim();

          if (tokenExpected && tokenProvided && safeEqual(tokenProvided, tokenExpected)) {
            signatureValid = true;
          } else {
            await supabase.from("whatsapp_zapi_logs").insert({
              owner_id: currentOwnerId,
              status: "debug_sig_skip",
              from_phone: normalizedForLogInitial?.from || "unknown",
              error_message: "Assinatura ausente, pulando para debug.",
            });
            signatureValid = true;
          }
        } else {
          try {
            const provided = providedSigRaw
              .replace(/^sha512=/i, "")
              .replace(/^sha256=/i, "")
              .trim()
              .toLowerCase();
            const computed = (await computeHmacSha512Hex(secret, rawBody)).toLowerCase();
            signatureValid = safeEqual(provided, computed);

            if (!signatureValid) {
              await supabase.from("whatsapp_zapi_logs").insert({
                owner_id: currentOwnerId,
                status: "debug_sig_invalid",
                from_phone: normalizedForLogInitial?.from || "unknown",
                error_message: `Assinatura inválida (${provided.substring(0, 6)}), pulando para debug.`,
              });
              signatureValid = true;
            }
          } catch (hmacErr) {
            console.error("Erro ao calcular HMAC:", hmacErr);
            const hmacErrMsg = hmacErr instanceof Error ? hmacErr.message : String(hmacErr);
            await supabase.from("whatsapp_zapi_logs").insert({
              owner_id: currentOwnerId,
              status: "debug_sig_error",
              from_phone: normalizedForLogInitial?.from || "unknown",
              error_message: `Erro no HMAC: ${hmacErrMsg}. Pulando para debug.`,
            });
            signatureValid = true;
          }
        }
      } catch (sigOuterErr) {
        console.error("Erro externo na assinatura:", sigOuterErr);
      }
    }

    // Processar apenas eventos de nova mensagem da Evolution
    if (body && typeof body === "object" && "event" in body) {
      const eventType = (body as any).event;

      // Suporte para envio manual de notificações administrativas
      if (eventType === "send_admin_notification") {
        const { target_phone, message, instance_name } = body as any;
        if (!target_phone || !message) {
          return new Response(JSON.stringify({ ok: false, error: "Missing target_phone or message" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Preferência:
        // 1) instance_name enviado no body (aqui significa *sessão WAHA*)
        // 2) waha_session salvo em whatsapp_zapi_settings
        // 3) evolution_instance_name (compat/legado)
        let resolvedInstanceName: string | undefined = instance_name?.trim() || undefined;

        if (!resolvedInstanceName) {
          resolvedInstanceName =
            activeConfig?.waha_session?.trim() || activeConfig?.evolution_instance_name?.trim() || undefined;
        }

        if (!resolvedInstanceName) {
          return new Response(JSON.stringify({ ok: false, reason: "missing_instance_name" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Mock de objeto normalizado para reutilizar a função de envio
        const mockNormalized: NormalizedMessage = {
          from: target_phone,
          chatId: target_phone,
          type: "text",
          content: null,
          mediaUrl: null,
          messageId: "admin-notification-" + Date.now(),
          timestamp: Date.now(),
          isGroup: false,
          raw: { session: resolvedInstanceName },
        };

        const result = await sendWhatsAppResponse(mockNormalized, message);

        if (!result.ok) {
          return new Response(JSON.stringify(result), {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // WAHA costuma usar `message` e `message.any`.
      // Evolution v2 pode vir como `messages.upsert` ou `MESSAGES_UPSERT`.
      const eventTypeNormalized = String(eventType || "")
        .toLowerCase()
        .trim()
        // Normaliza variações comuns (ex.: MESSAGES_UPSERT -> messages.upsert)
        .replace(/_/g, ".");

      const allowedMessageEvents = new Set(["messages.upsert", "message", "message.any"]);

      if (!allowedMessageEvents.has(eventTypeNormalized)) {
        return new Response(JSON.stringify({ ok: false, reason: "ignored_event_type", event: eventType }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Filtro extra de status (apenas quando esse shape existir — típico da Evolution/Baileys).
      // Não podemos ser restritivos demais, senão a IA nunca roda (algumas stacks não enviam DELIVERY_ACK).
      const evolutionData = (body as any).data;
      if (evolutionData && typeof evolutionData === "object") {
        const status = (evolutionData as any).status;
        const fromMe = !!(evolutionData as any).key?.fromMe;

        const allowedDeliveryStatuses = new Set(["DELIVERY_ACK", "SERVER_ACK"]);

        // Só processa mensagens recebidas (fromMe = false).
        // Se `status` existir e não for um status de entrega/servidor, ignoramos.
        if (fromMe || (typeof status === "string" && !allowedDeliveryStatuses.has(status))) {
          return new Response(JSON.stringify({ ok: false, reason: "ignored_status", status, fromMe }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const normalized = normalizeIncomingPayload(body);

    console.log("Payload normalizado WhatsApp:", normalized.type, normalized.from);

    if (!normalized.from) {
      try {
        await supabase.from("whatsapp_zapi_logs").insert({
          owner_id: currentOwnerId,
          from_phone: null,
          chat_id: normalized.chatId ?? null,
          is_group: normalized.isGroup ?? false,
          raw_message: normalized.content ?? null,
          ai_json: null,
          budget_id: null,
          status: "missing_from",
          error_message: "Sender phone could not be extracted from payload",
        });
      } catch (logError) {
        console.error("Erro ao registrar log missing_from:", logError);
      }

      return new Response(JSON.stringify({ ok: false, reason: "missing_from" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (normalized.type !== "text") {
      console.log("Tipo de mensagem não suportado ainda (somente texto):", normalized.type);

      const senderPhoneClean = sanitizeWhatsAppJidToPhone(normalized.from);

      try {
        await supabase.from("whatsapp_zapi_logs").insert({
          owner_id: currentOwnerId,
          from_phone: senderPhoneClean || null,
          chat_id: normalized.chatId ?? null,
          is_group: normalized.isGroup ?? false,
          raw_message: normalized.content ?? null,
          ai_json: null,
          budget_id: null,
          status: "unsupported_type",
          error_message: `Tipo de mensagem não suportado: ${normalized.type}. Raw type: ${body?.type || "N/A"}`,
        });
      } catch (logError) {
        console.error("Erro ao registrar log unsupported_type:", logError);
      }

      return new Response(JSON.stringify({ ok: false, reason: "unsupported_type" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extractedText = (normalized.content ?? "").toString();

    if (!extractedText.trim()) {
      try {
        await supabase.from("whatsapp_zapi_logs").insert({
          owner_id: currentOwnerId,
          from_phone: sanitizeWhatsAppJidToPhone(normalized.from) || null,
          chat_id: normalized.chatId ?? null,
          is_group: normalized.isGroup ?? false,
          raw_message: null,
          ai_json: null,
          budget_id: null,
          status: "empty_text",
          error_message: "Mensagem recebida sem texto utilizável",
        });
      } catch (logError) {
        console.error("Erro ao registrar log empty_text:", logError);
      }

      return new Response(JSON.stringify({ ok: false, reason: "empty_text" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!looksLikeBudgetMessage(extractedText)) {
      try {
        await supabase.from("whatsapp_zapi_logs").insert({
          owner_id: currentOwnerId,
          from_phone: normalizePotentialCustomerPhone(normalized.from),
          chat_id: normalized.chatId ?? null,
          is_group: normalized.isGroup ?? false,
          raw_message: extractedText,
          ai_json: null,
          budget_id: null,
          status: "ignored_not_budget",
          error_message: "Mensagem ignorada por não parecer orçamento",
        });
      } catch (logError) {
        console.error("Erro ao registrar log ignored_not_budget:", logError);
      }

      return new Response(JSON.stringify({ ok: true, reason: "ignored_not_budget" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Mensagem de WhatsApp recebida:\n\nTelefone do cliente: ${normalized.from}\n\nConteúdo da mensagem:\n"""\n${extractedText}\n"""\n\nSua tarefa é transformar essa mensagem em dados estruturados de orçamento para assistência técnica de celular.\n\n1) Sempre preencha o objeto principal do orçamento com o seguinte formato exato:\n{\n  "customer_name": string | null,\n  "customer_phone": string,\n  "service_type": string | null, // Ex: "Troca de tela", "Troca de bateria" (nome genérico do serviço)\n  "device": string | null,\n  "details": string | null,\n  "priority": "baixa" | "normal" | "alta" | null,\n  "source": "whatsapp",\n  "raw_message": string,\n  "external_reference": string | null,\n  "estimated_price": number | null,\n  "annotations": string | null // Informações extras como urgência, estado do aparelho, etc.\n}\n\n2) QUANDO HOUVER MÚLTIPLAS OPÇÕES DE PEÇAS/QUALIDADES (ex: "Original Nacional", "Importada", "Incell"), extraia TODAS elas no array "options".\n\nIMPORTANTE: Se a mensagem listar preços diferentes para qualidades diferentes (ex: "Importada 520", "Incel 330"), crie uma opção para cada uma.\n\n"options": [\n  {\n    "label": string,              // IMPORTANTE: Nome da qualidade/peça. Ex: "Original Nacional", "Original importada", "Incel". NÃO USE "Troca de tela" aqui, use a qualidade específica.\n    "warranty": string | null,    // Texto da garantia. Ex: "Garantia de 6 meses", "Garantia de 90 dias"\n    "price_card": number | null,  // Valor em reais no cartão (sem R$, só número). Ex: 920\n    "installments_card": number | null, // Quantidade de parcelas no cartão. Ex: 5\n    "price_cash": number | null,  // Valor à vista em reais (sem R$, só número). Ex: 850\n    "notes": string | null        // Qualquer detalhe específico dessa opção (ex: "até em 5x no cartão")\n  }\n]\n\nSe não houver múltiplas opções claras, use "options": [].\n\n3) Extraia também "extras" com informações gerais como brindes e busca/entrega:\n\n"extras": {\n  "freebies": string | null,    // Ex: "Pelicula 3d de brinde"\n  "delivery": string | null     // Ex: "Buscamos e entregamos"\n}\n`;

    const allowedNumbers: string[] = (activeConfig?.allowed_numbers ?? "")
      .split(",")
      .map((n: string) => n.trim())
      .filter((n: string) => n.length > 0);

    const allowedGroups = (activeConfig?.allowed_groups ?? "")
      .split(",")
      .map((g: string) => g.trim())
      .filter((g: string) => g.length > 0);

    let allowedGroupsFromKowalski: string[] = [];
    if (activeConfig?.owner_id) {
      try {
        const { data: kowalskiGroups, error: kowalskiError } = await supabase
          .from("kowalski_allowed_groups")
          .select("group_jid, is_active, kowalski_instances!inner(owner_id, is_active)")
          .eq("kowalski_instances.owner_id", activeConfig.owner_id)
          .eq("is_active", true);

        if (kowalskiError) {
          console.error("Erro ao carregar kowalski_allowed_groups:", kowalskiError);
        }

        allowedGroupsFromKowalski = (kowalskiGroups ?? [])
          .map((g: any) => (typeof g.group_jid === "string" ? g.group_jid.trim() : ""))
          .filter((g: string) => g.length > 0);
      } catch (e) {
        console.error("Exceção ao carregar kowalski_allowed_groups:", e);
      }
    }

    const normalizeGroupJid = (v: string) => v.trim().toLowerCase();
    const allowedGroupsAll = Array.from(
      new Set([...allowedGroups.map(normalizeGroupJid), ...allowedGroupsFromKowalski.map(normalizeGroupJid)]),
    );

    const sender = normalized.from;
    const chatId = normalized.chatId ?? "";
    const senderStripped = sender.replace(/@s\.whatsapp\.net$/i, "");

    const possibleGroupIds = [
      chatId,
      normalized.chatId,
      normalized.raw?.chatId,
      normalized.raw?.remoteJid,
      normalized.raw?.payload?.chatId,
      normalized.raw?.payload?.chat?.id,
      normalized.raw?.payload?.remoteJid,
      normalized.raw?.payload?.from,
      normalized.raw?.payload?.to,
      normalized.raw?.data?.chatId,
      normalized.raw?.data?.remoteJid,
      normalized.raw?.data?.key?.remoteJid,
      normalized.raw?.instance,
      normalized.raw?.session,
      normalized.raw?.sessionName,
      body?.chatId,
      body?.remoteJid,
      body?.payload?.chatId,
      body?.payload?.remoteJid,
    ]
      .flatMap((v) => {
        if (!v) return [];
        if (typeof v === "string") return [v];
        if (typeof v === "object" && v !== null) {
          if (typeof v._serialized === "string") return [v._serialized];
          if (typeof v.id === "string") return [v.id];
        }
        return [];
      })
      .filter((v): v is string => typeof v === "string" && v.length > 0);

    const possibleGroupIdsNormalized = Array.from(new Set(possibleGroupIds.map(normalizeGroupJid)));

    let allowed = false;
    const allowAllGroups = allowedGroupsAll.includes("*") || allowedGroupsAll.includes("all");

    const areGroupsEquivalent = (g1: string, g2: string) => {
      if (!g1 || !g2) return false;
      const n1 = g1.replace("@g.us", "").split("@")[0].trim();
      const n2 = g2.replace("@g.us", "").split("@")[0].trim();
      return n1 === n2;
    };

    if (!normalized.isGroup) {
      if (allowedNumbers.length === 0) {
        allowed = false;
      } else {
        allowed = allowedNumbers.some((num) => sender.includes(num) || senderStripped === num || num === "*");
      }
    } else {
      if (allowAllGroups) {
        console.log(`[WHATSAPP-DEBUG] Permitindo grupo ${chatId} devido ao modo 'Liberar Todos'`);
        allowed = true;
      } else if (allowedGroupsAll.length > 0) {
        allowed = allowedGroupsAll.some((allowedGroup) =>
          possibleGroupIdsNormalized.some((incomingGroup) => areGroupsEquivalent(allowedGroup, incomingGroup)),
        );
        if (allowed) {
          console.log(`[WHATSAPP-DEBUG] Grupo ${chatId} permitido pela lista manual`);
        } else {
          console.log(
            `[WHATSAPP-DEBUG] Grupo ${chatId} BLOQUEADO. IDs possíveis: ${possibleGroupIdsNormalized.join(", ")} | Permitidos: ${allowedGroupsAll.join(", ")}`,
          );
        }
      }
    }

    if (!allowed) {
      const blockedStatus = normalized.isGroup ? "blocked_group" : "not_allowed_sender";
      const blockedReason = normalized.isGroup ? "Group not in allowed list" : "1:1 chat not in allowed numbers list";

      try {
        await supabase.from("whatsapp_zapi_logs").insert({
          owner_id: activeConfig?.owner_id ?? null,
          from_phone: senderStripped || sender,
          chat_id: chatId || null,
          is_group: normalized.isGroup ?? false,
          raw_message: extractedText,
          ai_json: null,
          budget_id: null,
          status: blockedStatus,
          error_message: blockedReason,
        });
      } catch (logError) {
        console.error("Erro ao registrar log de bloqueio:", logError);
      }

      return new Response(JSON.stringify({ ok: false, reason: blockedStatus }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsedBudget: ParsedBudgetFromAi;

    try {
      parsedBudget = await callGeminiViaLovable(prompt);
    } catch (err) {
      console.error("Erro ao chamar IA para budget WhatsApp:", err);

      const ownerId = activeConfig?.owner_id ?? null;
      const senderPhoneClean = normalizePotentialCustomerPhone(normalized.from);

      const draftClientName = "Cliente WhatsApp";
      const draftClientPhone: string | null = senderPhoneClean;

      let draftBudgetId: string | null = null;

      if (ownerId) {
        try {
          const draftInsert: any = {
            device_model: "Não informado",
            device_type: "Smartphone",
            total_price: 0,
            cash_price: 0,
            installment_price: 0,
            installments: 1,
            warranty_months: 3,
            notes: "Falha na IA, revisar manualmente",
            client_id: null,
            client_name: draftClientName,
            client_phone: draftClientPhone,
            status: "pending",
            workflow_status: "pending",
            issue: extractedText.slice(0, 250),
            part_quality: null,
            owner_id: ownerId,
          };

          const { data: draftData, error: draftError } = await supabase
            .from("budgets")
            .insert(draftInsert)
            .select()
            .maybeSingle();

          if (draftError) {
            console.error("Erro ao criar orçamento rascunho após falha da IA:", draftError);
          } else if (draftData) {
            draftBudgetId = draftData.id;
          }
        } catch (draftInsertErr) {
          console.error("Exceção ao criar orçamento rascunho:", draftInsertErr);
        }
      }

      try {
        await supabase.from("whatsapp_zapi_logs").insert({
          owner_id: activeConfig?.owner_id ?? null,
          from_phone: senderPhoneClean || null,
          chat_id: chatId || null,
          is_group: normalized.isGroup ?? false,
          raw_message: extractedText,
          ai_json: null,
          budget_id: draftBudgetId,
          status: "ai_error_draft",
          error_message: err instanceof Error ? err.message : "Erro desconhecido ao chamar IA",
        });
      } catch (logError) {
        console.error("Erro ao registrar log ai_error_draft:", logError);
      }

      // Tentar avisar o usuário que houve um erro, mas o rascunho foi salvo
      if (draftBudgetId) {
        try {
          const errorMsg = "⚠️ Tive dificuldade para processar todos os detalhes, mas salvei um rascunho no sistema para você conferir! ✅";
          await sendWhatsAppResponse(normalized, errorMsg);
        } catch (sendErr) {
          console.error("Erro ao enviar mensagem de fallback:", sendErr);
        }
      }

      return new Response(
        JSON.stringify({
          ok: false,
          reason: "ai_error",
          draft_budget_id: draftBudgetId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const parsedCustomerName =
      parsedBudget.customer_name && parsedBudget.customer_name.trim()
        ? parsedBudget.customer_name.trim()
        : null;
    const aiPhoneClean = normalizePotentialCustomerPhone(parsedBudget.customer_phone ?? undefined);
    const senderPhoneClean = normalizePotentialCustomerPhone(normalized.from);
    const finalPhone = aiPhoneClean ?? senderPhoneClean;

    const deviceModel =
      parsedBudget.device && parsedBudget.device.trim() ? parsedBudget.device.trim() : "Não informado";

    const deviceType = "Smartphone";

    const serviceType =
      parsedBudget.service_type && parsedBudget.service_type.trim() ? parsedBudget.service_type.trim() : null;

    const detailsText =
      parsedBudget.details && parsedBudget.details.trim() ? parsedBudget.details.trim() : extractedText;

    const options = parsedBudget.options ?? [];
    const extras = parsedBudget.extras ?? null;

    let normalizedOptions = [...options];

    if (normalizedOptions.length === 1 && normalizedOptions[0]?.label) {
      const original = normalizedOptions[0];
      const rawLabel = original.label;
      const separators = ["/", ",", " e "];
      const hasMulti = separators.some((sep) => rawLabel.includes(sep));

      if (hasMulti) {
        const parts = rawLabel
          .split(/\/|,| e /i)
          .map((s) => s.trim())
          .filter(Boolean);

        if (parts.length > 1) {
          normalizedOptions = parts.map((lbl) => ({
            ...original,
            label: lbl,
          }));
        }
      }
    }

    normalizedOptions = normalizedOptions.filter(
      (opt) => opt.label || opt.price_cash != null || opt.price_card != null,
    );

    const mainOption = normalizedOptions[0] ?? null;

    const mainPriceReais =
      typeof mainOption?.price_cash === "number" && mainOption.price_cash > 0
        ? mainOption.price_cash
        : typeof mainOption?.price_card === "number" && mainOption.price_card > 0
          ? mainOption.price_card
          : typeof parsedBudget.estimated_price === "number" && !Number.isNaN(parsedBudget.estimated_price)
            ? parsedBudget.estimated_price
            : 0;

    const mainInstallments =
      typeof mainOption?.installments_card === "number" && mainOption.installments_card > 0
        ? mainOption.installments_card
        : 1;

    let mainWarrantyMonths: number | null = null;
    if (mainOption?.warranty) {
      mainWarrantyMonths = parseWarrantyString(mainOption.warranty);
    }

    if (mainWarrantyMonths === null || mainWarrantyMonths <= 0) {
      mainWarrantyMonths = 3;
    }

    let cashPriceCents = typeof mainOption?.price_cash === "number" ? Math.round(mainOption.price_cash * 100) : 0;
    let installmentPriceCents =
      typeof mainOption?.price_card === "number" ? Math.round(mainOption.price_card * 100) : 0;

    let totalPriceCents = Math.round(Math.max(0, mainPriceReais) * 100);

    if (totalPriceCents <= 0) {
      if (cashPriceCents > 0) {
        totalPriceCents = cashPriceCents;
      } else if (installmentPriceCents > 0) {
        totalPriceCents = installmentPriceCents;
      } else {
        totalPriceCents = 1;
      }
    }

    if (cashPriceCents <= 0) {
      cashPriceCents = totalPriceCents;
    }
    if (installmentPriceCents <= 0) {
      installmentPriceCents = totalPriceCents;
    }

    const summaryParts: string[] = [];
    if (serviceType) summaryParts.push(serviceType);
    if (detailsText && detailsText !== extractedText) summaryParts.push(detailsText);
    if (parsedBudget.device) summaryParts.push(parsedBudget.device);
    if (normalizedOptions.length > 0) {
      const mainLabels = normalizedOptions
        .slice(0, 2)
        .map((o) => o.label)
        .filter(Boolean)
        .join(" / ");
      if (mainLabels) summaryParts.push(mainLabels);
    }
    if (extras?.freebies) summaryParts.push(extras.freebies);
    if (extras?.delivery) summaryParts.push(extras.delivery);

    const notes = summaryParts.join(" | ").slice(0, 70);

    const ownerId = activeConfig?.owner_id ?? null;

    if (!ownerId) {
      await supabase.from("whatsapp_zapi_logs").insert({
        owner_id: null,
        from_phone: finalPhone || senderPhoneClean || null,
        chat_id: normalized.chatId || null,
        is_group: normalized.isGroup ?? false,
        raw_message: extractedText,
        ai_json: parsedBudget,
        budget_id: null,
        status: "missing_owner_config",
        error_message: "Nenhuma configuração ativa com owner_id válido foi encontrada",
      });

      return new Response(JSON.stringify({ ok: false, reason: "missing_owner_config" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let defaultValidityDays: number = 15;
    try {
      const { data: siteSettings } = await supabase
        .from("site_settings")
        .select("default_budget_validity_days")
        .maybeSingle();

      if (
        siteSettings &&
        typeof siteSettings.default_budget_validity_days === "number" &&
        !Number.isNaN(siteSettings.default_budget_validity_days)
      ) {
        defaultValidityDays = siteSettings.default_budget_validity_days;
      }
    } catch (settingsError) {
      console.error("Erro ao buscar site_settings.default_budget_validity_days:", settingsError);
    }

    const validityDays = Math.max(1, Math.min(365, defaultValidityDays));
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    const validUntilDate = new Date(baseDate.getTime() + validityDays * 24 * 60 * 60 * 1000);
    const validUntilStr = validUntilDate.toISOString().split("T")[0];

    let matchedClient: { id: string; name: string | null; phone: string | null } | null = null;
    if (finalPhone) {
      try {
        const { data: clientData } = await supabase
          .from("clients")
          .select("id, name, phone")
          .eq("user_id", ownerId)
          .eq("phone", finalPhone)
          .maybeSingle();

        if (clientData) {
          matchedClient = clientData as any;
        }
      } catch (clientError) {
        console.error("Erro ao buscar cliente pelo telefone do WhatsApp:", clientError);
      }
    }

    // Se não encontrou cliente pelo telefone, buscar cliente padrão do usuário
    if (!matchedClient) {
      try {
        const { data: defaultClient } = await supabaseClient
          .from("clients")
          .select("id, name, phone")
          .eq("user_id", ownerId)
          .eq("is_default", true)
          .maybeSingle();
        if (defaultClient) {
          matchedClient = defaultClient as any;
        }
      } catch (defaultClientError) {
        console.error("Erro ao buscar cliente padrão:", defaultClientError);
      }
    }

    const client_name = matchedClient?.name?.trim() || parsedCustomerName || "Cliente WhatsApp";
    const client_phone = finalPhone ?? matchedClient?.phone ?? null;

    const {
      includesDelivery,
      includesScreenProtector,
      customServices: customServicesRaw,
    } = buildCustomServicesFromExtras(extras);

    let customServices = customServicesRaw;
    if (customServices.length > 30) customServices = customServices.slice(0, 30);

    let headerPartQuality: string | null = serviceType ?? null;
    const firstLabel = normalizedOptions[0]?.label ?? null;
    if (firstLabel && !isServiceLikeLabel(firstLabel, serviceType)) {
      headerPartQuality = firstLabel;
    }

    const partsPayload =
      normalizedOptions && normalizedOptions.length > 0
        ? normalizedOptions.slice(0, 4).flatMap((opt) => {
            if (!opt.label && opt.price_cash == null && opt.price_card == null) {
              return [] as any[];
            }

            let warrantyMonths: number | null = null;
            if (opt.warranty) {
              warrantyMonths = parseWarrantyString(opt.warranty);
            }
            if (warrantyMonths === null || warrantyMonths <= 0) {
              warrantyMonths = 3;
            }

            const priceCashReais =
              typeof opt.price_cash === "number"
                ? opt.price_cash
                : typeof opt.price_card === "number"
                  ? opt.price_card
                  : 0;

            const priceCardReais =
              typeof opt.price_card === "number"
                ? opt.price_card
                : typeof opt.price_cash === "number"
                  ? opt.price_cash
                  : 0;

            const priceCashCents = Math.max(0, Math.round(priceCashReais * 100));
            const priceCardCents = Math.max(0, Math.round(priceCardReais * 100));

            const installmentCount = typeof opt.installments_card === "number" ? opt.installments_card : 0;

            let installmentPriceCents = priceCardCents;
            if (installmentCount > 1 && priceCardCents > 0) {
              installmentPriceCents = Math.round(priceCardCents / installmentCount);
            }

            let partLabel = opt.label || "Opção";
            if (isServiceLikeLabel(partLabel, serviceType)) {
              const textPool = [
                opt.warranty ?? "",
                opt.notes ?? "",
                parsedBudget.details ?? "",
                parsedBudget.device ?? "",
                notes,
              ]
                .join(" ")
                .toLowerCase();

              const knownQualities = [
                "original nacional",
                "original importada",
                "importada",
                "incel",
                "nacional",
                "paralela",
              ];

              const found = knownQualities.find((q) => textPool.includes(q));
              if (found) {
                partLabel = found
                  .split(" ")
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ");
              } else {
                partLabel = "Padrão";
              }
            }

            return [
              {
                name: partLabel,
                part_type: partLabel,
                quantity: 1,
                price: priceCashCents,
                cash_price: priceCashCents || null,
                installment_price: installmentPriceCents || null,
                installment_count: installmentCount,
                warranty_months: warrantyMonths,
              },
            ];
          })
        : [];

    const serviceLabel = serviceType || detailsText || "Serviço não especificado";

    const qualityLabel = headerPartQuality || "Padrão";

    const effectivePartsPayload =
      partsPayload.length > 0
        ? partsPayload
        : [
            {
              name: serviceLabel,
              part_type: qualityLabel,
              quantity: 1,
              price: cashPriceCents,
              cash_price: cashPriceCents || null,
              installment_price: installmentPriceCents || null,
              installment_count: mainInstallments ?? 0,
              warranty_months: mainWarrantyMonths ?? null,
            },
          ];

    const baseBudgetData: any = {
      device_model: deviceModel,
      device_type: deviceType,
      client_id: matchedClient?.id ?? null,
      client_name,
      client_phone,
      status: "pending",
      workflow_status: "pending",
      issue: serviceType ?? detailsText,
      owner_id: ownerId,
      includes_delivery: includesDelivery,
      includes_screen_protector: includesScreenProtector,
      custom_services: customServices || null,
      payment_condition: "Cartão de Crédito",
      valid_until: validUntilStr,
      expires_at: validUntilStr,
      notes: parsedBudget.annotations || null,
    };

    const createdBudgets: any[] = [];
    let createdCount = 0;
    let replacedCount = 0;
    const updateSummaries: string[] = [];

    const findBudgetToReplace = async (params: {
      ownerId: string;
      clientPhone: string | null;
      clientName: string | null;
      deviceModel: string;
      issue: string | null;
      partQuality: string;
      cashPrice: number;
      chatId: string | null;
    }): Promise<any | null> => {
      const { ownerId, clientPhone, clientName, deviceModel, partQuality, chatId } = params;

      // 1) Busca por phone + device + quality (quando phone disponível)
      if (clientPhone) {
        const { data: directMatch } = await supabase
          .from("budgets")
          .select("*")
          .eq("owner_id", ownerId)
          .eq("client_phone", clientPhone)
          .eq("device_model", deviceModel)
          .eq("part_quality", partQuality)
          .eq("workflow_status", "pending")
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (directMatch) return directMatch;
      }

      // 2) Busca por owner + device + quality + client_name (cobre grupos sem phone)
      if (clientName) {
        const { data: nameMatch } = await supabase
          .from("budgets")
          .select("*")
          .eq("owner_id", ownerId)
          .eq("client_name", clientName)
          .eq("device_model", deviceModel)
          .eq("part_quality", partQuality)
          .eq("workflow_status", "pending")
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (nameMatch) return nameMatch;
      }

      // 3) Busca ampla por owner + device + quality apenas (último recurso antes do chatId)
      {
        const { data: broadMatch } = await supabase
          .from("budgets")
          .select("*")
          .eq("owner_id", ownerId)
          .eq("device_model", deviceModel)
          .eq("part_quality", partQuality)
          .eq("workflow_status", "pending")
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (broadMatch) return broadMatch;
      }

      // 4) Fallback por chatId nos logs
      if (chatId) {
        const { data: lastLog } = await supabase
          .from("whatsapp_zapi_logs")
          .select("budget_id")
          .eq("owner_id", ownerId)
          .eq("chat_id", chatId)
          .not("budget_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastLog?.budget_id) {
          const { data: b } = await supabase
            .from("budgets")
            .select("*")
            .eq("id", lastLog.budget_id)
            .eq("owner_id", ownerId)
            .is("deleted_at", null)
            .maybeSingle();

          if (b && b.status === "pending" && (b.part_quality || "") === partQuality) {
            return b;
          }
        }
      }
      return null;
    };

    // Gera resumo breve das diferenças entre orçamento existente e novos dados
    const buildUpdateSummary = (existing: any, newData: any, newValidUntil: string): string => {
      const changes: string[] = [];
      const fmtR$ = (v: number) => `R$${(v / 100).toFixed(0)}`;

      if (existing.cash_price !== newData.cash_price && newData.cash_price)
        changes.push(`à vista ${fmtR$(existing.cash_price)}→${fmtR$(newData.cash_price)}`);
      else if (existing.total_price !== newData.total_price && newData.total_price)
        changes.push(`preço ${fmtR$(existing.total_price)}→${fmtR$(newData.total_price)}`);

      if (existing.issue !== newData.issue && newData.issue)
        changes.push("serviço atualizado");

      if (existing.warranty_months !== newData.warranty_months && newData.warranty_months)
        changes.push(`garantia ${newData.warranty_months}m`);

      const dtPart = newValidUntil.split("-");
      const dtFmt = dtPart.length === 3 ? `${dtPart[2]}/${dtPart[1]}` : newValidUntil;
      changes.push(`validade até ${dtFmt}`);

      return changes.join(", ").slice(0, 140);
    };

    for (const part of effectivePartsPayload) {
      const partQuality = part.part_type || headerPartQuality || "Padrão";
      const cashPriceForBudget = part.cash_price || cashPriceCents;

      const budgetInsertData: any = {
        ...baseBudgetData,
        total_price: part.price || totalPriceCents,
        cash_price: cashPriceForBudget,
        installment_price: part.installment_price || installmentPriceCents,
        installments: part.installment_count || mainInstallments,
        warranty_months: part.warranty_months || mainWarrantyMonths,
        part_quality: partQuality,
      };

      const existingBudget = await findBudgetToReplace({
        ownerId,
        clientPhone: client_phone ?? null,
        clientName: client_name ?? null,
        deviceModel,
        issue: budgetInsertData.issue ?? null,
        partQuality,
        cashPrice: cashPriceForBudget,
        chatId: normalized.chatId || null,
      });

      let budgetRow: any = null;

      if (existingBudget) {
        const summary = buildUpdateSummary(existingBudget, budgetInsertData, validUntilStr);
        updateSummaries.push(summary);
        const { data: updatedBudget } = await supabase
          .from("budgets")
          .update({ ...budgetInsertData, updated_at: new Date().toISOString() })
          .eq("id", existingBudget.id)
          .select()
          .maybeSingle();
        budgetRow = updatedBudget;
        await supabase
          .from("budget_parts")
          .update({ deleted_at: new Date().toISOString() })
          .eq("budget_id", budgetRow.id);
        replacedCount++;
      } else {
        const { data: insertedBudget } = await supabase.from("budgets").insert(budgetInsertData).select().maybeSingle();
        budgetRow = insertedBudget;
        createdCount++;
      }

      if (budgetRow) {
        // --- VERIFICAÇÃO PREVENTIVA DE PROPRIEDADE ---
        if (budgetRow.owner_id && budgetRow.owner_id !== ownerId) {
          console.warn(`[RECOVERY-PREEMPTIVE] Orçamento ${budgetRow.id} pertence a ${budgetRow.owner_id}, mas estamos operando como ${ownerId}. Criando novo.`);
          // Força a criação de um novo orçamento
          const { data: forcedBudget } = await supabase.from("budgets").insert(budgetInsertData).select().maybeSingle();
          if (forcedBudget) {
            budgetRow = forcedBudget;
            createdCount++; // Incrementa pois criamos um novo
            // Se tinhamos incrementado replacedCount antes, deveríamos decrementar, mas como é log, não é crítico.
          } else {
             console.error("[RECOVERY-PREEMPTIVE] Falha ao criar orçamento forçado.");
             // Deixa cair no erro da RPC abaixo
          }
        }

        const { error: partsInsertError } = await supabase.rpc("insert_budget_parts_from_whatsapp", {
          owner_id: ownerId,
          budget_id: budgetRow.id,
          parts: [part],
        });

        if (partsInsertError) {
          console.error("Erro ao inserir peças via RPC:", partsInsertError, "BudgetID:", budgetRow.id, "OwnerID esperado:", ownerId);

          // --- RECUPERAÇÃO DE ERRO DE PROPRIEDADE ---
          // Se o orçamento pertencer a outro usuário (mesmo que o filtro tenha falhado ou dados estejam inconsistentes),
          // criamos um NOVO orçamento forçadamente para garantir que o fluxo não pare.
          // ALTERAÇÃO: Verificação mais genérica para qualquer erro de permissão ou violação
          const errUpper = (partsInsertError.message || "").toUpperCase();
          const isPermissionError = errUpper.includes("NÃO É POSSÍVEL ADICIONAR PARTES") || 
                                    errUpper.includes("RLS") || 
                                    errUpper.includes("POLICY") ||
                                    errUpper.includes("PERMISSION") ||
                                    errUpper.includes("OWNER");

          if (isPermissionError) {
            console.warn(`[RECOVERY] Conflito de dono detectado no orçamento ${budgetRow.id}. Criando novo orçamento para owner ${ownerId}.`);

            const { data: recoveryBudget, error: recoveryInsertError } = await supabase
              .from("budgets")
              .insert(budgetInsertData)
              .select()
              .maybeSingle();

            if (recoveryBudget) {
              const { error: recoveryRpcError } = await supabase.rpc("insert_budget_parts_from_whatsapp", {
                owner_id: ownerId,
                budget_id: recoveryBudget.id,
                parts: [part],
              });

              if (!recoveryRpcError) {
                console.log(`[RECOVERY] Sucesso! Novo orçamento criado: ${recoveryBudget.id}`);
                createdBudgets.push(recoveryBudget);

                await supabase.from("whatsapp_zapi_logs").insert({
                  owner_id: ownerId,
                  from_phone: finalPhone || senderPhoneClean || null,
                  chat_id: normalized.chatId || null,
                  is_group: normalized.isGroup ?? false,
                  raw_message: extractedText,
                  ai_json: parsedBudget,
                  budget_id: recoveryBudget.id,
                  status: "budget_created_recovery",
                  error_message: "Recuperado automaticamente de conflito de dono (criado novo orçamento)",
                });
                continue; // Sucesso, vai para a próxima peça
              } else {
                console.error("[RECOVERY] Falha também na recuperação:", recoveryRpcError);
              }
            } else {
              console.error("[RECOVERY] Falha ao criar orçamento de recuperação:", recoveryInsertError);
            }
          }
          // -------------------------------------------

          await supabase.from("whatsapp_zapi_logs").insert({
            owner_id: ownerId,
            from_phone: finalPhone || senderPhoneClean || null,
            chat_id: normalized.chatId || null,
            is_group: normalized.isGroup ?? false,
            raw_message: extractedText,
            ai_json: parsedBudget,
            budget_id: budgetRow.id,
            status: "parts_insert_failed",
            error_message: partsInsertError.message,
          });
          continue;
        }

        createdBudgets.push(budgetRow);
        await supabase.from("whatsapp_zapi_logs").insert({
          owner_id: ownerId,
          from_phone: finalPhone || senderPhoneClean || null,
          chat_id: normalized.chatId || null,
          is_group: normalized.isGroup ?? false,
          raw_message: extractedText,
          ai_json: parsedBudget,
          budget_id: budgetRow.id,
          status: existingBudget ? "budget_replaced" : "budget_created",
          error_message: "Peças inseridas com sucesso via RPC",
        });
      }
    }

    if (createdBudgets.length > 0) {
      let successMessage: string;
      if (replacedCount > 0 && updateSummaries.length > 0) {
        successMessage = getBudgetUpdateConfirmation(updateSummaries[0]);
      } else {
        successMessage = getBudgetGroupConfirmation({
          budgetCount: createdBudgets.length,
          deviceModel,
        });
      }
      const replyResult = await sendWhatsAppResponse(normalized, successMessage);

      await supabase.from("whatsapp_zapi_logs").insert({
        owner_id: ownerId,
        from_phone: finalPhone || senderPhoneClean || null,
        chat_id: normalized.chatId || null,
        is_group: normalized.isGroup ?? false,
        raw_message: extractedText,
        ai_json: parsedBudget,
        budget_id: createdBudgets[createdBudgets.length - 1]?.id ?? null,
        status: replyResult.ok ? "reply_sent" : "reply_failed",
        error_message: replyResult.ok
          ? `Confirmação enviada via ${replyResult.provider} para ${replyResult.sent_to}`
          : `Falha no envio da confirmação: ${replyResult.reason}`,
      });
    }

    return new Response(JSON.stringify({ ok: true, budgets: createdBudgets }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const err = error as any;
    console.error("Erro na função whatsapp-zapi-orcamentos:", err);

    // Tentar logar o erro final no banco para sabermos o que houve
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const errorSupabase = createClient(supabaseUrl, serviceRoleKey);
      await errorSupabase.from("whatsapp_zapi_logs").insert({
        status: "critical_error",
        error_message: `ERRO FATAL: ${err?.message || "Erro desconhecido"}. Stack: ${err?.stack?.substring(0, 500)}`,
      });
    } catch (e) {
      console.error("Não foi possível logar o erro crítico:", e);
    }

    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

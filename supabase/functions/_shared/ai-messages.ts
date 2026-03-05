/**
 * Utilitário para gerar mensagens aleatórias de sucesso da IA (Edge Functions)
 */

const aiMessages = [
  "Orçamento pronto! ✨",
  "Tudo certo! Gerado. 🚀",
  "Prontinho! Criado. ✅",
  "Feito! Orçamento salvo. 📋",
  "Gerado! Mande ao cliente. 📲",
  "Sucesso! Salvo na lista. 📋",
  "Tudo pronto! 🎯",
  "Criado! Vamos lucrar? 💸",
  "Finalizado! Disponível. ✨",
  "Concluído! Sucesso. ✅",
  "Mãos à obra! Criado. 🛠️",
  "Perfeito! Salvo. ✅",
  "No sistema! Tudo ok. 👍",
  "Pronto! Gerado. ⚡",
  "Tudo salvo! Pronto. ✅",
];

export const getRandomAiSuccessMessage = () => {
  const randomIndex = Math.floor(Math.random() * aiMessages.length);
  return aiMessages[randomIndex];
};

const sanitizeDeviceLabel = (deviceModel?: string | null) => {
  if (!deviceModel) return null;
  const cleaned = deviceModel.replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.toLowerCase() === "não informado") return null;
  return cleaned.length > 24 ? `${cleaned.slice(0, 24).trim()}…` : cleaned;
};

export const getBudgetGroupConfirmation = (
  context: { budgetCount?: number; deviceModel?: string | null } = {},
) => {
  const budgetCount = Math.max(1, context.budgetCount ?? 1);
  const deviceLabel = sanitizeDeviceLabel(context.deviceModel);
  const budgetLabel = budgetCount > 1 ? `${budgetCount} opções` : "seu orçamento";

  const variants = [
    deviceLabel ? `Prontinho! ${deviceLabel} salvo. ✅` : `Prontinho! Registrei ${budgetLabel}. ✅`,
    deviceLabel ? `Fechado! ${deviceLabel} entrou no sistema. 📋` : `Fechado! Já deixei ${budgetLabel} salvo. 📋`,
    budgetCount > 1 ? `Tudo certo! Registrei ${budgetCount} opções. ✨` : `Tudo certo! Já ficou salvo aqui. ✨`,
    "Perfeito! Já registrei por aqui. 🚀",
    "Confirmado! Já deixei salvo. ✅",
  ];

  return variants[Math.floor(Math.random() * variants.length)];
};

/**
 * Utilitário para gerar mensagens aleatórias de sucesso da IA
 * Restrição: Máximo de 45 caracteres
 */

const aiMessages = [
  "Orçamento pronto! Ficou perfeito. ✨",
  "Tudo certo! Orçamento gerado. 🚀",
  "Prontinho! Orçamento criado com sucesso.",
  "Feito! Mais um orçamento finalizado. ✅",
  "Orçamento gerado! Mande para o cliente. 📲",
  "Sucesso! Orçamento salvo na lista. 📋",
  "Tudo pronto! Orçamento finalizado. 🎯",
  "Orçamento criado! Vamos lucrar? 💸",
  "Finalizado! Orçamento está disponível. ✨",
  "Concluído! Orçamento gerado com sucesso.",
  "Mãos à obra! Orçamento criado. 🛠️",
  "Perfeito! Orçamento salvo com sucesso.",
  "Orçamento no sistema! Tudo ok. 👍",
  "Pronto! Orçamento gerado rapidinho. ⚡",
  "Tudo salvo! Orçamento pronto para envio."
];

/**
 * Retorna uma mensagem aleatória da IA com menos de 45 caracteres
 */
export const getRandomAiSuccessMessage = () => {
  const randomIndex = Math.floor(Math.random() * aiMessages.length);
  return aiMessages[randomIndex];
};

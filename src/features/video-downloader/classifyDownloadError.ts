export type ClassifiedDownloadError = {
  title: string;
  userMessage: string;
  technicalDetails?: string;
  suggestedActions?: string[];
  isLikelyShortTikTokUrl?: boolean;
};

const includesAny = (haystack: string, needles: string[]) =>
  needles.some((n) => haystack.includes(n));

export function classifyDownloadError(params: {
  rawMessage: string;
  url?: string;
}): ClassifiedDownloadError {
  const raw = String(params.rawMessage ?? "");
  const msg = raw.toLowerCase();
  const url = (params.url ?? "").trim();

  const isShortTikTok = /^(https?:\/\/)?(vm|vt)\.tiktok\.com\//i.test(url);

  // TikTok: vídeo indisponível / privado / restrito
  if (msg.includes("[tiktok]") && includesAny(msg, ["status code 10231", "video not available"])) {
    return {
      title: "Vídeo indisponível no TikTok",
      userMessage:
        "Esse vídeo pode ter sido removido, estar privado, restrito por região, ou exigir login para assistir.",
      technicalDetails: raw,
      suggestedActions: [
        "Abra o link no TikTok e confirme se o vídeo carrega",
        "Cole o link completo (www.tiktok.com/...) em vez de link encurtado",
        "Tente outro vídeo/link",
      ],
      isLikelyShortTikTokUrl: isShortTikTok,
    };
  }

  // TikTok: impersonation/dependências no servidor
  if (msg.includes("[tiktok]") && msg.includes("impersonation")) {
    return {
      title: "Limitação temporária do TikTok",
      userMessage:
        "O TikTok está exigindo um modo extra de acesso no servidor de download. Isso pode falhar até ajustarmos o servidor.",
      technicalDetails: raw,
      suggestedActions: ["Tente novamente em alguns minutos", "Tente outro vídeo/link"],
      isLikelyShortTikTokUrl: isShortTikTok,
    };
  }

  // Rate limiting
  if (includesAny(msg, ["429", "too many requests"])) {
    return {
      title: "Muitas tentativas",
      userMessage: "Fizemos muitas tentativas em pouco tempo. Aguarde um pouco e tente novamente.",
      technicalDetails: raw,
      suggestedActions: ["Aguardar 1–2 minutos e tentar novamente"],
      isLikelyShortTikTokUrl: isShortTikTok,
    };
  }

  // Rede/timeout
  if (includesAny(msg, ["failed to fetch", "timed out", "timeout", "err_connection_timed_out"])) {
    return {
      title: "Servidor indisponível",
      userMessage: "Não conseguimos acessar o servidor de download agora. Tente novamente em instantes.",
      technicalDetails: raw,
      suggestedActions: ["Tentar novamente", "Verificar sua conexão"],
      isLikelyShortTikTokUrl: isShortTikTok,
    };
  }

  return {
    title: "Não foi possível baixar",
    userMessage:
      "Não foi possível processar esse link agora. Tente novamente, altere formato/qualidade, ou use outro link.",
    technicalDetails: raw,
    suggestedActions: ["Tentar novamente", "Tentar outro formato/qualidade"],
    isLikelyShortTikTokUrl: isShortTikTok,
  };
}

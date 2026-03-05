export interface EvolutionConfigSources {
  userApiUrl?: string | null;
  userApiKey?: string | null;
  globalApiUrl?: string | null;
  globalApiKey?: string | null;
}

function cleanSecret(value?: string | null, isUrl = false): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  if (!normalized) return null;

  return isUrl ? normalized.replace(/\/$/, "") : normalized;
}

export function resolveEvolutionConfig(sources: EvolutionConfigSources) {
  const secretUrl = cleanSecret(Deno.env.get("KUKY_EVO_URL"), true);
  const secretKey = cleanSecret(Deno.env.get("KUKY_EVO_KEY")) ?? cleanSecret(Deno.env.get("EVOLUTION_API_KEY"));

  const apiUrl =
    cleanSecret(sources.userApiUrl, true) ??
    secretUrl ??
    cleanSecret(sources.globalApiUrl, true) ??
    "";

  const apiKeys = Array.from(
    new Set(
      [
        cleanSecret(sources.userApiKey),
        secretKey,
        cleanSecret(sources.globalApiKey),
      ].filter((value): value is string => Boolean(value))
    )
  );

  return {
    apiUrl,
    apiKey: apiKeys[0] ?? null,
    apiKeys,
  };
}

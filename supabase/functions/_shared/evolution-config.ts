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

  if (isUrl) {
    let url = normalized.replace(/\/$/, "");
    // Evolution GO: /manager is the web UI, not the API root.
    // Strip it so we hit the correct REST endpoints.
    url = url.replace(/\/manager\/?$/, "");
    // Also strip common non-API suffixes
    url = url.replace(/\/swagger(\/.*)?$/, "");
    url = url.replace(/\/$/, "");
    return url;
  }

  return normalized;
}

export function resolveEvolutionConfig(sources: EvolutionConfigSources) {
  const secretUrl = cleanSecret(Deno.env.get("KUKY_EVO_URL"), true);
  const secretKey = cleanSecret(Deno.env.get("KUKY_EVO_KEY")) ?? cleanSecret(Deno.env.get("EVOLUTION_API_KEY"));

  const apiUrl =
    secretUrl ??
    cleanSecret(sources.userApiUrl, true) ??
    cleanSecret(sources.globalApiUrl, true) ??
    "";

  const apiKeys = Array.from(
    new Set(
      [
        secretKey,
        cleanSecret(sources.userApiKey),
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

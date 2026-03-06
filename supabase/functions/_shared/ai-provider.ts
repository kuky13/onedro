import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AIConfig {
  provider: string;
  model: string;
  apiKey: string | null;
  error?: string;
}

export interface AICallOptions {
  messages: Array<{ role: string; content: string }>;
  tools?: any[];
  tool_choice?: any;
  temperature?: number;
  max_tokens?: number;
}

export interface AILogEntry {
  provider: string;
  model: string;
  source: string;
  input_tokens?: number;
  output_tokens?: number;
  duration_ms?: number;
  status: 'success' | 'error';
  error_message?: string;
  user_id?: string;
  metadata?: Record<string, any>;
}

/**
 * Get AI configuration from drippy_settings + api_keys tables.
 * Returns provider, model, and API key to use.
 */
export async function getAIConfig(supabase?: any): Promise<AIConfig> {
  try {
    const client = supabase || createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: settings } = await client
      .from('drippy_settings')
      .select('*')
      .single();

    if (!settings) {
      return {
        provider: 'lovable',
        model: 'google/gemini-3-flash-preview',
        apiKey: Deno.env.get("LOVABLE_API_KEY") || null,
      };
    }

    const { active_provider, active_model } = settings;

    if (active_provider === 'lovable') {
      return {
        provider: active_provider,
        model: active_model,
        apiKey: Deno.env.get("LOVABLE_API_KEY") || null,
      };
    }

    // Map provider to possible api_keys service_name aliases
    const serviceNamesMap: Record<string, string[]> = {
      claude: ['claude', 'anthropic'],
      deepseek: ['deepseek'],
      gemini: ['gemini'],
      openai: ['openai'],
    };

    const serviceNames = serviceNamesMap[active_provider] || [active_provider];

    const { data: keyRows, error: keyError } = await client
      .from('api_keys')
      .select('api_key, updated_at')
      .in('service_name', serviceNames)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (keyError) {
      console.error('[AI-PROVIDER] Error fetching API key:', keyError);
    }

    const apiKey = keyRows?.[0]?.api_key ?? null;

    if (!apiKey) {
      return {
        provider: active_provider,
        model: active_model,
        apiKey: null,
        error: `API Key não configurada para ${active_provider}`,
      };
    }

    return {
      provider: active_provider,
      model: active_model,
      apiKey,
    };
  } catch (error) {
    console.error('[AI-PROVIDER] Error getting config:', error);
    return {
      provider: 'lovable',
      model: 'google/gemini-3-flash-preview',
      apiKey: Deno.env.get("LOVABLE_API_KEY") || null,
      error: 'Fallback to Lovable AI',
    };
  }
}

/**
 * Call AI with the given config and messages.
 * Supports: lovable, claude, deepseek, gemini
 */
export async function callAIProvider(
  config: AIConfig,
  options: AICallOptions
): Promise<{ content: string; usage?: { input_tokens?: number; output_tokens?: number } }> {
  const { provider, model, apiKey } = config;

  if (!apiKey) {
    throw new Error(`API Key não disponível para ${provider}`);
  }

  let endpoint = "";
  let headers: Record<string, string> = {};
  let requestBody: any = {};

  switch (provider) {
    case "lovable":
      endpoint = "https://ai.gateway.lovable.dev/v1/chat/completions";
      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      };
      requestBody = {
        model,
        messages: options.messages,
        ...(options.tools ? { tools: options.tools, tool_choice: options.tool_choice || "auto" } : {}),
        ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
        ...(options.max_tokens !== undefined ? { max_tokens: options.max_tokens } : {}),
      };
      break;

    case "claude":
      endpoint = "https://api.anthropic.com/v1/messages";
      headers = {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      };

      // Claude uses a different message format - system is separate
      const systemMessages = options.messages.filter(m => m.role === "system");
      const nonSystemMessages = options.messages.filter(m => m.role !== "system");
      
      // Map tool messages to assistant for Claude compatibility
      const claudeMessages = nonSystemMessages.map(m => {
        if (m.role === "tool") {
          return { role: "user" as const, content: m.content };
        }
        return { role: m.role as "user" | "assistant", content: m.content };
      });

      requestBody = {
        model,
        system: systemMessages.map(m => m.content).join("\n\n"),
        messages: claudeMessages,
        max_tokens: options.max_tokens || 4096,
        ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      };
      break;

    case "deepseek":
      endpoint = "https://api.deepseek.com/v1/chat/completions";
      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      };
      requestBody = {
        model,
        messages: options.messages,
        ...(options.tools ? { tools: options.tools, tool_choice: options.tool_choice || "auto" } : {}),
        ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
        ...(options.max_tokens !== undefined ? { max_tokens: options.max_tokens } : {}),
      };
      break;

    case "gemini": {
      const safeModel = model.startsWith("gemini-") ? model : "gemini-2.5-flash";
      endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${safeModel}:generateContent?key=${apiKey}`;
      headers = { "Content-Type": "application/json" };

      const geminiContents = options.messages
        .filter(m => m.role === "user" || m.role === "assistant")
        .map(m => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }],
        }));

      requestBody = {
        contents: geminiContents,
        systemInstruction: {
          parts: [{
            text: options.messages
              .filter(m => m.role === "system")
              .map(m => m.content)
              .join("\n\n"),
          }],
        },
      };
      break;
    }

    default:
      throw new Error(`Provider ${provider} não suportado`);
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[AI-PROVIDER] ${provider} error:`, response.status, errorText);
    throw new Error(`${provider} API error: ${response.status}`);
  }

  const data = await response.json();

  // Parse response based on provider
  if (provider === "claude") {
    const content = data.content?.[0]?.text || "";
    return {
      content,
      usage: {
        input_tokens: data.usage?.input_tokens,
        output_tokens: data.usage?.output_tokens,
      },
    };
  } else if (provider === "gemini") {
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return {
      content,
      usage: {
        input_tokens: data.usageMetadata?.promptTokenCount,
        output_tokens: data.usageMetadata?.candidatesTokenCount,
      },
    };
  } else {
    // OpenAI-compatible (lovable, deepseek)
    const choice = data.choices?.[0];
    
    // Handle tool calls - return raw for caller to process
    if (choice?.message?.tool_calls) {
      return {
        content: JSON.stringify({ tool_calls: choice.message.tool_calls, message: choice.message }),
        usage: {
          input_tokens: data.usage?.prompt_tokens,
          output_tokens: data.usage?.completion_tokens,
        },
      };
    }

    return {
      content: choice?.message?.content || "",
      usage: {
        input_tokens: data.usage?.prompt_tokens,
        output_tokens: data.usage?.completion_tokens,
      },
    };
  }
}

/**
 * Log an AI request to the ai_request_logs table
 */
export async function logAIRequest(entry: AILogEntry, supabase?: any): Promise<void> {
  try {
    const client = supabase || createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await client.from('ai_request_logs').insert({
      provider: entry.provider,
      model: entry.model,
      source: entry.source,
      input_tokens: entry.input_tokens || null,
      output_tokens: entry.output_tokens || null,
      duration_ms: entry.duration_ms || null,
      status: entry.status,
      error_message: entry.error_message || null,
      user_id: entry.user_id || null,
      metadata: entry.metadata || {},
    });
  } catch (error) {
    console.warn('[AI-PROVIDER] Failed to log AI request:', error);
  }
}

/**
 * High-level helper: get config, call AI, log the request
 */
export async function callAIWithLogging(
  options: AICallOptions & { source: string; userId?: string },
  supabase?: any,
  configOverride?: AIConfig
): Promise<{ content: string; config: AIConfig; usage?: any }> {
  const config = configOverride || await getAIConfig(supabase);
  
  if (!config.apiKey) {
    throw new Error(config.error || `API Key não configurada para ${config.provider}`);
  }

  const startTime = Date.now();
  let result: { content: string; usage?: any };
  
  try {
    result = await callAIProvider(config, options);
    const duration = Date.now() - startTime;

    // Log success
    await logAIRequest({
      provider: config.provider,
      model: config.model,
      source: options.source,
      input_tokens: result.usage?.input_tokens,
      output_tokens: result.usage?.output_tokens,
      duration_ms: duration,
      status: 'success',
      user_id: options.userId,
    }, supabase);

    return { content: result.content, config, usage: result.usage };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log error
    await logAIRequest({
      provider: config.provider,
      model: config.model,
      source: options.source,
      duration_ms: duration,
      status: 'error',
      error_message: error instanceof Error ? error.message : String(error),
      user_id: options.userId,
    }, supabase);

    throw error;
  }
}

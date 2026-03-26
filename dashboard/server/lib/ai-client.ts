// ── Shared AI Client ──
// Priority: MOONSHOT_API_KEY → ANTHROPIC_API_KEY (via OpenAI-compat)
// Both providers use the OpenAI SDK format.

import OpenAI from "openai";

interface ProviderConfig {
  apiKey: string;
  baseURL: string;
  defaultModel: string;
  longModel: string;
  name: string;
}

function getProviderConfig(): ProviderConfig {
  // 1. Moonshot (Kimi)
  if (process.env.MOONSHOT_API_KEY) {
    return {
      apiKey: process.env.MOONSHOT_API_KEY,
      baseURL: "https://api.moonshot.cn/v1",
      defaultModel: "moonshot-v1-8k",
      longModel: "moonshot-v1-32k",
      name: "Moonshot",
    };
  }

  // 2. Anthropic via OpenAI-compatible Messages API
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: "https://api.anthropic.com/v1/",
      defaultModel: "claude-sonnet-4-20250514",
      longModel: "claude-sonnet-4-20250514",
      name: "Anthropic",
    };
  }

  throw new Error(
    "No AI provider configured. Set MOONSHOT_API_KEY or ANTHROPIC_API_KEY in .env"
  );
}

let _cachedConfig: ProviderConfig | null = null;
function config(): ProviderConfig {
  if (!_cachedConfig) _cachedConfig = getProviderConfig();
  return _cachedConfig;
}

export function getAIClient(): OpenAI {
  const cfg = config();

  if (cfg.name === "Anthropic") {
    // Use Anthropic SDK directly since their OpenAI compat layer has quirks
    return new OpenAI({
      apiKey: cfg.apiKey,
      baseURL: cfg.baseURL,
      defaultHeaders: {
        "anthropic-version": "2023-06-01",
        "x-api-key": cfg.apiKey,
      },
    });
  }

  return new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL,
  });
}

export function getModel(long = false): string {
  const cfg = config();
  return long ? cfg.longModel : cfg.defaultModel;
}

export function getProviderName(): string {
  return config().name;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Simple completion — send messages, get text back.
 * For Anthropic, uses the native SDK for reliability.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: { model?: string; maxTokens?: number; temperature?: number }
): Promise<string> {
  const cfg = config();

  if (cfg.name === "Anthropic") {
    // Use Anthropic native SDK for better compatibility
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: cfg.apiKey });

    // Separate system message
    const systemMsg = messages.find(m => m.role === "system")?.content ?? "";
    const chatMsgs = messages
      .filter(m => m.role !== "system")
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    const response = await client.messages.create({
      model: options?.model ?? cfg.defaultModel,
      max_tokens: options?.maxTokens ?? 4096,
      system: systemMsg || undefined,
      messages: chatMsgs,
    });

    return response.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map(b => b.text)
      .join("");
  }

  // OpenAI-compatible path (Moonshot, etc.)
  const client = getAIClient();
  const response = await client.chat.completions.create({
    model: options?.model ?? cfg.defaultModel,
    max_tokens: options?.maxTokens ?? 4096,
    temperature: options?.temperature ?? 0.7,
    messages,
  });
  return response.choices[0]?.message?.content ?? "";
}

/**
 * Tool-calling loop.
 * Uses native Anthropic SDK for Anthropic, OpenAI SDK for others.
 */
export async function chatWithTools(
  messages: ChatMessage[],
  tools: OpenAI.ChatCompletionTool[],
  executeTool: (name: string, args: Record<string, unknown>) => Promise<string>,
  options?: {
    model?: string;
    maxTokens?: number;
    maxIterations?: number;
    onToolCall?: (name: string) => void;
  }
): Promise<string> {
  const cfg = config();

  if (cfg.name === "Anthropic") {
    return chatWithToolsAnthropic(messages, tools, executeTool, options);
  }

  return chatWithToolsOpenAI(messages, tools, executeTool, options);
}

// ── Anthropic native tool calling ──
async function chatWithToolsAnthropic(
  messages: ChatMessage[],
  tools: OpenAI.ChatCompletionTool[],
  executeTool: (name: string, args: Record<string, unknown>) => Promise<string>,
  options?: {
    model?: string;
    maxTokens?: number;
    maxIterations?: number;
    onToolCall?: (name: string) => void;
  }
): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: config().apiKey });
  const maxIter = options?.maxIterations ?? 10;

  // Convert OpenAI tools to Anthropic format
  const anthropicTools: any[] = tools.map(t => ({
    name: t.function.name,
    description: t.function.description || "",
    input_schema: t.function.parameters || { type: "object", properties: {}, required: [] },
  }));

  // Separate system message
  const systemMsg = messages.find(m => m.role === "system")?.content ?? "";
  let anthropicMessages: any[] = messages
    .filter(m => m.role !== "system")
    .map(m => ({ role: m.role, content: m.content }));

  for (let i = 0; i < maxIter; i++) {
    const response = await client.messages.create({
      model: options?.model ?? config().defaultModel,
      max_tokens: options?.maxTokens ?? 4096,
      system: systemMsg || undefined,
      tools: anthropicTools.length > 0 ? anthropicTools : undefined,
      messages: anthropicMessages,
    });

    const toolUses = response.content.filter((b: any) => b.type === "tool_use");

    if (toolUses.length > 0) {
      const toolResults: any[] = [];
      for (const tu of toolUses as any[]) {
        options?.onToolCall?.(tu.name);
        const result = await executeTool(tu.name, tu.input || {});
        toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: result });
      }

      anthropicMessages = [
        ...anthropicMessages,
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ];
      continue;
    }

    // No tool calls — return text
    return response.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("");
  }

  return "";
}

// ── OpenAI-compatible tool calling (Moonshot, etc.) ──
async function chatWithToolsOpenAI(
  messages: ChatMessage[],
  tools: OpenAI.ChatCompletionTool[],
  executeTool: (name: string, args: Record<string, unknown>) => Promise<string>,
  options?: {
    model?: string;
    maxTokens?: number;
    maxIterations?: number;
    onToolCall?: (name: string) => void;
  }
): Promise<string> {
  const client = getAIClient();
  const maxIter = options?.maxIterations ?? 10;
  let currentMessages: OpenAI.ChatCompletionMessageParam[] = [...messages];

  for (let i = 0; i < maxIter; i++) {
    const response = await client.chat.completions.create({
      model: options?.model ?? config().defaultModel,
      max_tokens: options?.maxTokens ?? 4096,
      messages: currentMessages,
      tools: tools.length > 0 ? tools : undefined,
    });

    const choice = response.choices[0];
    if (!choice) break;

    const msg = choice.message;

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      currentMessages.push(msg);

      for (const tc of msg.tool_calls) {
        options?.onToolCall?.(tc.function.name);
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}");
        } catch {}

        const result = await executeTool(tc.function.name, args);
        currentMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        });
      }
      continue;
    }

    return msg.content ?? "";
  }

  return "";
}

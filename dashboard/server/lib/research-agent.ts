import * as cheerio from "cheerio";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db.js";
import { logActivity } from "./activity.js";

interface ResearchConfig {
  id: number;
  type: string;
  name: string;
  url: string;
  description: string;
  enabled: number;
}

interface ProgressCallback {
  (event: { phase: string; detail?: string }): void;
}

// ── DuckDuckGo search ──

async function searchDuckDuckGo(
  query: string
): Promise<{ url: string; title: string; snippet: string }[]> {
  const encoded = encodeURIComponent(query);
  const ddgUrl = `https://html.duckduckgo.com/html/?q=${encoded}`;

  const res = await fetch(ddgUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`DuckDuckGo error: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const results: { url: string; title: string; snippet: string }[] = [];
  $(".result").each((_i, el) => {
    const $el = $(el);
    const link = $el.find(".result__a");
    const snippetEl = $el.find(".result__snippet");
    let href = link.attr("href") || "";

    // DuckDuckGo wraps URLs in redirects
    if (href.includes("uddg=")) {
      try {
        const parsed = new URL(href, "https://duckduckgo.com");
        href = parsed.searchParams.get("uddg") || href;
      } catch {}
    }

    if (href && href.startsWith("http")) {
      results.push({
        url: href,
        title: link.text().trim(),
        snippet: snippetEl.text().trim(),
      });
    }
  });

  return results.slice(0, 10);
}

// ── Tool definitions (Anthropic native format) ──

const tools: Anthropic.Tool[] = [
  {
    name: "search_web",
    description:
      "Busca en la web usando DuckDuckGo. Devuelve títulos, URLs y snippets.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "La consulta de búsqueda",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "save_finding",
    description: "Guarda un hallazgo de investigación en la base de datos.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Título del hallazgo" },
        summary: {
          type: "string",
          description: "Resumen corto (1-2 oraciones)",
        },
        content: {
          type: "string",
          description: "Contenido completo / análisis",
        },
        tags: { type: "string", description: "Tags separados por coma" },
        category: {
          type: "string",
          enum: [
            "competencia",
            "tendencia",
            "mercado",
            "producto",
            "general",
          ],
          description: "Categoría del hallazgo",
        },
        source_url: { type: "string", description: "URL fuente" },
        brand_name: {
          type: "string",
          description: "Marca o competidor analizado",
        },
      },
      required: ["title", "summary", "category"],
    },
  },
];

// ── Research Agent ──

export async function runResearchAgent(
  onProgress: ProgressCallback,
  options?: { configIds?: number[] }
): Promise<{ count: number; titles: string[] }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = "claude-sonnet-4-20250514";

  // Load research configs
  let configs: ResearchConfig[];
  if (options?.configIds?.length) {
    const placeholders = options.configIds.map(() => "?").join(",");
    configs = db
      .prepare(
        `SELECT * FROM research_config WHERE id IN (${placeholders}) AND enabled = 1`
      )
      .all(...options.configIds) as ResearchConfig[];
  } else {
    configs = db
      .prepare("SELECT * FROM research_config WHERE enabled = 1")
      .all() as ResearchConfig[];
  }

  if (configs.length === 0) {
    throw new Error(
      "No hay competidores o temas configurados. Agregá al menos uno en la sección de Config."
    );
  }

  const competitors = configs.filter((c) => c.type === "competitor");
  const topics = configs.filter((c) => c.type === "industry");

  // Build research prompt
  const competitorList = competitors
    .map(
      (c) =>
        `- ${c.name}${c.url ? ` (${c.url})` : ""}${c.description ? `: ${c.description}` : ""}`
    )
    .join("\n");

  const topicList = topics
    .map((c) => `- ${c.name}${c.description ? `: ${c.description}` : ""}`)
    .join("\n");

  const systemPrompt = `Eres un investigador de inteligencia competitiva. El contexto de la empresa se obtiene de las campañas y configuración en la base de datos.

Tu tarea es investigar competidores y temas de industria usando la herramienta search_web, analizar lo que encontrás, y guardar los hallazgos más relevantes con save_finding.

Reglas:
- Buscá información reciente y relevante (últimos 3-6 meses)
- Enfocate en: productos nuevos, funding, partnerships, features, estrategia de mercado, precios
- Guardá cada hallazgo importante con save_finding — no acumules todo en uno solo
- Sé conciso pero informativo en los resúmenes
- Usá tags relevantes separados por coma
- Máximo 3 búsquedas por competidor y 2 por tema de industria
- Buscá 3-5 fuentes relevantes y extraé insights clave de cada una
- Para cada fuente, guardá hallazgos con título, resumen, contenido, URL fuente y categoría
- Categorías válidas: "competencia", "tendencia", "mercado", "producto", "general"
- Respondé siempre en español`;

  const userMessage = `Investigá lo siguiente:

${competitors.length > 0 ? `## Competidores\n${competitorList}\n` : ""}
${topics.length > 0 ? `## Temas de Industria\n${topicList}\n` : ""}

Para cada competidor/tema, usá search_web para buscar información relevante y guardá los hallazgos con save_finding. Cuando termines, respondé con un resumen de lo que encontraste.`;

  const savedTitles: string[] = [];

  onProgress({
    phase: "starting",
    detail: `Investigando ${competitors.length} competidores y ${topics.length} temas...`,
  });

  // Tool executor
  async function executeTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<string> {
    if (name === "search_web") {
      const query = String(args.query ?? "");
      onProgress({ phase: "searching", detail: query });
      try {
        const results = await searchDuckDuckGo(query);
        if (results.length === 0) {
          return JSON.stringify({ results: [], message: "No results found." });
        }
        return JSON.stringify({ results });
      } catch (err: any) {
        return JSON.stringify({
          error: err.message ?? "Search failed",
          results: [],
        });
      }
    }

    if (name === "save_finding") {
      onProgress({ phase: "saving", detail: String(args.title ?? "") });

      const result = db
        .prepare(
          `INSERT INTO research (title, source_url, tags, summary, content, brand_name, category)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          String(args.title ?? ""),
          String(args.source_url || ""),
          String(args.tags || ""),
          String(args.summary || ""),
          String(args.content || ""),
          String(args.brand_name || ""),
          String(args.category || "competencia")
        );

      savedTitles.push(String(args.title ?? ""));
      logActivity(
        "create",
        "research",
        String(result.lastInsertRowid),
        `Research Agent: ${args.title}`
      );

      return JSON.stringify({
        success: true,
        id: Number(result.lastInsertRowid),
      });
    }

    return JSON.stringify({ error: `Unknown tool: ${name}` });
  }

  // ── Agentic tool-use loop (Anthropic SDK) ──

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  let iterations = 0;
  const maxIterations = 25;

  while (iterations < maxIterations) {
    iterations++;

    const response = await client.messages.create({
      model,
      max_tokens: 8192,
      system: systemPrompt,
      tools,
      messages,
    });

    // Collect all tool-use blocks from the response
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ContentBlockParam & { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } =>
        b.type === "tool_use"
    );

    // If no tool calls, we're done
    if (toolUseBlocks.length === 0 || response.stop_reason === "end_turn") {
      break;
    }

    // Add assistant response to messages
    messages.push({ role: "assistant", content: response.content });

    // Execute each tool and collect results
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolBlock of toolUseBlocks) {
      onProgress({ phase: "tool_call", detail: toolBlock.name });
      const result = await executeTool(
        toolBlock.name,
        toolBlock.input as Record<string, unknown>
      );
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolBlock.id,
        content: result,
      });
    }

    // Add tool results to messages
    messages.push({ role: "user", content: toolResults });
  }

  onProgress({
    phase: "done",
    detail: `${savedTitles.length} hallazgos guardados`,
  });
  logActivity(
    "agent_run",
    "research_agent",
    "0",
    `Research agent: ${savedTitles.length} findings`,
    { titles: savedTitles }
  );

  return { count: savedTitles.length, titles: savedTitles };
}

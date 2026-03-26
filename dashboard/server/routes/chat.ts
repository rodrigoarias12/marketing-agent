import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db.js";
import { toCamelArray } from "../lib/case-convert.js";
import { logActivity } from "../lib/activity.js";
import { runResearchAgent } from "../lib/research-agent.js";
import { generateContentFromResearch } from "../lib/content-generator.js";
import { updateAgent, addActivity } from "../agents/agent-state.js";

const router = Router();

// System prompt that gives the agent context about Eddie
const SYSTEM_PROMPT = `Eres Eddie, un asistente de marketing AI. Tenés acceso a las herramientas de la plataforma de marketing.

Tu rol:
- Ayudar con research de mercado, competencia e industria
- Generar ideas y borradores de contenido para LinkedIn
- Analizar prospectos y sugerir estrategias de outreach
- Responder preguntas sobre el estado de las campañas y operaciones

Tu empresa y contexto se configuran via variables de entorno o la base de datos. Consultá los datos de campañas y prospectos para entender el contexto del usuario.

Siempre respondé en español argentino informal (vos, tenés, etc). Sé conciso y orientado a la acción.`;

// Tool definitions in Anthropic native format
const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_prospects",
    description: "Obtiene la lista de prospectos. Puede filtrar por status (pendiente, aceptada, dm_sent, rechazada), region (argentina, miami), o campaign_id.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string", description: "Filtrar por status" },
        region: { type: "string", description: "Filtrar por region" },
        campaign_id: { type: "number", description: "Filtrar por campaña" },
      },
      required: [],
    },
  },
  {
    name: "get_campaigns",
    description: "Obtiene todas las campañas de marketing activas con conteos de prospectos.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_research",
    description: "Obtiene investigaciones guardadas. Puede filtrar por categoría (general, competencia, industria, contenido, prospects) o campaign_id.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: { type: "string", description: "Filtrar por categoría" },
        campaign_id: { type: "number", description: "Filtrar por campaña" },
      },
      required: [],
    },
  },
  {
    name: "create_research",
    description: "Crea una nueva entrada de research/investigación en la base de datos.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Título del research" },
        summary: { type: "string", description: "Resumen corto" },
        content: { type: "string", description: "Contenido completo / notas" },
        tags: { type: "string", description: "Tags separados por coma" },
        category: { type: "string", description: "Categoría: general, competencia, industria, contenido, prospects" },
        source_url: { type: "string", description: "URL fuente si aplica" },
        brand_name: { type: "string", description: "Marca o competidor" },
        campaign_id: { type: "number", description: "ID de campaña asociada" },
      },
      required: ["title"],
    },
  },
  {
    name: "get_kpis",
    description: "Obtiene métricas/KPIs del dashboard: prospectos por status, contenido publicado, research total, campañas activas.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_content_status",
    description: "Obtiene el estado de publicación de los posts de contenido para una fecha específica.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Fecha en formato YYYY-MM-DD" },
      },
      required: ["date"],
    },
  },
  {
    name: "search_web",
    description: "Busca información en la web. Útil para research de competidores, tendencias de industria, noticias, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Término de búsqueda" },
      },
      required: ["query"],
    },
  },
  {
    name: "run_research_agent",
    description: "Ejecuta el agente de investigación automática. Busca información de competidores y temas configurados en la web y guarda los hallazgos.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "generate_content_from_research",
    description: "Genera posts de contenido (drafts) basados en el research disponible. Crea archivos markdown listos para publicar.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Fecha del draft en formato YYYY-MM-DD" },
        post_count: { type: "number", description: "Cantidad de posts a generar (default: 3)" },
        platforms: {
          type: "array",
          items: { type: "string" },
          description: "Plataformas: LinkedIn, X (Twitter)",
        },
      },
      required: ["date"],
    },
  },
];

// Execute tool calls against the database
async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case "get_prospects": {
        let sql = "SELECT * FROM prospects WHERE 1=1";
        const params: (string | number)[] = [];
        if (input.status) { sql += " AND status = ?"; params.push(String(input.status)); }
        if (input.region) { sql += " AND region = ?"; params.push(String(input.region)); }
        if (input.campaign_id) { sql += " AND campaign_id = ?"; params.push(Number(input.campaign_id)); }
        sql += " ORDER BY updated_at DESC";
        const rows = db.prepare(sql).all(...params);
        return JSON.stringify(toCamelArray(rows as Record<string, unknown>[]));
      }
      case "get_campaigns": {
        const rows = db.prepare(`
          SELECT c.*,
            COUNT(p.id) as prospect_count,
            SUM(CASE WHEN p.status = 'pendiente' THEN 1 ELSE 0 END) as pendiente_count,
            SUM(CASE WHEN p.status = 'aceptada' THEN 1 ELSE 0 END) as aceptada_count,
            SUM(CASE WHEN p.status = 'dm_sent' THEN 1 ELSE 0 END) as dm_sent_count
          FROM campaigns c
          LEFT JOIN prospects p ON p.campaign_id = c.id
          GROUP BY c.id
          ORDER BY c.name
        `).all();
        return JSON.stringify(toCamelArray(rows as Record<string, unknown>[]));
      }
      case "get_research": {
        let sql = "SELECT * FROM research WHERE 1=1";
        const params: (string | number)[] = [];
        if (input.category) { sql += " AND category = ?"; params.push(String(input.category)); }
        if (input.campaign_id) { sql += " AND campaign_id = ?"; params.push(Number(input.campaign_id)); }
        sql += " ORDER BY created_at DESC";
        const rows = db.prepare(sql).all(...params);
        return JSON.stringify(toCamelArray(rows as Record<string, unknown>[]));
      }
      case "create_research": {
        const result = db.prepare(
          `INSERT INTO research (title, source_url, tags, summary, content, brand_name, campaign_id, category)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          String(input.title ?? ""),
          String(input.source_url || ""),
          String(input.tags || ""),
          String(input.summary || ""),
          String(input.content || ""),
          String(input.brand_name || ""),
          input.campaign_id ? Number(input.campaign_id) : null,
          String(input.category || "general")
        );
        logActivity("create", "research", String(result.lastInsertRowid), `Research via chat: ${input.title}`);
        return JSON.stringify({ success: true, id: Number(result.lastInsertRowid) });
      }
      case "get_kpis": {
        const prospects = db.prepare(`
          SELECT COUNT(*) as total,
            SUM(CASE WHEN status = 'pendiente' THEN 1 ELSE 0 END) as pendiente,
            SUM(CASE WHEN status = 'aceptada' THEN 1 ELSE 0 END) as aceptada,
            SUM(CASE WHEN status = 'dm_sent' THEN 1 ELSE 0 END) as dm_sent,
            SUM(CASE WHEN status = 'rechazada' THEN 1 ELSE 0 END) as rechazada
          FROM prospects
        `).get();
        const content = db.prepare(`
          SELECT
            SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
          FROM content_status
        `).get();
        const research = db.prepare("SELECT COUNT(*) as total FROM research").get();
        const campaigns = db.prepare("SELECT COUNT(*) as total FROM campaigns WHERE status = 'active'").get();
        return JSON.stringify({ prospects, content, research, campaigns });
      }
      case "get_content_status": {
        const rows = db.prepare("SELECT * FROM content_status WHERE date = ?").all(String(input.date));
        return JSON.stringify(toCamelArray(rows as Record<string, unknown>[]));
      }
      case "search_web": {
        return JSON.stringify({ note: "Web search no está disponible directamente. Usá run_research_agent para investigar competidores y temas automáticamente." });
      }
      case "run_research_agent": {
        // Run synchronously — collect progress events
        const events: string[] = [];
        try {
          const result = await runResearchAgent((ev) => { events.push(`${ev.phase}: ${ev.detail ?? ""}`); });
          return JSON.stringify({ success: true, count: result.count, titles: result.titles, log: events });
        } catch (e: any) {
          return JSON.stringify({ error: e.message });
        }
      }
      case "generate_content_from_research": {
        try {
          const result = await generateContentFromResearch({
            date: String(input.date ?? new Date().toISOString().split("T")[0]),
            postCount: input.post_count ? Number(input.post_count) : 3,
            platforms: input.platforms as string[] | undefined,
          });
          return JSON.stringify({ success: true, posts: result.posts, filePath: result.filePath });
        } catch (e: any) {
          return JSON.stringify({ error: e.message });
        }
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (e: any) {
    return JSON.stringify({ error: e.message });
  }
}

// POST /api/chat — streaming chat with Anthropic Claude
router.post("/", async (req, res) => {
  const { message, history } = req.body as {
    message: string;
    history?: { role: "user" | "assistant"; content: string }[];
  };

  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  // Validate API key early
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.write(`data: ${JSON.stringify({ error: "ANTHROPIC_API_KEY no configurada. Agregala como variable de entorno." })}\n\n`);
    res.write("data: [DONE]\n\n");
    return res.end();
  }

  const client = new Anthropic({ apiKey });

  // Build message history for Anthropic (system goes separately)
  const messages: Anthropic.MessageParam[] = [
    ...(history ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    // Update Eddie's agent state while processing chat
    updateAgent("eddie", { status: "working", currentTask: `Chat: ${message.slice(0, 50)}` });
    addActivity("Eddie", "chat", `Processing: ${message.slice(0, 60)}`);

    // Agentic loop: keep calling Anthropic until no more tool_use blocks
    let currentMessages: Anthropic.MessageParam[] = [...messages];
    let maxIterations = 10;

    while (maxIterations-- > 0) {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: currentMessages,
      });

      // Check if there are tool_use blocks
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ContentBlock & { type: "tool_use" } => block.type === "tool_use"
      );

      if (toolUseBlocks.length > 0) {
        // Add assistant message with all content blocks to conversation
        currentMessages.push({ role: "assistant", content: response.content });

        // Execute tools and build tool_result messages
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of toolUseBlocks) {
          const input = (block.input ?? {}) as Record<string, unknown>;

          // Send tool use notification to client
          res.write(`data: ${JSON.stringify({ tool: block.name, status: "executing" })}\n\n`);

          const result = await executeTool(block.name, input);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }

        currentMessages.push({ role: "user", content: toolResults });

        continue; // Loop back to get model's response
      }

      // No tool calls — stream the text response
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === "text"
      );
      const text = textBlocks.map((b) => b.text).join("");

      if (text) {
        // Send in chunks for smoother streaming feel
        const words = text.split(/(\s+)/);
        let chunk = "";
        for (const word of words) {
          chunk += word;
          if (chunk.length > 20) {
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
            chunk = "";
          }
        }
        if (chunk) {
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
        }
      }

      break; // Done
    }

    logActivity("chat", "agent", "eddie", `Chat: ${message.slice(0, 80)}`);
  } catch (e: any) {
    res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
  } finally {
    // Reset Eddie to idle after chat completes
    updateAgent("eddie", { status: "idle", currentTask: "" });
  }

  res.write("data: [DONE]\n\n");
  res.end();
});

export default router;

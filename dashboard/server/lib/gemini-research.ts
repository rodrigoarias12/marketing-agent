import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../db.js";
import { logActivity } from "./activity.js";

interface ResearchTopic {
  id: number;
  topic: string;
  category: string;
  enabled: number;
}

interface ResearchResult {
  title: string;
  summary: string;
  content: string;
  sourceUrl: string;
  category: string;
  brandName: string;
}

export async function runGeminiResearch(
  onProgress?: (msg: string) => void
): Promise<{ count: number; titles: string[] }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY no configurada");

  const genAI = new GoogleGenerativeAI(apiKey);

  // Use Gemini Flash with Google Search grounding
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    tools: [{ googleSearch: {} } as any],
  });

  // Get configured topics from DB
  const topics = getActiveTopics();
  if (topics.length === 0) {
    onProgress?.("No hay temas configurados para investigar");
    return { count: 0, titles: [] };
  }

  const allResults: ResearchResult[] = [];

  for (const topic of topics) {
    onProgress?.(`Investigando: ${topic.topic}...`);

    try {
      const prompt = `Investiga sobre: "${topic.topic}"

Busca informacion actual y relevante. Para cada hallazgo importante, proporciona:
1. Un titulo descriptivo
2. Un resumen de 2-3 oraciones
3. El contenido detallado (3-5 parrafos con datos especificos, numeros, nombres)
4. La fuente/URL donde encontraste la informacion
5. Si aplica, el nombre de la marca/empresa mencionada

Enfocate en:
- Novedades recientes (ultimos 3 meses)
- Datos concretos (numeros, porcentajes, fechas)
- Movimientos de competidores
- Tendencias del mercado

Responde en formato JSON:
{
  "findings": [
    {
      "title": "...",
      "summary": "...",
      "content": "...",
      "sourceUrl": "...",
      "brandName": "..."
    }
  ]
}

Categoria para estos hallazgos: ${topic.category}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*"findings"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.findings)) {
          for (const finding of parsed.findings) {
            allResults.push({
              title: finding.title || "",
              summary: finding.summary || "",
              content: finding.content || "",
              sourceUrl: finding.sourceUrl || "",
              category: topic.category,
              brandName: finding.brandName || "",
            });
          }
          onProgress?.(`  -> ${parsed.findings.length} hallazgos encontrados`);
        }
      }

      // Update last_researched_at
      db.prepare(
        "UPDATE research_topics SET last_researched_at = datetime('now') WHERE id = ?"
      ).run(topic.id);
    } catch (err: any) {
      onProgress?.(`  Error investigando "${topic.topic}": ${err.message}`);
    }
  }

  // Save to DB (deduplicate by title)
  const titles: string[] = [];
  for (const r of allResults) {
    // Check if similar title already exists
    const existing = db
      .prepare("SELECT id FROM research WHERE title = ?")
      .get(r.title) as { id: number } | undefined;

    if (!existing && r.title) {
      db.prepare(
        `INSERT INTO research (title, summary, content, source_url, category, brand_name)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(r.title, r.summary, r.content, r.sourceUrl, r.category, r.brandName);
      titles.push(r.title);
    }
  }

  if (titles.length > 0) {
    logActivity(
      "research",
      "scout",
      "auto-research",
      `Scout encontro ${titles.length} hallazgos nuevos`,
      { topics: topics.map((t) => t.topic), count: titles.length }
    );
  }

  onProgress?.(`Completado: ${titles.length} hallazgos nuevos guardados`);
  return { count: titles.length, titles };
}

// DB helpers for topics
function getActiveTopics(): ResearchTopic[] {
  const tableExists = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='research_topics'"
    )
    .get();

  if (!tableExists) return [];

  return db
    .prepare("SELECT * FROM research_topics WHERE enabled = 1")
    .all() as unknown as ResearchTopic[];
}

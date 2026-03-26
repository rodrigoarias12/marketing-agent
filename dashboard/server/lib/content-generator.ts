import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { db, WORKSPACE } from "../db.js";
import { toCamelArray } from "./case-convert.js";
import { logActivity } from "./activity.js";

interface GenerateOptions {
  date: string;
  researchIds?: number[];
  platforms?: string[];
  postCount?: number;
}

export async function generateContentFromResearch(options: GenerateOptions): Promise<{
  success: boolean;
  filePath: string;
  posts: Array<{ number: number; platform: string; type: string }>;
}> {
  // Load research entries
  let researchEntries: Record<string, unknown>[];
  if (options.researchIds?.length) {
    const placeholders = options.researchIds.map(() => "?").join(",");
    researchEntries = db.prepare(
      `SELECT * FROM research WHERE id IN (${placeholders}) ORDER BY created_at DESC`
    ).all(...options.researchIds) as Record<string, unknown>[];
  } else {
    // Get last 10 research entries
    researchEntries = db.prepare(
      "SELECT * FROM research ORDER BY created_at DESC LIMIT 10"
    ).all() as Record<string, unknown>[];
  }

  if (researchEntries.length === 0) {
    throw new Error("No hay research disponible para generar contenido.");
  }

  const research = toCamelArray(researchEntries);

  // Load content generation skill
  const skillPath = join(WORKSPACE, "skills", "content-generation.md");
  let skillContent = "";
  try {
    skillContent = readFileSync(skillPath, "utf-8");
  } catch {
    skillContent = "Use standard social media post formats for LinkedIn and X (Twitter).";
  }

  // Load a sample draft for format reference
  const draftsDir = join(WORKSPACE, "content", "drafts");
  let sampleFormat = "";
  try {
    const files = readdirSync(draftsDir).filter((f: string) => f.endsWith(".md")).sort().reverse();
    if (files.length > 0) {
      const sample = readFileSync(join(draftsDir, files[0]), "utf-8");
      // Get first post as format example (up to 60 lines)
      sampleFormat = sample.split("\n").slice(0, 60).join("\n");
    }
  } catch {}

  const platforms = options.platforms ?? ["LinkedIn", "X (Twitter)"];
  const postCount = options.postCount ?? 3;

  const researchContext = research.map((r: any) =>
    `### ${r.title}\n**Marca:** ${r.brandName || "N/A"} | **Categoría:** ${r.category}\n**Resumen:** ${r.summary}\n${r.content ? `**Contenido:** ${r.content.slice(0, 500)}` : ""}\n${r.sourceUrl ? `**Fuente:** ${r.sourceUrl}` : ""}`
  ).join("\n\n---\n\n");

  const systemPrompt = `Eres Eddie, un generador de contenido de marketing AI.

El contexto de la empresa (nombre, verticales, propuesta de valor) se obtiene del research y las campañas configuradas en la base de datos.

Tu tarea es generar posts de contenido para redes sociales basados en research/hallazgos de investigación.

Templates de contenido disponibles:
${skillContent}

FORMATO DE SALIDA OBLIGATORIO — cada post debe seguir EXACTAMENTE este formato markdown:

${sampleFormat || `## POST N — [Plataforma]: [Título corto]

━━━ POST ━━━━━━━━━━━━━━━━━━━━━━━━━
PLATFORM: [LinkedIn|X (Twitter)]
TYPE: [post|thread|hot_take]
PILLAR: [1-4] — [Nombre del pilar]
SERIES: [Nombre de la serie]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Cuerpo del post]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CTA: [Call to action]
UTM: https://yoursite.com?utm_source=[platform]&utm_medium=organic&utm_campaign=[campaign]&utm_content=[content_id]
HASHTAGS: [hashtags relevantes]
━━━ IMAGEN ━━━━━━━━━━━━━━━━━━━━━━
TYPE: [graphic|photo|screenshot]
DESCRIPTION: [Descripción de la imagen]
DIMENSIONS: [1200x675 para LinkedIn/Twitter]
TEXT_ON_IMAGE: [Texto principal en la imagen]
STYLE: [Estilo visual]
━━━ META ━━━━━━━━━━━━━━━━━━━━━━━━
POSTING_TIME: [HH:MM AM/PM UTC-3]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`}

Reglas:
- Escribí en español argentino informal (vos, tenés, etc)
- Cada post debe estar basado en hallazgos reales del research
- Usá datos y insights específicos del research, no genéricos
- Los posts deben ser atractivos, con hook fuerte en la primera línea
- Incluí siempre UTM links con parámetros relevantes
- Variá los tipos de post (insight, hot take, thread, etc)

REGLAS ANTI-SLOP — Tu contenido NO debe sonar a AI. Seguí estas reglas estrictamente:

PALABRAS PROHIBIDAS — Nunca uses:
"delve", "realm", "boasts", "nuanced", "pivotal", "harness", "innovative", "transformative", "landscape", "leverage", "robust", "seamless", "cutting-edge", "game-changer", "paradigm", "synergy", "holistic", "ecosystem"
Ni sus equivalentes en español: "profundizar", "ámbito", "innovador", "transformador", "panorama", "apalancamiento", "robusto", "sin fisuras", "de vanguardia"

FRASES PROHIBIDAS:
- "Tends to" / "tiende a"
- "Dive into" / "sumergirse en"
- "In the realm of" / "en el ámbito de"
- "Plays a pivotal role" / "juega un rol clave"
- "Stands as a testament to"
- "Not X, it's Y" (no uses esta estructura repetitivamente)
- "Let's unpack this"
- "Here's the thing"

ESTILO OBLIGATORIO:
- Variá la longitud de las oraciones: mezclá cortas (3-5 palabras) con largas
- Usá jerga argentina PROFESIONAL: "laburo", "posta", "meter mano", "garpar", "bancarse"
- NUNCA uses malas palabras ni vulgaridades: nada de "paja", "cagada", "mierda", "pelotudo", "boludo", "quilombo", "carajo", "garcha", etc. Mantenelo profesional pero cercano
- Incluí opiniones fuertes y concretas, no frases tibias
- Agregá detalles sensoriales cuando tenga sentido
- No uses negritas excesivas — máximo 2-3 por post
- Evitá estructuras repetitivas: no hagas listas de 3 puntos siempre iguales
- Soná como un founder argentino real hablando en un bar, no como un whitepaper
- Cada oración debe agregar información nueva, no reformular lo anterior
- No empieces múltiples oraciones con la misma palabra
- Usá humor seco, ironía, referencias locales cuando aplique`;

  const userMessage = `Generá ${postCount} posts para las plataformas: ${platforms.join(", ")}.

Basate en estos hallazgos de investigación:

${researchContext}

Fecha para los drafts: ${options.date}

Generá el archivo markdown completo empezando con:
# Content Drafts — ${options.date}
## Generated by Eddie | Research-based

---

Y luego los ${postCount} posts en el formato exacto.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY no configurada");
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const generatedContent = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  // Write the draft file
  if (!existsSync(draftsDir)) {
    mkdirSync(draftsDir, { recursive: true });
  }
  const filePath = join(draftsDir, `${options.date}.md`);
  writeFileSync(filePath, generatedContent, "utf-8");

  // Parse generated posts for summary
  const postMatches = generatedContent.matchAll(/## POST (\d+) — ([^:]+):\s*(.*)/g);
  const posts = Array.from(postMatches).map((m) => ({
    number: parseInt(m[1]),
    platform: m[2].trim(),
    type: m[3].trim(),
  }));

  logActivity("generate", "content", options.date, `Generated ${posts.length} posts from research`, {
    researchIds: options.researchIds,
    platforms,
    postCount: posts.length,
  });

  return { success: true, filePath, posts };
}

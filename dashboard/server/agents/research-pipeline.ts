import * as cheerio from "cheerio";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db.js";
import { logActivity } from "../lib/activity.js";

// ── Types ──

export interface PipelineInput {
  niche: string;
  competitors: string[];
  platforms: string[];
}

export interface PipelineProgress {
  step: string;
  detail: string;
  progress?: number; // 0-100
}

interface SearchResult {
  query: string;
  urls: { url: string; title: string; snippet: string }[];
}

interface ExtractedPage {
  url: string;
  title: string;
  content: string;
  fetchedAt: string;
}

// ── Anthropic client helper ──

const MODEL = "claude-sonnet-4-20250514";

function getClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function chatCompletion(
  messages: { role: string; content: string }[],
  opts?: { maxTokens?: number }
): Promise<string> {
  const client = getClient();
  const systemMsg = messages.find((m) => m.role === "system");
  const nonSystemMsgs = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: opts?.maxTokens || 4096,
    system: systemMsg?.content || "",
    messages: nonSystemMsgs,
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

// ── Main Pipeline ──

export async function runResearchPipeline(
  jobId: number,
  input: PipelineInput,
  onProgress: (event: PipelineProgress) => void
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    updateJobError(jobId, "ANTHROPIC_API_KEY not configured in .env");
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  try {
    // ── Step 1: Plan search queries ──
    updateJobStep(jobId, "planning");
    onProgress({ step: "planning", detail: "Generating search queries with Claude..." });

    const queries = await stepPlan(input);
    saveResult(jobId, "queries", { queries });
    onProgress({ step: "planning", detail: `Generated ${queries.length} search queries`, progress: 15 });

    // ── Step 2: Search ──
    updateJobStep(jobId, "searching");
    onProgress({ step: "searching", detail: `Searching ${queries.length} queries...` });

    const searchResults: SearchResult[] = [];
    for (let i = 0; i < queries.length; i++) {
      onProgress({
        step: "searching",
        detail: `Query ${i + 1}/${queries.length}: ${queries[i]}`,
        progress: 15 + Math.round((i / queries.length) * 20),
      });
      try {
        const results = await stepSearch(queries[i]);
        searchResults.push({ query: queries[i], urls: results });
      } catch (err: any) {
        searchResults.push({ query: queries[i], urls: [] });
        onProgress({ step: "searching", detail: `Query failed: ${queries[i]} - ${err.message}` });
      }
    }
    saveResult(jobId, "search", { searchResults });
    const totalUrls = searchResults.reduce((s, r) => s + r.urls.length, 0);
    onProgress({ step: "searching", detail: `Found ${totalUrls} URLs across ${queries.length} queries`, progress: 35 });

    // ── Step 3: Extract ──
    updateJobStep(jobId, "extracting");
    onProgress({ step: "extracting", detail: `Extracting content from ${totalUrls} pages...` });

    // Deduplicate URLs
    const uniqueUrls = new Map<string, { url: string; title: string; snippet: string }>();
    for (const sr of searchResults) {
      for (const u of sr.urls) {
        if (!uniqueUrls.has(u.url)) uniqueUrls.set(u.url, u);
      }
    }
    const urlList = Array.from(uniqueUrls.values()).slice(0, 30); // Cap at 30

    const extracted: ExtractedPage[] = [];
    for (let i = 0; i < urlList.length; i++) {
      onProgress({
        step: "extracting",
        detail: `Page ${i + 1}/${urlList.length}: ${urlList[i].title || urlList[i].url}`,
        progress: 35 + Math.round((i / urlList.length) * 20),
      });
      try {
        const page = await stepExtract(urlList[i].url, urlList[i].title);
        if (page.content.length > 100) {
          extracted.push(page);
        }
      } catch {
        // Skip failed extractions silently
      }
    }
    saveResult(jobId, "extract", { extracted: extracted.map((e) => ({ url: e.url, title: e.title, contentLength: e.content.length, fetchedAt: e.fetchedAt })) });
    onProgress({ step: "extracting", detail: `Extracted content from ${extracted.length} pages`, progress: 55 });

    // ── Step 4: Analyze ──
    updateJobStep(jobId, "analyzing");
    onProgress({ step: "analyzing", detail: "Analyzing competitor content with Claude..." });

    const analysis = await stepAnalyze(input, extracted);
    saveResult(jobId, "analysis", { analysis });
    onProgress({ step: "analyzing", detail: "Analysis complete", progress: 75 });

    // ── Step 5: Generate Content Ideas ──
    updateJobStep(jobId, "generating");
    onProgress({ step: "generating", detail: "Generating content ideas with Claude..." });

    const contentIdeas = await stepGenerateIdeas(input, analysis);
    saveResult(jobId, "content_ideas", { contentIdeas });
    onProgress({ step: "generating", detail: `Generated ${contentIdeas.length} content ideas`, progress: 90 });

    // ── Step 6: Save to DB ──
    updateJobStep(jobId, "saving");
    onProgress({ step: "saving", detail: "Saving results to database..." });

    // Save analysis as a research entry
    db.prepare(
      `INSERT INTO research (title, summary, content, tags, category, brand_name)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      `Pipeline Analysis: ${input.niche}`,
      analysis.substring(0, 500),
      analysis,
      input.competitors.join(", "),
      "competencia",
      input.competitors[0] || input.niche
    );

    // Save each content idea as a research entry
    for (const idea of contentIdeas) {
      db.prepare(
        `INSERT INTO research (title, summary, content, tags, category, brand_name)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        idea.title,
        `${idea.format} | ${idea.platform} | ${idea.suggestedDate || ""}`,
        idea.description,
        `content-idea, ${idea.format}, ${idea.platform}`,
        "contenido",
        input.niche
      );
    }

    // Mark job complete
    db.prepare(
      `UPDATE research_jobs SET status = 'completed', current_step = NULL, completed_at = datetime('now') WHERE id = ?`
    ).run(jobId);

    logActivity("pipeline_run", "research_pipeline", String(jobId), `Research pipeline: ${input.niche} - ${contentIdeas.length} ideas generated`);

    onProgress({ step: "complete", detail: `Pipeline complete! ${contentIdeas.length} content ideas generated.`, progress: 100 });

  } catch (err: any) {
    // Extract meaningful error message
    let errorMsg = err.message || "Unknown error";
    if (errorMsg.includes("credit balance") || errorMsg.includes("insufficient_quota")) {
      errorMsg = "Sin créditos en la cuenta de Anthropic. Verificá tu plan en console.anthropic.com.";
    } else if (errorMsg.includes("401") || errorMsg.includes("authentication")) {
      errorMsg = "API key inválida. Verificá ANTHROPIC_API_KEY en el .env.";
    }
    updateJobError(jobId, errorMsg);
    onProgress({ step: "error", detail: errorMsg });
    throw err;
  }
}

// ── Step Implementations ──

async function stepPlan(
  input: PipelineInput
): Promise<string[]> {
  const text = await chatCompletion(
    [
      {
        role: "user",
        content: `You are a competitive research planner. Given a niche and competitors, generate targeted search queries.

Niche: ${input.niche}
Competitors: ${input.competitors.join(", ")}
Platforms of interest: ${input.platforms.join(", ")}

Generate 5-10 search queries to find competitor marketing strategies, content, and industry trends. Return ONLY a JSON array of strings. Examples:
- "{competitor} marketing strategy 2026"
- "{competitor} social media content"
- "{niche} trends blog posts"
- "{competitor} vs alternatives"
- "{niche} content marketing examples"

Return ONLY the JSON array, no explanation.`,
      },
    ],
    { maxTokens: 2048 }
  );

  try {
    // Extract JSON array from response
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed.map(String).slice(0, 10);
    }
  } catch {}

  // Fallback: generate basic queries
  const fallback: string[] = [];
  for (const comp of input.competitors.slice(0, 3)) {
    fallback.push(`${comp} marketing strategy 2026`);
    fallback.push(`${comp} social media content`);
  }
  fallback.push(`${input.niche} trends 2026`);
  fallback.push(`${input.niche} content marketing examples`);
  return fallback.slice(0, 10);
}

async function stepSearch(query: string): Promise<{ url: string; title: string; snippet: string }[]> {
  // Try Tavily first if key exists
  if (process.env.TAVILY_API_KEY) {
    try {
      return await searchWithTavily(query);
    } catch {
      // Fall through to DuckDuckGo
    }
  }

  // Fallback: DuckDuckGo HTML search
  return await searchWithDuckDuckGo(query);
}

async function searchWithTavily(query: string): Promise<{ url: string; title: string; snippet: string }[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: 10,
      include_answer: false,
    }),
  });

  if (!res.ok) throw new Error(`Tavily error: ${res.status}`);
  const data = (await res.json()) as { results: { url: string; title: string; content: string }[] };

  return (data.results || []).map((r) => ({
    url: r.url,
    title: r.title || "",
    snippet: r.content || "",
  }));
}

async function searchWithDuckDuckGo(query: string): Promise<{ url: string; title: string; snippet: string }[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://html.duckduckgo.com/html/?q=${encoded}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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

async function stepExtract(url: string, fallbackTitle: string): Promise<ExtractedPage> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EddiBot/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      throw new Error("Not HTML content");
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove non-content elements
    $("script, style, nav, footer, header, iframe, noscript, svg, form, .sidebar, .nav, .footer, .header, .cookie, .popup, .modal, .ad, .advertisement").remove();

    // Try to find article content first
    let text = "";
    const article = $("article, [role='main'], .post-content, .article-content, .entry-content, main");
    if (article.length > 0) {
      text = article.first().text();
    } else {
      text = $("body").text();
    }

    // Clean up whitespace
    text = text
      .replace(/\s+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Truncate to 2000 chars of meaningful content
    if (text.length > 2000) {
      text = text.substring(0, 2000) + "...";
    }

    const title = $("title").text().trim() || $("h1").first().text().trim() || fallbackTitle;

    return {
      url,
      title,
      content: text,
      fetchedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function stepAnalyze(
  input: PipelineInput,
  extracted: ExtractedPage[]
): Promise<string> {
  // Build content summary (cap total tokens)
  let contentSummary = "";
  for (const page of extracted.slice(0, 20)) {
    contentSummary += `\n\n---\nURL: ${page.url}\nTitle: ${page.title}\nContent:\n${page.content.substring(0, 1500)}\n`;
    if (contentSummary.length > 40000) break; // Safety cap
  }

  if (contentSummary.length < 100) {
    return "No se pudo extraer suficiente contenido de las paginas encontradas. Considera refinar los competidores o el nicho.";
  }

  return await chatCompletion(
    [
      {
        role: "user",
        content: `You are a competitive intelligence analyst. Analyze the following competitor content for the niche "${input.niche}" with competitors: ${input.competitors.join(", ")}.

Extracted content from ${extracted.length} pages:
${contentSummary}

Provide a detailed analysis covering:
1. **Top Themes**: What topics are competitors focusing on?
2. **Content Formats**: Blog posts, videos, social posts, whitepapers, etc.
3. **Engagement Patterns**: What seems to resonate? (based on content structure, tone)
4. **Content Gaps**: What topics are underserved that we could fill?
5. **Key Takeaways**: Top 5 actionable insights for our brand

Write in a structured format with headers and bullet points. Be specific and actionable.`,
      },
    ],
    { maxTokens: 4096 }
  );
}

async function stepGenerateIdeas(
  input: PipelineInput,
  analysis: string
): Promise<ContentIdea[]> {
  const today = new Date();
  const twoWeeksOut = new Date(today);
  twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);

  const text = await chatCompletion(
    [
      {
        role: "user",
        content: `Based on this competitive analysis for the "${input.niche}" niche:

${analysis.substring(0, 6000)}

Target platforms: ${input.platforms.join(", ")}

Generate 10 content ideas for our brand. For each idea, provide:
- title: A compelling title
- format: One of "blog", "social", "video", "carousel", "newsletter", "thread"
- platform: One of ${input.platforms.map((p) => `"${p}"`).join(", ")} or "blog"
- description: 2-3 sentences describing the content
- suggestedDate: A date between ${today.toISOString().split("T")[0]} and ${twoWeeksOut.toISOString().split("T")[0]}

Return ONLY a JSON array of objects with those fields. No explanation.`,
      },
    ],
    { maxTokens: 4096 }
  );

  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          title: String(item.title || "Untitled"),
          format: String(item.format || "social"),
          platform: String(item.platform || "linkedin"),
          description: String(item.description || ""),
          suggestedDate: String(item.suggestedDate || ""),
        }));
      }
    }
  } catch {}

  // Fallback if JSON parsing fails
  return [
    {
      title: `${input.niche} Industry Trends Overview`,
      format: "blog",
      platform: input.platforms[0] || "linkedin",
      description: "A comprehensive overview of current trends in the industry based on competitor analysis.",
      suggestedDate: today.toISOString().split("T")[0],
    },
  ];
}

// ── Types for content ideas ──

interface ContentIdea {
  title: string;
  format: string;
  platform: string;
  description: string;
  suggestedDate: string;
}

// ── DB Helpers ──

function updateJobStep(jobId: number, step: string) {
  db.prepare("UPDATE research_jobs SET status = 'running', current_step = ? WHERE id = ?").run(step, jobId);
}

function updateJobError(jobId: number, error: string) {
  db.prepare("UPDATE research_jobs SET status = 'failed', error = ? WHERE id = ?").run(error, jobId);
}

function saveResult(jobId: number, type: string, data: unknown) {
  db.prepare(
    "INSERT INTO research_results (job_id, type, data) VALUES (?, ?, ?)"
  ).run(jobId, type, JSON.stringify(data));
}

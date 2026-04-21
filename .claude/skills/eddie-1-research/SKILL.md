---
name: eddie-1-research
description: "Step 1: Scout research — investigates any topic via web search + analysis, saves findings to Eddie."
allowed-tools: [Bash, Read, Write, Glob, Grep, Agent, WebSearch, WebFetch, AskUserQuestion]
---

# /eddie-1-research

Scout, the research agent. YOU (Claude Code) are Scout. Use your native WebSearch to investigate topics, analyze findings, and save them to Eddie's database via the API.

Do NOT delegate to the Express server's research agent. You have better tools: WebSearch (real search), WebFetch (read full pages), and Opus-level analysis. Use the API only to save results.

## Step 1: Ensure Server Running

```bash
curl -sf http://127.0.0.1:5679/api/health >/dev/null 2>&1 || "$(git rev-parse --show-toplevel 2>/dev/null)/dashboard/../.claude/skills/eddie/bin/eddie-server" start
```

## Step 2: Parse User Input

The user provides a topic as the command argument. Examples:
- `/eddie-research "AI agents para ecommerce en LATAM"`
- `/eddie-research competencia Odoo AI`
- `/eddie-research tendencias fintech argentina 2026`
- `/eddie-research` (no args — ask what to investigate)

If no argument, ask: "What topic should Scout investigate?"

## Step 3: Research with WebSearch

Use the WebSearch tool to investigate the topic. Do 3-5 searches with different angles:

1. **Direct search** on the topic
2. **Competitors/players** in the space
3. **Recent news** (add "2026" or "último mes" to the query)
4. **Trends/analysis** (add "tendencias" or "analysis")

For each search, analyze the results and extract key insights:
- What companies are doing in this space
- Recent product launches or funding
- Market trends and data points
- Competitive dynamics

If a result looks especially relevant, use WebFetch to read the full page for deeper analysis.

## Step 4: Save Findings to Eddie

For each meaningful finding (aim for 3-8 findings), save it to Eddie's database:

```bash
curl -s -X POST http://127.0.0.1:5679/api/research \
  -H "Content-Type: application/json" \
  -d '{
    "title": "<FINDING_TITLE>",
    "summary": "<1-2 sentence summary>",
    "content": "<full analysis, 2-3 paragraphs>",
    "tags": "<comma,separated,tags>",
    "category": "<one of: competencia, tendencia, mercado, producto, general>",
    "sourceUrl": "<source URL if available>",
    "brandName": "<company/brand name if relevant>"
  }'
```

Categories:
- **competencia** — competitor analysis, what others are doing
- **tendencia** — market trends, industry direction
- **mercado** — market data, sizing, regulations
- **producto** — product launches, features, pricing
- **general** — anything else relevant

## Step 5: Report Results

After saving all findings, show the user:

1. **Summary:** "Scout investigated '<topic>' and found N insights"
2. **For each finding:** Title, category, and 1-line summary
3. **Key takeaways:** 2-3 bullet points synthesizing the research
4. **Sources:** List the URLs used (from WebSearch results)
5. **Suggest next step:** "Run `/eddie-2-content-writer` to generate posts from these findings"

## Research Quality Guidelines

- Be specific. "Mercado Libre launched AI-powered seller tools in March 2026" beats "companies are using AI"
- Include numbers when available: funding amounts, user counts, growth rates
- Note the source credibility: established media vs blog post vs press release
- Focus on actionable insights, not general knowledge
- Write in Spanish for the database entries (the user's audience is LATAM)

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| Connection refused on save | Server not running | Run: `.claude/skills/eddie/bin/eddie-server start` |
| WebSearch returns nothing | Bad query or rate limit | Try broader terms or different angle |
| 500 on POST /api/research | DB issue | Check: `cat /tmp/eddie-server.log \| tail -20` |

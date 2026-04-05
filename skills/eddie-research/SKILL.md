---
name: eddie-research
description: "Run Scout research agent — investigates a topic or niche via web search + AI analysis, saves findings to Eddie's database."
allowed-tools: [Bash, Read, Write, Glob, Grep, Agent, AskUserQuestion]
---

# /eddie-research

Scout, the research agent. Searches the web for a topic, analyzes findings with AI, and saves them to Eddie's database for later content generation.

## Step 1: Ensure Server Running

Run this health check. If it fails, start the server:

```bash
curl -sf http://127.0.0.1:5679/api/health >/dev/null 2>&1 || "$(git rev-parse --show-toplevel 2>/dev/null)/dashboard/../.claude/skills/eddie/bin/eddie-server" start
```

If the server fails to start, tell the user:
- "Eddie server couldn't start. Run `eddie-server start` manually or check `/tmp/eddie-server.log`."
- Common causes: Node 22+ not installed, dependencies not installed (`cd dashboard && pnpm install`), missing `.env` file.

## Step 2: Parse User Input

The user provides a topic or niche as the command argument. Examples:
- `/eddie-research "fintech AI LATAM"`
- `/eddie-research competencia Odoo AI`
- `/eddie-research` (no args — prompt for topic)

If no argument provided, ask: "What topic should Scout investigate?"

## Step 3: Run Research Pipeline

Use the research pipeline endpoint which supports topic-based research:

```bash
curl -s -X POST http://127.0.0.1:5679/api/research-pipeline/run \
  -H "Content-Type: application/json" \
  -d '{"niche":"<USER_TOPIC>","competitors":[],"platforms":["linkedin","x"]}'
```

This returns a job ID: `{ "jobId": N, "status": "running" }`

## Step 4: Poll for Results

The pipeline runs asynchronously. Poll every 5 seconds until complete:

```bash
curl -s http://127.0.0.1:5679/api/research-pipeline/jobs/<JOB_ID>
```

Check the `status` field:
- `"running"` — still working, check `currentStep` for progress
- `"completed"` — done, results are in the `results` array
- `"failed"` — check `error` field

Use a maximum of 24 polls (2 minutes). Between polls, report progress to the user:
- "Scout is searching... (step: <currentStep>)"

## Step 5: Report Results

When the job completes, show the user:

1. **Summary:** "Scout found N results for '<topic>'"
2. **For each result:** Show the type and a brief summary of the data
3. **Suggest next step:** "Run `/eddie-content` to generate posts from these findings"

If the pipeline is not available or returns an error, fall back to the research agent:

```bash
curl -s -X POST http://127.0.0.1:5679/api/research/agent/run \
  -H "Content-Type: application/json" \
  -d '{"configIds":[]}'
```

This is an SSE endpoint. Use `timeout: 120000` on the Bash call. Parse the SSE events (lines starting with `data: `) to extract results.

## Step 6: Also Check Direct Research

After the pipeline/agent finishes, fetch the latest research entries to show what was saved:

```bash
curl -s http://127.0.0.1:5679/api/research | python3 -c "
import sys, json
data = json.load(sys.stdin)
for r in data[:5]:
    print(f\"  - {r.get('title', 'Untitled')} ({r.get('category', 'general')})\")
print(f'\nTotal: {len(data)} research entries in database')
"
```

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| Connection refused | Server not running | Run: `.claude/skills/eddie/bin/eddie-server start` |
| 500 Internal Server Error | API key or config issue | Check: `cat /tmp/eddie-server.log \| tail -20` |
| Timeout (>2 min) | Complex research taking long | Check status: `curl -s http://127.0.0.1:5679/api/research-pipeline/jobs` |
| Empty results | No matching content found | Try broader topic or check research config: `curl -s http://127.0.0.1:5679/api/research-config` |

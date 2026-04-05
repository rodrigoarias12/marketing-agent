---
name: eddie-2-content-writer
description: "Step 2: Pixel content writer — generates LinkedIn/X posts from a topic, idea, or research."
allowed-tools: [Bash, Read, Write, Glob, Grep, AskUserQuestion]
---

# /eddie-2-content-writer

Pixel, the content agent. Two modes:

- **Free mode** (default): The user gives a topic, idea, or a few sentences and Pixel turns it into polished posts
- **Research mode**: Pixel generates posts from research findings in Eddie's database

## Step 1: Ensure Server Running

```bash
curl -sf http://127.0.0.1:5679/api/health >/dev/null 2>&1 || "$(git rev-parse --show-toplevel 2>/dev/null)/dashboard/../.claude/skills/eddie/bin/eddie-server" start
```

## Step 2: Detect Mode

Read the user's input:

- If the user gives a **topic, idea, or description** (e.g., "quiero hablar de cómo armamos Eddie como skill pack") → **Free mode** (Step 3A)
- If the user says **"from research"**, **"desde research"**, or gives **no input** → **Research mode** (Step 3B)

## Step 3A: Free Mode — Generate from Topic

The user provided a topic or idea. Use Eddie's chat API to generate the posts, asking Pixel to produce them in the correct draft format.

Build a prompt that includes the user's idea and asks for LinkedIn posts in the standard Eddie draft format:

```bash
DATE=$(date +%Y-%m-%d)
curl -s -X POST http://127.0.0.1:5679/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Generame posts para LinkedIn sobre lo siguiente: <USER_TOPIC_OR_IDEA>. Generá <COUNT> posts variados (insight, hot take, building in public, storytelling, etc). Para cada post usá EXACTAMENTE este formato markdown:\n\n## POST N — Título descriptivo\n\n━━━ POST ━━━━━━━━━━━━━━━━━━━━━━━━━\nPLATFORM: LinkedIn\nTYPE: <tipo>\nPILLAR: <pilar temático>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n<cuerpo del post>\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nCTA: <call to action>\nHASHTAGS: <hashtags>\n\nSepará cada post con ---. Empezá el archivo con # <FECHA>. Tono: informal argentino, orientado a builders y devs. Cada post entre 150-300 palabras."
  }'
```

Use `timeout: 120000` on the Bash call.

Parse the SSE response: collect all `content` chunks from `data:` lines. The final text is the combined content.

Then **save the generated content** to the drafts file:

```bash
DRAFTS_DIR="$(git rev-parse --show-toplevel 2>/dev/null)/content/drafts"
mkdir -p "$DRAFTS_DIR"
```

Write the generated content to `content/drafts/<DATE>.md` using the Write tool. Make sure the file starts with `# <DATE>` and each post follows the `## POST N — Title` format so the dashboard parser can read it.

## Step 3B: Research Mode — Generate from Database

Check available research:

```bash
curl -s http://127.0.0.1:5679/api/research | python3 -c "
import sys, json
data = json.load(sys.stdin)
if not data:
    print('NO_RESEARCH')
else:
    for r in data[:10]:
        print(f\"  [{r.get('id')}] {r.get('title', 'Untitled')} — {r.get('category', 'general')}\")
    print(f'\nTotal: {len(data)} entries available')
"
```

If `NO_RESEARCH`: tell the user "No research entries found. Give me a topic instead, or run `/eddie-research` first."

Otherwise, call the content generation API:

```bash
DATE=$(date +%Y-%m-%d)
curl -s -X POST http://127.0.0.1:5679/api/content/generate \
  -H "Content-Type: application/json" \
  -d '{"date":"<DATE>","platforms":["LinkedIn"],"postCount":<COUNT>}'
```

Use `timeout: 120000`.

**Important:** The content generator may produce markdown in a format the dashboard doesn't parse. After generation, read the file and verify each post starts with `## POST N — Title`. If not, rewrite it in the correct format using the Write tool.

## Step 4: Parse User Options

The user can optionally specify:
- **Number of posts:** `/eddie-content 3 posts about X` (default: 3)
- **Platform:** `/eddie-content for X` (default: LinkedIn)
- **Date:** defaults to today (YYYY-MM-DD)

## Step 5: Report Results

Show the user:

1. **Summary:** "Pixel generated N posts for <date>"
2. **For each post:** Title and first 2 lines of the body
3. **File location:** "Drafts saved to: content/drafts/<date>.md"
4. **Suggest next steps:**
   - "Edit the drafts if needed, then `/eddie-publish` to go live"
   - "View them in the dashboard: `/eddie-dashboard`"

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| Connection refused | Server not running | Run: `.claude/skills/eddie/bin/eddie-server start` |
| 500 error | AI API issue | Check: `ANTHROPIC_API_KEY` in `.env`. Logs: `cat /tmp/eddie-server.log \| tail -20` |
| Empty response | AI returned nothing | Try again or simplify the topic |
| Posts don't show in dashboard | Wrong markdown format | The file must use `## POST N — Title` format. Rewrite if needed. |

---
name: eddie-5-hyperframes
description: "Step 5: HyperFrames agent — creates interactive branching video experiences with HeyGen HyperFrames. Define decision trees, generate scripts per branch, and produce multi-path videos."
allowed-tools: [Bash, Read, Write, Glob, Grep, AskUserQuestion]
---

# /eddie-5-hyperframes

Director HyperFrames — creates interactive branching videos using HeyGen's HyperFrames feature.
Instead of a single video, you define a decision tree: viewers choose their path and get a personalized experience.

## What are HyperFrames?

HyperFrames is a HeyGen feature that allows creating interactive videos with decision branches.
Example: A video starts with "What's your main challenge?" → viewer picks option A or B → each path plays a different video tailored to that answer.

Use cases:
- Sales videos that adapt to company size / role / problem
- Onboarding videos with different tracks
- Lead qualification through video choices
- Product demos that focus on relevant features

## Step 1: Ensure Server Running

```bash
curl -sf http://127.0.0.1:5679/api/health >/dev/null 2>&1 || "$(git rev-parse --show-toplevel 2>/dev/null)/dashboard/../.claude/skills/eddie/bin/eddie-server" start
```

## Step 2: Read Voice Templates

Read these to maintain brand voice across all branches:

1. `prompts/base-voice.md` — Eddie's voice definition
2. `prompts/video-script.md` — script format rules

## Step 3: Define the Decision Tree

Ask the user (via AskUserQuestion) if they haven't provided it:

"Para armar el HyperFrame necesito el árbol de decisión. Describí:
1. El tema del video
2. La pregunta de decisión principal (ej: '¿Sos una startup o una empresa grande?')
3. Las opciones (máximo 3)
4. Qué mensaje o CTA querés para cada opción"

Example structure:
```
ROOT: "¿Cuál es tu mayor desafío con el marketing?"
├── A: "No tengo tiempo" → focus on automation
├── B: "No sé qué contenido crear" → focus on research + writing
└── C: "No llego a mi audiencia" → focus on distribution + TikTok
```

## Step 4: Generate Scripts for Each Branch

For each node in the tree, generate a spoken script:

- **Root video**: 40-60 words. Hook + question + instructions to choose.
- **Branch videos**: 60-100 words each. CONTEXT → INSIGHT → CTA specific to that path.
- All scripts follow base-voice.md (informal argentino, direct, no AI slop)
- Plain text only — no markdown, no bullet points

Show all scripts together for review:

```
ROOT (40 words):
"[script]"

RAMA A — [label] (70 words):
"[script]"

RAMA B — [label] (65 words):
"[script]"
```

## Step 5: Preview and Confirm

Show the full tree with all scripts via AskUserQuestion:

"Este es el árbol de HyperFrames que generé. ¿Lo enviamos a HeyGen para generar los [N] videos?"

Options:
- A) Generar todos los videos — send to HeyGen
- B) Editar scripts — let me adjust
- C) Solo guardar scripts — don't generate yet

If C: save scripts and exit gracefully.

## Step 6: Generate Each Video via HeyGen API

Load credentials:

```bash
HEYGEN_API_KEY=$(grep HEYGEN_API_KEY "$(git rev-parse --show-toplevel 2>/dev/null)/.env" 2>/dev/null | cut -d= -f2 | tr -d '"' | tr -d "'")
HEYGEN_AVATAR_ID=$(grep HEYGEN_AVATAR_ID "$(git rev-parse --show-toplevel 2>/dev/null)/.env" 2>/dev/null | cut -d= -f2 | tr -d '"' | tr -d "'")
```

Generate each video sequentially (root first, then branches):

```bash
curl -s -X POST "https://api.heygen.com/v2/video/generate" \
  -H "X-Api-Key: $HEYGEN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "video_inputs": [{
      "character": {
        "type": "avatar",
        "avatar_id": "<AVATAR_ID>"
      },
      "voice": {
        "type": "text",
        "input_text": "<SCRIPT_FOR_THIS_NODE>",
        "voice_id": "<VOICE_ID_IF_SET>"
      }
    }],
    "dimension": {"width": 1080, "height": 1920}
  }'
```

Poll each video (5s intervals, max 3 minutes) before starting the next one.
Report progress: "Generando video ROOT... ✓ Generando RAMA A... ✓"

## Step 7: Save Everything

After all videos are generated, save a HyperFrame manifest:

Write to `content/videos/<date>/hyperframe-<topic-slug>/manifest.md`:

```markdown
# HyperFrame: <TOPIC>
Date: <DATE>

## Decision Tree
ROOT: <question>
├── A: <label> → <video_url_a>
├── B: <label> → <video_url_b>
└── C: <label> → <video_url_c>

## Scripts

### ROOT
<root_script>

### RAMA A — <label>
<script_a>

### RAMA B — <label>
<script_b>
```

Also save each video URL as a research entry:

```bash
curl -s -X POST http://127.0.0.1:5679/api/research \
  -H "Content-Type: application/json" \
  -d '{
    "title": "HyperFrame: <TOPIC> — <BRANCH_LABEL>",
    "summary": "Video interactivo rama <N>. HyperFrames HeyGen.",
    "content": "<SCRIPT>",
    "tags": "video,heygen,hyperframes,<topic_tags>",
    "category": "video",
    "sourceUrl": "<VIDEO_URL>"
  }'
```

## Step 8: Report + Next Steps

Show summary:
```
✅ HyperFrame generado: <TOPIC>
━━━━━━━━━━━━━━━━━━━━━━━━━
ROOT:   <url>
RAMA A: <url>
RAMA B: <url>
━━━━━━━━━━━━━━━━━━━━━━━━━
Guardado en: content/videos/<date>/hyperframe-<slug>/
```

Tell user:
- "Para armarlo en HeyGen, entrá a app.heygen.com/hyperframes, creá un nuevo proyecto y conectá los videos por su URL"
- "Sugerencia: usá el ROOT como primer video del funnel y las RAMAS como respuesta a objeciones específicas"
- "Para distribuirlo: `/eddie-3-publish` para LinkedIn, o subirlo manual a TikTok"

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| HEYGEN_API_KEY not found | Missing .env | Add `HEYGEN_API_KEY=your_key` to .env |
| HEYGEN_AVATAR_ID not found | Missing .env | Add `HEYGEN_AVATAR_ID=your_id` to .env |
| Video generation failed | Script too long or HeyGen error | Root ≤60 words, branches ≤100 words |
| Timeout | HeyGen busy | Check app.heygen.com/videos — may still be processing |
| Too many videos | Rate limit | Generate 2-3 branches max per session |

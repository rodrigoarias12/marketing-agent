---
name: eddie-5-hyperframes
description: "Step 5: HyperFrames agent — creates interactive branching video experiences with HeyGen HyperFrames. Two modes: decision-tree branching videos, or URL-to-video (paste a webpage URL and get a full video script)."
allowed-tools: [Bash, Read, Write, Glob, Grep, AskUserQuestion]
---

# /eddie-5-hyperframes

Director HyperFrames — two modes:

- **URL mode**: paste a URL (product page, blog post, landing page) → Eddie extracts the content and generates a video script ready for HeyGen
- **Branch mode**: define a decision tree → Eddie generates scripts for each branch and produces multi-path interactive videos

## Step 1: Ensure Server Running

```bash
curl -sf http://127.0.0.1:5679/api/health >/dev/null 2>&1 || "$(git rev-parse --show-toplevel 2>/dev/null)/dashboard/../.claude/skills/eddie/bin/eddie-server" start
```

## Step 2: Read Voice Templates

```
prompts/base-voice.md   — Eddie's voice and tone
prompts/video-script.md — script format and rules
```

## Step 3: Detect Mode

Read the user's input:

- If user provides a **URL** (starts with http/https) → **URL-to-video mode** (Step 4A)
- If user describes a **decision tree** or **branching video** → **Branch mode** (Step 4B)
- If no input → ask: "¿Tenés una URL para convertir en video, o querés armar un video con ramas de decisión?"

---

## Step 4A: URL-to-Video Mode

### Step 4A-1: Fetch the URL

Use WebFetch to read the target page:

```
WebFetch(url, "Extract: page title, main headline, key selling points or arguments (3-5 bullets), any stats or social proof, call to action. Return structured text only.")
```

### Step 4A-2: Generate Video Script

Using the extracted content + base-voice.md + video-script.md, generate a spoken script:

Structure (HOOK → PROBLEM → SOLUTION → PROOF → CTA):
- **HOOK** (10-15 words): arranca con una pregunta o afirmación provocadora relacionada al contenido de la página
- **PROBLEM** (20-30 words): el dolor o necesidad que la página resuelve
- **SOLUTION** (30-40 words): qué ofrece la página/producto, en lenguaje simple y directo
- **PROOF** (15-20 words): stat, testimonio, o resultado concreto si aparece en la página
- **CTA** (10-15 words): acción clara y directa

Total: 80-130 palabras. Texto plano, sin markdown, tono informal argentino.

### Step 4A-3: Ask the user if they also want a HyperFrames version

"¿Querés solo este script para HeyGen, o también armamos una versión HyperFrames con ramas (ej: 'Soy startup' vs 'Soy empresa')?"

- If just script → go to Step 5 (preview + confirm)
- If HyperFrames branches → continue to generate branch scripts from the same URL content

---

## Step 4B: Branch Mode

### Step 4B-1: Define the Decision Tree

Ask the user (via AskUserQuestion) if they haven't provided it:

"Para armar el HyperFrame necesito:
1. El tema del video (o una URL de referencia)
2. La pregunta de decisión principal (ej: '¿Sos una startup o una empresa grande?')
3. Las opciones y qué mensaje querés para cada una (máximo 3 ramas)"

Example tree:
```
ROOT: "¿Cuál es tu mayor desafío con el marketing?"
├── A: "No tengo tiempo" → focus: automatización
├── B: "No sé qué crear" → focus: research + contenido
└── C: "No llego a mi audiencia" → focus: distribución TikTok
```

### Step 4B-2: Generate Scripts per Branch

For each node, generate a spoken script following base-voice.md:

- **Root video**: 40-60 words. Hook + pregunta + instrucción de elegir.
- **Branch videos**: 60-100 words cada una. CONTEXT → INSIGHT → CTA específico al camino.

All plain text, no markdown, informal argentino.

---

## Step 5: Preview + Confirm

Show all scripts to the user:

```
━━━ SCRIPT PREVIEW ━━━━━━━━━━━━━━━━
[URL mode]
SCRIPT (~110 palabras, ~44 seg):
"[script text]"

[Branch mode]
ROOT (~50 palabras):
"[root script]"

RAMA A — [label] (~70 palabras):
"[script a]"

RAMA B — [label] (~65 palabras):
"[script b]"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Ask via AskUserQuestion: "¿Lo mandamos a HeyGen para generar el video?"
Options:
- A) Generar video(s) — send to HeyGen
- B) Editar script — let me adjust
- C) Solo guardar el script — don't generate yet

If C: save scripts and stop gracefully.

---

## Step 6: Generate Videos via HeyGen API

Load credentials:

```bash
HEYGEN_API_KEY=$(grep HEYGEN_API_KEY "$(git rev-parse --show-toplevel 2>/dev/null)/.env" 2>/dev/null | cut -d= -f2 | tr -d '"' | tr -d "'")
HEYGEN_AVATAR_ID=$(grep HEYGEN_AVATAR_ID "$(git rev-parse --show-toplevel 2>/dev/null)/.env" 2>/dev/null | cut -d= -f2 | tr -d '"' | tr -d "'")
```

Generate each video:

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
        "input_text": "<SCRIPT_TEXT>",
        "voice_id": "<VOICE_ID_IF_SET>"
      }
    }],
    "dimension": {"width": 1080, "height": 1920}
  }'
```

Poll every 5s, max 3 minutes. Report: "Generando video... ✓"

---

## Step 7: Save Manifest + Report

Write to `content/videos/<date>/hyperframe-<slug>/manifest.md`:

```markdown
# HyperFrame: <TOPIC>
Source URL: <url if applicable>
Date: <DATE>

## Decision Tree (if branch mode)
ROOT: <question>
├── A: <label> → <video_url_a>
└── B: <label> → <video_url_b>

## Scripts
### ROOT / MAIN
<script>

### RAMA A — <label>
<script_a>
```

Save each URL to Eddie's DB:

```bash
curl -s -X POST http://127.0.0.1:5679/api/research \
  -H "Content-Type: application/json" \
  -d '{
    "title": "HyperFrame: <TOPIC> — <BRANCH>",
    "summary": "Video generado desde <URL o tema>",
    "content": "<script>",
    "tags": "video,heygen,hyperframes",
    "category": "video",
    "sourceUrl": "<video_url>"
  }'
```

Report to user:
```
✅ HyperFrame listo: <TOPIC>
━━━━━━━━━━━━━━━━━━━━━━━
Video: <url>
Script: <word_count> palabras (~<sec> seg)
Guardado en: content/videos/<date>/
━━━━━━━━━━━━━━━━━━━━━━━
Para subir a TikTok: bajá el video desde HeyGen y publicalo manual.
Para LinkedIn: /eddie-3-publish
```

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| WebFetch fails on URL | Page behind auth or JS-only | Pedile al usuario que pegue el texto de la página en vez de la URL |
| HEYGEN_API_KEY not found | Missing .env | Agregá `HEYGEN_API_KEY=tu_key` al .env |
| Video failed | Script muy largo | Root ≤60 palabras, ramas ≤100 palabras |
| Timeout | HeyGen ocupado | Revisar app.heygen.com/videos — puede seguir procesando |

---
name: eddie-4-video
description: "Step 4: Director video agent — generates video scripts and creates HeyGen avatar videos from topics or existing posts."
allowed-tools: [Bash, Read, Write, Glob, Grep, AskUserQuestion]
---

# /eddie-4-video

Director, the video agent. Generates spoken scripts optimized for HeyGen avatar videos.
Two modes: create from a topic, or convert an existing LinkedIn post into a video script.

## Step 1: Ensure Server Running

```bash
curl -sf http://127.0.0.1:5679/api/health >/dev/null 2>&1 || "$(git rev-parse --show-toplevel 2>/dev/null)/dashboard/../.claude/skills/eddie/bin/eddie-server" start
```

## Step 2: Read Prompt Templates

Read these files to guide script generation:

1. `prompts/base-voice.md` — Eddie's voice and tone definition
2. `prompts/video-script.md` — video script format and rules (for new topics)
3. `prompts/post-to-video.md` — conversion rules (when transforming a post)

Use the Read tool to read these from the project root. Concatenate base-voice + the relevant template to form the generation context.

## Step 3: Detect Mode

Read the user's input:

- If the user provides a **topic or idea** (e.g., "hacé un video sobre AI agents en LATAM") → **Topic mode** (Step 4A)
- If the user references an **existing post** (e.g., "convertí el post 4 de hoy en video", "video del post sobre Eddie") → **Post-to-video mode** (Step 4B)
- If **no input**, ask: "About what topic should Director create a video? Or give me a post to convert."

## Step 4A: Topic Mode — Generate Script from Scratch

Using the base-voice + video-script templates as context, generate a spoken script for the given topic.

The script must:
- Be 80-150 words (30-60 seconds spoken)
- Follow the HOOK → CONTEXT → INSIGHT → CLOSE structure
- Be plain text only (no markdown formatting)
- Sound natural when spoken (not read)

## Step 4B: Post-to-Video Mode — Convert Existing Post

1. Fetch today's drafts to find the referenced post:

```bash
TODAY=$(date +%Y-%m-%d)
curl -s "http://127.0.0.1:5679/api/drafts/$TODAY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for p in data:
    print(f'Post {p.get(\"number\")}: {p.get(\"headerDescription\", \"?\")}')
"
```

2. Read the post body from `content/drafts/<date>.md`
3. Using the base-voice + post-to-video templates, transform the written post into a spoken script
4. Apply all conversion rules: strip formatting, shorten, add speech markers

## Step 5: Preview Script + Confirmation

**IMPORTANT: Always show the script before sending to HeyGen.** HeyGen costs credits.

Show the generated script to the user with:
- Word count
- Estimated duration (roughly 2.5 words per second)
- The full script text

Then ask via AskUserQuestion: "This is the script Director generated. Should I send it to HeyGen to create the video?"

Options:
- A) Generate video — send to HeyGen
- B) Edit first — let me adjust the script
- C) Cancel — don't generate

If B: ask what to change, regenerate, and preview again.
If C: stop.

## Step 6: Call HeyGen API

After user confirms, call HeyGen to generate the video:

```bash
HEYGEN_API_KEY=$(grep HEYGEN_API_KEY "$(git rev-parse --show-toplevel 2>/dev/null)/.env" 2>/dev/null | cut -d= -f2 | tr -d '"' | tr -d "'")
HEYGEN_AVATAR_ID=$(grep HEYGEN_AVATAR_ID "$(git rev-parse --show-toplevel 2>/dev/null)/.env" 2>/dev/null | cut -d= -f2 | tr -d '"' | tr -d "'")

if [ -z "$HEYGEN_API_KEY" ]; then
  echo "ERROR: HEYGEN_API_KEY not found in .env"
  echo "Get your key at https://app.heygen.com/settings and add it to .env"
  exit 1
fi

if [ -z "$HEYGEN_AVATAR_ID" ]; then
  echo "ERROR: HEYGEN_AVATAR_ID not found in .env"
  echo "Find your avatar ID at https://app.heygen.com/avatars"
  exit 1
fi
```

Then create the video:

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

This returns: `{ "data": { "video_id": "..." } }`

## Step 7: Poll for Completion

HeyGen takes 30-120 seconds to generate a video. Poll with progress updates:

```bash
VIDEO_ID="<from step 6>"
for i in $(seq 1 36); do
  sleep 5
  RESULT=$(curl -s "https://api.heygen.com/v1/video_status.get?video_id=$VIDEO_ID" \
    -H "X-Api-Key: $HEYGEN_API_KEY")
  STATUS=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('status','unknown'))")

  if [ "$STATUS" = "completed" ]; then
    VIDEO_URL=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('video_url',''))")
    echo "DONE: $VIDEO_URL"
    break
  elif [ "$STATUS" = "failed" ]; then
    ERROR=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('error','Unknown error'))")
    echo "FAILED: $ERROR"
    break
  fi

  echo "Generating video... ${i}0s elapsed (status: $STATUS)"
done
```

Between polls, report progress to the user: "Director is generating your video... 30s elapsed..."

Max wait: 3 minutes (36 polls x 5s). If timeout: "Video generation is taking longer than expected. The video may still be processing. Check HeyGen dashboard at app.heygen.com"

## Step 8: Save and Report

After the video is generated:

1. **Save to Eddie's database** as a research entry:

```bash
curl -s -X POST http://127.0.0.1:5679/api/research \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Video: <TOPIC_OR_POST_TITLE>",
    "summary": "Video generado por Director via HeyGen. Duración: ~<DURATION>s",
    "content": "<FULL_SCRIPT_TEXT>",
    "tags": "video,heygen,<topic_tags>",
    "category": "video",
    "sourceUrl": "<VIDEO_URL>"
  }'
```

2. **Save script to filesystem**:

```bash
VIDEOS_DIR="$(git rev-parse --show-toplevel 2>/dev/null)/content/videos/$(date +%Y-%m-%d)"
mkdir -p "$VIDEOS_DIR"
```

Write the script to `content/videos/<date>/<title-slug>.md` using the Write tool.

3. **Report to user**:
   - "Director generated your video"
   - Video URL (clickable)
   - Script word count and estimated duration
   - "Saved to Eddie's database and content/videos/"
   - Suggest: "Share this on TikTok/Reels. Run `/eddie-dashboard` to see all your content."

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| HEYGEN_API_KEY not found | Missing from .env | Add `HEYGEN_API_KEY=your_key` to .env. Get key: https://app.heygen.com/settings |
| HEYGEN_AVATAR_ID not found | Missing from .env | Add `HEYGEN_AVATAR_ID=your_id` to .env. Find ID: https://app.heygen.com/avatars |
| 401 Unauthorized | Invalid or expired API key | Regenerate key at https://app.heygen.com/settings |
| 429 Too Many Requests | Rate limit hit | Wait a few minutes and try again |
| Video status "failed" | HeyGen generation error | Check script length (max ~500 words). Try shorter script. |
| Timeout (>3 min) | Complex video or HeyGen busy | Video may still be processing. Check https://app.heygen.com/videos |
| Connection refused on save | Eddie server not running | Run: `.claude/skills/eddie/bin/eddie-server start` |

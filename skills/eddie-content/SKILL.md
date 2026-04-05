---
name: eddie-content
description: "Run Pixel content agent — generates LinkedIn/X posts from research findings in Eddie's database."
allowed-tools: [Bash, Read, Write, Glob, Grep, AskUserQuestion]
---

# /eddie-content

Pixel, the content agent. Generates social media posts (LinkedIn, X) from research findings stored in Eddie's database.

## Step 1: Ensure Server Running

```bash
curl -sf http://127.0.0.1:5679/api/health >/dev/null 2>&1 || "$(git rev-parse --show-toplevel 2>/dev/null)/dashboard/../.claude/skills/eddie/bin/eddie-server" start
```

## Step 2: Check Available Research

Before generating content, check what research is available:

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

If `NO_RESEARCH` is returned, tell the user: "No research entries found. Run `/eddie-research \"<topic>\"` first to gather material for content generation."

## Step 3: Parse User Input

The user can optionally specify:
- A date for the content: `/eddie-content 2026-04-05`
- Platform preference: `/eddie-content linkedin`
- Number of posts: `/eddie-content 5 posts`

Defaults:
- **date:** today's date (YYYY-MM-DD)
- **platforms:** `["LinkedIn"]`
- **postCount:** 3

## Step 4: Generate Content

Call the content generation API:

```bash
curl -s -X POST http://127.0.0.1:5679/api/content/generate \
  -H "Content-Type: application/json" \
  -d '{"date":"<DATE>","platforms":["LinkedIn"],"postCount":<COUNT>}'
```

This returns: `{ "success": true, "posts": [...], "filePath": "..." }`

Use `timeout: 120000` on the Bash call — content generation involves AI and may take 30-60 seconds.

## Step 5: Report Results

Show the user:

1. **Summary:** "Pixel generated N posts for <date>"
2. **For each post:** Show a preview (first 100 chars of the body)
3. **File location:** "Drafts saved to: <filePath>"
4. **Suggest next steps:**
   - "Review and edit the drafts in the file, or via `/eddie-dashboard`"
   - "When ready, run `/eddie-publish` to publish approved content"

## Step 6: Show Draft Preview

Read the generated file to show the user what was created:

```bash
if [ -n "<FILE_PATH>" ] && [ -f "<FILE_PATH>" ]; then
  head -60 "<FILE_PATH>"
fi
```

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| Connection refused | Server not running | Run: `.claude/skills/eddie/bin/eddie-server start` |
| "No research" in response | No research entries to base content on | Run `/eddie-research "<topic>"` first |
| 500 error | AI API issue (Anthropic/Gemini) | Check: `ANTHROPIC_API_KEY` in `.env`. Logs: `cat /tmp/eddie-server.log \| tail -20` |
| Empty posts array | Generation succeeded but no output | Try with specific researchIds or different date |

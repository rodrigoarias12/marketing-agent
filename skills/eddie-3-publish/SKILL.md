---
name: eddie-3-publish
description: "Step 3: Link publish — approves and publishes content to LinkedIn, X, or TikTok."
allowed-tools: [Bash, Read, Write, AskUserQuestion]
---

# /eddie-3-publish

Link, the publish agent. Publishes approved content to social media platforms (LinkedIn, X, TikTok).

## Step 1: Ensure Server Running

```bash
curl -sf http://127.0.0.1:5679/api/health >/dev/null 2>&1 || "$(git rev-parse --show-toplevel 2>/dev/null)/dashboard/../.claude/skills/eddie/bin/eddie-server" start
```

## Step 2: Check What's Ready to Publish

Fetch content status to find publishable posts. Check today and recent dates:

```bash
TODAY=$(date +%Y-%m-%d)
curl -s "http://127.0.0.1:5679/api/publish/status/$TODAY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if not data:
    print('NO_CONTENT_TODAY')
else:
    for p in data:
        status = p.get('status', 'draft')
        num = p.get('postNumber', '?')
        platform = p.get('platform', 'linkedin')
        url = p.get('publishedUrl', '')
        print(f\"  Post {num}: {status} ({platform}){' — ' + url if url else ''}\")
"
```

If `NO_CONTENT_TODAY`, check if the user specified a date. If not, check the most recent drafts:

```bash
curl -s http://127.0.0.1:5679/api/drafts | python3 -c "
import sys, json
data = json.load(sys.stdin)
for d in data[:5]:
    print(f\"  {d.get('date')} — {d.get('postCount', 0)} posts\")
"
```

## Step 3: Parse User Input

The user can specify:
- A date: `/eddie-publish 2026-04-05`
- A specific post: `/eddie-publish post 2`
- A platform: `/eddie-publish linkedin`
- Publish all approved: `/eddie-publish all`

Defaults:
- **date:** today
- **platform:** `linkedin`

## Step 4: Approve Content Before Publishing

Content must be approved before it can be published. For each post the user wants to publish:

### 4a: Show the post content for review

```bash
curl -s "http://127.0.0.1:5679/api/drafts/<DATE>" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for p in data:
    num = p.get('number', '?')
    title = p.get('title', 'Untitled')
    body = p.get('body', '')[:200]
    status = p.get('statusInfo', {}).get('status', 'draft')
    print(f'--- Post {num}: {title} [{status}] ---')
    print(body)
    print()
"
```

### 4b: Ask for approval

Use AskUserQuestion to confirm which posts to publish. Show the post previews and ask:
"Which posts should I approve and publish?"

### 4c: Approve the post

```bash
curl -s -X PUT http://127.0.0.1:5679/api/publish/approve \
  -H "Content-Type: application/json" \
  -d '{"date":"<DATE>","postNumber":<NUM>,"platform":"<PLATFORM>"}'
```

## Step 5: Publish

After approval, publish each post:

```bash
curl -s -X POST http://127.0.0.1:5679/api/publish \
  -H "Content-Type: application/json" \
  -d '{"date":"<DATE>","postNumber":<NUM>,"platform":"<PLATFORM>"}'
```

This returns: `{ "success": true, "postUrl": "...", "message": "..." }`

## Step 6: Report Results

For each published post, show:
1. **Status:** "Published successfully"
2. **URL:** The live post URL
3. **Platform:** Where it was published

After all posts are published:
- "Published N posts to <platform>. Check `/eddie-dashboard` for KPIs."

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| "Post already published" | Re-publishing attempt | Post is live, check the URL in status |
| "LINKEDIN_ACCESS_TOKEN required" | Missing credentials | Add `LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_PERSON_URN` to `.env` |
| "Post is currently being published" | Concurrent publish | Wait a moment and check status again |
| "Plataforma no soportada" | Unsupported platform | Supported: linkedin, twitter, tiktok |
| 500 error on publish | LinkedIn API error | Check token expiry. Logs: `cat /tmp/eddie-server.log \| tail -20` |

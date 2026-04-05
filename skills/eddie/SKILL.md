---
name: eddie
description: "Eddie Mission Control orchestrator — routes to the right agent (research, content, publish, prospects, dashboard) or chats with Eddie directly."
allowed-tools: [Bash, Read, Write, Glob, Grep, Agent, AskUserQuestion, Skill]
---

# /eddie

Eddie Mission Control orchestrator. Routes your request to the right specialized agent, or talks to Eddie directly for free-form questions.

## Available Agents

| Command | Agent | What it does |
|---------|-------|-------------|
| `/eddie-research` | Scout | Research a topic via web search + AI analysis |
| `/eddie-content` | Pixel | Generate posts from research findings |
| `/eddie-publish` | Link | Publish approved content to LinkedIn/X |
| `/eddie-prospects` | Pipeline | View/manage prospect pipeline and follow-ups |
| `/eddie-dashboard` | UI | Start dashboard, show KPIs, open browser |

## Step 1: Ensure Server Running

```bash
curl -sf http://127.0.0.1:5679/api/health >/dev/null 2>&1 || "$(git rev-parse --show-toplevel 2>/dev/null)/dashboard/../.claude/skills/eddie/bin/eddie-server" start
```

## Step 2: Understand User Intent

Read the user's message and determine which agent to route to. DO NOT use keyword matching.
Instead, understand the intent:

- **Research/investigation/competitor analysis/market study** → invoke `/eddie-research` via the Skill tool
- **Content creation/posts/drafts/write/generate** → invoke `/eddie-content` via the Skill tool
- **Publish/post to LinkedIn/Twitter/share/go live** → invoke `/eddie-publish` via the Skill tool
- **Prospects/leads/pipeline/follow-up/outreach/CRM** → invoke `/eddie-prospects` via the Skill tool
- **Dashboard/KPIs/metrics/open/show me/status** → invoke `/eddie-dashboard` via the Skill tool
- **Anything else** → use Eddie Chat (Step 3)

When routing, pass the user's original message as the argument to the sub-skill.

## Step 3: Eddie Chat (Free-form)

For general questions, status checks, or multi-topic requests that don't fit a single agent, use Eddie's chat API:

```bash
curl -s -X POST http://127.0.0.1:5679/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"<USER_MESSAGE>"}'
```

This is an SSE endpoint. Use `timeout: 120000` on the Bash call. The response comes as SSE events:
- `{ "tool": "...", "status": "executing" }` — Eddie is using a tool
- `{ "content": "..." }` — text response chunks
- `{ "error": "..." }` — error message
- `[DONE]` — stream complete

Parse the SSE events (lines starting with `data: `) and combine all `content` chunks into the final response. Show tool usage to the user as progress indicators.

## Step 4: Suggest Next Steps

After any action completes, suggest the logical next step:

| After | Suggest |
|-------|---------|
| Research | "Run `/eddie-content` to generate posts from these findings" |
| Content | "Review the drafts, then `/eddie-publish` to go live" |
| Publish | "Check `/eddie-dashboard` for updated KPIs" |
| Prospects | "Run `/eddie-research` on prospects' industries for targeted content" |
| Dashboard | "All agents ready. Try `/eddie-research \"<topic>\"` to get started" |

## Examples

- `/eddie research fintech AI in LATAM` → routes to /eddie-research
- `/eddie generate 5 LinkedIn posts` → routes to /eddie-content
- `/eddie publish today's posts` → routes to /eddie-publish
- `/eddie show me the pipeline` → routes to /eddie-prospects
- `/eddie how many posts did we publish this week?` → uses Eddie Chat
- `/eddie` (no args) → shows available commands and current status

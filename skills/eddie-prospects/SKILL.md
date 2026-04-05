---
name: eddie-prospects
description: "Manage the prospect pipeline — view, filter, follow up, and track leads in Eddie's CRM."
allowed-tools: [Bash, Read, Write, AskUserQuestion]
---

# /eddie-prospects

Manage Eddie's prospect pipeline. View leads by status, trigger follow-ups, and track outreach progress.

## Step 1: Ensure Server Running

```bash
curl -sf http://127.0.0.1:5679/api/health >/dev/null 2>&1 || "$(git rev-parse --show-toplevel 2>/dev/null)/dashboard/../.claude/skills/eddie/bin/eddie-server" start
```

## Step 2: Parse User Intent

The user can request different views:
- `/eddie-prospects` — show pipeline overview
- `/eddie-prospects pending` — show pending prospects
- `/eddie-prospects follow-up` — show prospects needing follow-up
- `/eddie-prospects argentina` — filter by region
- `/eddie-prospects add "Name" "Company"` — add a new prospect

## Step 3: Show Pipeline Overview

Fetch the pipeline board (prospects grouped by status):

```bash
curl -s http://127.0.0.1:5679/api/prospects/pipeline | python3 -c "
import sys, json
data = json.load(sys.stdin)
for status in ['pendiente', 'aceptada', 'dm_sent', 'rechazada']:
    prospects = data.get(status, [])
    print(f'\n=== {status.upper()} ({len(prospects)}) ===')
    for p in prospects[:5]:
        name = p.get('name', 'Unknown')
        company = p.get('company', '')
        region = p.get('region', '')
        print(f'  [{p.get(\"id\")}] {name} — {company} ({region})')
    if len(prospects) > 5:
        print(f'  ... and {len(prospects) - 5} more')
"
```

## Step 4: Handle Specific Actions

### View by status or region

```bash
# By status
curl -s "http://127.0.0.1:5679/api/prospects?status=<STATUS>" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'Found {len(data)} prospects')
for p in data:
    print(f'  [{p.get(\"id\")}] {p.get(\"name\")} — {p.get(\"company\")} | {p.get(\"status\")} | {p.get(\"region\", \"\")}')
"

# By region
curl -s "http://127.0.0.1:5679/api/prospects?region=<REGION>" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'Found {len(data)} prospects in <REGION>')
for p in data:
    print(f'  [{p.get(\"id\")}] {p.get(\"name\")} — {p.get(\"company\")} | {p.get(\"status\")}')
"
```

### Trigger follow-up

For prospects with status "aceptada" that need a follow-up message:

```bash
curl -s -X PUT "http://127.0.0.1:5679/api/prospects/<ID>/followup" \
  -H "Content-Type: application/json" \
  -d '{"messageSent":"<FOLLOW_UP_MESSAGE>"}'
```

Before sending, ask the user to confirm or customize the follow-up message using AskUserQuestion.

### Add a new prospect

```bash
curl -s -X POST http://127.0.0.1:5679/api/prospects \
  -H "Content-Type: application/json" \
  -d '{"name":"<NAME>","company":"<COMPANY>","role":"<ROLE>","region":"<REGION>","status":"pendiente"}'
```

## Step 5: Show KPIs Summary

After any action, show a quick KPI summary:

```bash
curl -s http://127.0.0.1:5679/api/dashboard/kpis | python3 -c "
import sys, json
data = json.load(sys.stdin)
p = data.get('prospects', {})
print(f'Pipeline: {p.get(\"total\", 0)} total | {p.get(\"pendiente\", 0)} pending | {p.get(\"aceptada\", 0)} accepted | {p.get(\"dmSent\", 0)} DM sent')
"
```

## Step 6: Suggest Next Steps

Based on what the user sees:
- Pending prospects: "Review and accept promising leads, then `/eddie-prospects follow-up` to message them"
- Accepted prospects: "Send follow-up DMs with `/eddie-prospects follow-up`"
- Research available: "Link research to prospects for context: see `/eddie-dashboard`"

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| Connection refused | Server not running | Run: `.claude/skills/eddie/bin/eddie-server start` |
| Empty pipeline | No prospects in database | Add prospects via `/eddie-prospects add` or import via dashboard |
| 404 on prospect ID | Invalid prospect | Check ID with `/eddie-prospects` list |

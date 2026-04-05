---
name: eddie-dashboard
description: "Start Eddie's dashboard UI and open it in the browser — shows pixel office, KPIs, content calendar, and prospect pipeline."
allowed-tools: [Bash, Read]
---

# /eddie-dashboard

Start Eddie Mission Control's visual dashboard and open it in the browser. The dashboard shows the pixel art office with AI agents, KPIs, content calendar, prospect pipeline, and research findings.

## Step 1: Ensure API Server Running

```bash
curl -sf http://127.0.0.1:5679/api/health >/dev/null 2>&1 || "$(git rev-parse --show-toplevel 2>/dev/null)/dashboard/../.claude/skills/eddie/bin/eddie-server" start
```

## Step 2: Check if Dashboard (Vite) is Running

```bash
curl -sf http://127.0.0.1:5678 >/dev/null 2>&1 && echo "DASHBOARD_RUNNING" || echo "DASHBOARD_DOWN"
```

## Step 3: Start Dashboard if Needed

If `DASHBOARD_DOWN`:

```bash
cd "$(git rev-parse --show-toplevel 2>/dev/null)/dashboard" && npx vite --host 127.0.0.1 --port 5678 > /tmp/eddie-dashboard.log 2>&1 &
echo $! > /tmp/eddie-dashboard.pid
sleep 3
curl -sf http://127.0.0.1:5678 >/dev/null 2>&1 && echo "Dashboard started on :5678" || echo "Failed to start dashboard"
```

## Step 4: Open in Browser

```bash
open http://127.0.0.1:5678
```

On Linux, use `xdg-open` instead. On WSL, use `wslview` or `cmd.exe /c start`.

## Step 5: Show Quick KPIs in Terminal

Even though the dashboard is opening, show a quick summary in the terminal:

```bash
curl -s http://127.0.0.1:5679/api/dashboard/kpis | python3 -c "
import sys, json
data = json.load(sys.stdin)
p = data.get('prospects', {})
c = data.get('content', {})
r = data.get('research', {})
camp = data.get('campaigns', {})
print('Eddie Mission Control — KPIs')
print('━' * 40)
print(f'Prospects:  {p.get(\"total\", 0)} total ({p.get(\"aceptada\", 0)} accepted)')
print(f'Content:    {c.get(\"published\", 0)} published, {c.get(\"approved\", 0)} approved, {c.get(\"draft\", 0)} drafts')
print(f'Research:   {r.get(\"total\", 0)} entries')
print(f'Campaigns:  {camp.get(\"total\", 0)} active')
print('━' * 40)
print('Dashboard: http://127.0.0.1:5678')
"
```

## Step 6: Show Pending Actions

```bash
curl -s http://127.0.0.1:5679/api/dashboard/pending-actions | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data:
    print('\nPending actions:')
    for a in data:
        print(f'  - {a.get(\"description\", \"\")}')
else:
    print('\nNo pending actions.')
"
```

Tell the user: "Dashboard is open at http://127.0.0.1:5678. The pixel office shows your agents at work."

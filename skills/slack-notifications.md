# Skill: Slack Notifications

## Daily Content Preview
After generating content, send preview to Slack:
```bash
node scripts/notify-slack.mjs              # today's content
node scripts/notify-slack.mjs 2026-02-27   # specific date
```

The preview includes:
- Summary: total posts, platforms, images count
- Each post: platform badge, type, pillar, posting time, text preview
- Publish instructions at the bottom

## Weekly Report
After generating weekly report, send to Slack:
```bash
node scripts/notify-weekly-report-slack.mjs
```

## Publishing Confirmation
When `scripts/publish.mjs` runs, it automatically sends a confirmation to Slack with:
- Status of each published post (success/fail)
- URLs of published posts
- Error details if any failed

## Configuration
Slack webhook URL in .env:
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxx
```

## When to Send
- **After daily content generation:** Always send preview
- **After weekly report:** Always send report
- **After publishing:** Automatic confirmation
- **On errors:** Script failures are logged but Slack notification is best-effort

## Troubleshooting
- "Invalid webhook URL": Check SLACK_WEBHOOK_URL in .env
- "Channel not found": Webhook may have been deleted. Recreate at api.slack.com
- Messages not appearing: Check the webhook channel in Slack app settings

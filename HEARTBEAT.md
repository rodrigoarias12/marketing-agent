# HEARTBEAT.md — Marketing Agent Periodic Tasks

## On Every Heartbeat

1. **Check content calendar** — Is there content scheduled for today that hasn't been generated?
2. **Check drafts folder** — Are there approved drafts ready to publish?
3. **Log performance** — If posts were published today, note initial engagement

## Daily Tasks (run once per day, morning ~8:30 AM UTC-3)

- [ ] Generate today's X posts (2-3 posts)
- [ ] Generate LinkedIn post if it's a posting day (Tue/Wed/Thu)
- [ ] Generate TikTok script if it's a posting day
- [ ] Check trending topics in fintech/crypto for timely content
- [ ] Save all drafts to `content/drafts/YYYY-MM-DD.md`
- [ ] Generate images with `node scripts/generate-images.mjs`
- [ ] **Send Slack preview** with `node scripts/notify-slack.mjs`

## Weekly Tasks (run on Mondays)

- [ ] Generate weekly content calendar
- [ ] Review last week's performance metrics
- [ ] Update MEMORY.md with content insights
- [ ] Identify top 3 performing posts and why they worked
- [ ] Plan content series episodes for the week
- [ ] **Send weekly report to Slack** with `node scripts/notify-weekly-report-slack.mjs`

## Monthly Tasks (run on 1st of month)

- [ ] Generate monthly performance report
- [ ] Update growth targets based on actual performance
- [ ] Review and refresh content strategy
- [ ] Archive old drafts
- [ ] Update TOOLS.md with any new tools/accounts

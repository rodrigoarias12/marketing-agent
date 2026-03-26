# Eddie - AI Marketing Agent

Eddie is an autonomous marketing agent built on [OpenClaw](https://openclaw.dev) that generates content, creates images, and publishes to social media automatically.

## What Eddie Does

- Generates 2-3 daily posts for X (Twitter), LinkedIn, TikTok
- Creates branded images (HTML to PNG with Playwright, or AI-generated with Gemini)
- Publishes carousel posts to LinkedIn (PDF-based swipeable carousels)
- Sends Slack previews for approval before publishing
- Tracks everything with UTM parameters
- Runs on cron jobs (8:30 AM daily content, noon trend check, Monday weekly reports)

## Stack

- **Framework:** [OpenClaw](https://openclaw.dev) (open source AI agent framework)
- **LLM:** Claude (via Anthropic API)
- **Images:** Playwright (HTML to PNG) + Gemini (AI generation)
- **Publishing:** Twitter API v2, LinkedIn REST API, Slack Socket Mode
- **Tracking:** UTM automation on every link

## Project Structure

```
SOUL.md              # Eddie's personality, strategy, and rules
IDENTITY.md          # Agent identity config
USER.md              # Your founder profile (customize this!)
HEARTBEAT.md         # Cron job schedules
TOOLS.md             # Available tools and permissions
skills/              # Skill definitions (content gen, publishing, etc.)
scripts/             # Publishing and image generation scripts
  publish-twitter.mjs
  publish-linkedin.mjs
  publish-linkedin-carousel.mjs
  generate-images.mjs        # HTML to PNG (Playwright)
  generate-image-ai.mjs      # AI image gen (Gemini)
  notify-slack.mjs
content/
  drafts/            # Generated content drafts by date
  images/            # Generated images (HTML sources + PNGs)
  published/         # Published content log
```

## Setup

1. Clone and install:
```bash
git clone <this-repo>
cd eddie-marketing-agent
npm install
npx playwright install chromium
```

2. Copy `.env.example` to `.env` and fill in your API keys:
```bash
cp .env.example .env
```

3. Configure APIs (see `docs/API-SETUP-GUIDE.md`):
   - **Slack:** Create app with Socket Mode, get Bot Token + App Token
   - **Twitter/X:** Create app inside a Project (required for API v2), get Consumer Keys + Access Tokens
   - **LinkedIn:** Create app, add "Share on LinkedIn" + "Sign In with OpenID Connect" products
   - **Gemini:** Get API key from [Google AI Studio](https://aistudio.google.com/apikey) (requires billing for image generation)

4. Customize your brand:
   - Edit `USER.md` with your founder profile
   - Edit `SOUL.md` to adjust tone, pillars, and strategy
   - Edit `skills/image-generation.md` to set your brand colors

5. Run with OpenClaw:
```bash
openclaw gateway --port 18789 --verbose
```

Or run scripts directly:
```bash
# Generate images for today's draft
node scripts/generate-images.mjs --date 2026-03-04

# Publish to LinkedIn
node scripts/publish-linkedin.mjs --date 2026-03-04 --post 4

# Publish carousel to LinkedIn
node scripts/publish-linkedin-carousel.mjs \
  --slides "slide1.png,slide2.png,slide3.png" \
  --text "Post text here" \
  --title "Carousel Title"

# Send Slack notification
node scripts/notify-slack.mjs --date 2026-03-04
```

## Content Strategy

Eddie follows a 4-pillar content strategy (customize weights in SOUL.md):

| Pillar | Weight | Focus |
|--------|--------|-------|
| Building in Public | 40% | Progress, demos, behind the scenes |
| Industry Insights | 25% | Market insights, trends, regulation |
| Product & Tech | 20% | Features, architecture, integrations |
| Founder Journey | 15% | Lessons, failures, growth |

## How It Works

1. **8:30 AM** - Eddie generates daily content batch (drafts + image descriptions)
2. **Preview** - Sends formatted preview to Slack for approval
3. **Approve** - You review and approve (or request changes)
4. **Publish** - Eddie publishes to the right platforms with images and UTM tracking
5. **Track** - All published content is logged with UTMs for analytics

## Chat with Eddie

Eddie runs as a bidirectional Slack bot. DM him to:
- Ask for content ideas
- Request publishing
- Check what's scheduled
- Generate new images

## License

MIT

Built with [OpenClaw](https://openclaw.dev) + [Claude](https://claude.ai)

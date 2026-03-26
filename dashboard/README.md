<p align="center">
  <img src="docs/logo.png" alt="Eddie Mission Control" width="120" />
</p>

<h1 align="center">Eddie Mission Control</h1>

<p align="center">
  <strong>Your AI Marketing Team, Visualized</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-blue.svg" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-19-61DAFB.svg" alt="React" />
  <img src="https://img.shields.io/badge/Express-5-000000.svg" alt="Express" />
  <img src="https://img.shields.io/badge/PixiJS-8-E72264.svg" alt="PixiJS" />
</p>

---

## Overview

Eddie Mission Control is an AI-powered marketing operations dashboard with five autonomous agents. Monitor campaigns, approve content, track prospects, and run competitive research — all orchestrated by Eddie, your AI marketing lead.

| Agent | Role |
|-------|------|
| **Eddie** | Orchestrator — plans campaigns, delegates tasks, answers questions |
| **Scout** | Researcher — scrapes competitors, analyzes trends, gathers intel |
| **Pixel** | Content creator — writes posts, generates images, adapts tone |
| **Link** | Publisher — schedules posts to Twitter, LinkedIn, Slack |
| **Analyst** | Data analyst — tracks KPIs, scores prospects, surfaces insights |

---

## Screenshots

![Dashboard](docs/screenshot-dashboard.png)
*Mission Control — KPIs, activity feed, and pending actions at a glance*

![Pixel Office](docs/screenshot-office.png)
*The Agent Squad — real-time agent monitoring*

![Eddie Chat](docs/screenshot-chat.png)
*Eddie Chat — conversational AI with full platform access*

---

## Features

### 🏠 Mission Control
KPI cards, real-time activity feed, and a pending-actions queue so you always know what needs attention.

### 📅 Content Calendar
Weekly calendar view with draft previews. Approve, edit, or publish posts directly from the timeline.

### 🎯 Prospects Pipeline
Kanban-style board to track leads from discovery through outreach. Built-in follow-up engine keeps conversations moving.

### 🔬 Research Hub
Configure research targets, run auto-research jobs against competitors, and browse structured findings by topic.

### 📊 Research Pipeline
End-to-end workflow: **Search** the web, **Scrape** pages with Cheerio, **Analyze** content with AI, and **Generate** ready-to-publish marketing assets.

### 🤖 Agent Squad
A real-time agent dashboard where each agent has status indicators and task assignments. Watch them work in real time via SSE.

### 💬 Eddie Chat
Natural-language interface to Eddie with tool access to every part of the platform — drafts, prospects, research, publishing, and more.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│   React 19 · Vite 6 · Tailwind CSS 4            │
│                                                  │
│  Home │ Content │ Prospects │ Research │ Agents │ Chat
└──────────────────┬──────────────────────────────┘
                   │  REST + SSE
┌──────────────────┴──────────────────────────────┐
│                   Backend                        │
│        Express 5 · SQLite · Cheerio              │
│                                                  │
│  13 route modules · Agent state machine          │
│  AI API · Web scraper                            │
└─────────────────────────────────────────────────┘
```

**Frontend** — Single-page app with sidebar navigation. Views for dashboard, content calendar, prospects pipeline, research hub, agent squad, and Eddie chat (streaming responses).

**Backend** — Express 5 API server on port 5679. SQLite for persistent storage of drafts, prospects, research entries, and campaigns. Cheerio for web scraping. AI-powered reasoning, content generation, and chat.

**Agent System** — Five specialized agents coordinated by Eddie. Agent state is managed server-side and streamed to the frontend via Server-Sent Events.

---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/[your-github]/marketing-agent.git
cd marketing-agent/dashboard

# Set up environment
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

# Install dependencies
pnpm install

# Start dev server (frontend + API)
pnpm dev
```

Open **http://localhost:5678** in your browser.

> The Vite dev server runs on port **5678** and the Express API on port **5679**.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | **Yes** | AI API key |
| `MOONSHOT_API_KEY` | No | Alternative AI provider (Moonshot) |
| `TAVILY_API_KEY` | No | Tavily search API for web research |
| `SLACK_WEBHOOK_URL` | No | Slack incoming webhook for publishing |
| `TWITTER_APP_KEY` | No | Twitter/X API app key |
| `TWITTER_APP_SECRET` | No | Twitter/X API app secret |
| `TWITTER_ACCESS_TOKEN` | No | Twitter/X access token |
| `TWITTER_ACCESS_SECRET` | No | Twitter/X access secret |
| `LINKEDIN_CLIENT_ID` | No | LinkedIn OAuth client ID |
| `LINKEDIN_CLIENT_SECRET` | No | LinkedIn OAuth client secret |
| `LINKEDIN_ACCESS_TOKEN` | No | LinkedIn access token |
| `API_PORT` | No | Backend port (default: `5679`) |

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| [React](https://react.dev) | 19 | UI framework |
| [Vite](https://vite.dev) | 6 | Build tool and dev server |
| [TypeScript](https://typescriptlang.org) | 5.8 | Type safety |
| [Tailwind CSS](https://tailwindcss.com) | 4 | Utility-first styling |
| [PixiJS](https://pixijs.com) | 8 | Agent visualization |
| [React Router](https://reactrouter.com) | 7 | Client-side routing |
| [Lucide React](https://lucide.dev) | 0.511 | Icon library |
| [Express](https://expressjs.com) | 5 | API server |
| [Anthropic SDK](https://docs.anthropic.com) | 0.80 | AI integration |
| [OpenAI SDK](https://platform.openai.com) | 6 | Alternative AI provider |
| [Cheerio](https://cheerio.js.org) | 1.2 | HTML parsing and web scraping |
| [SQLite](https://www.sqlite.org) | — | Embedded database |

---

## Project Structure

```
src/
  components/
    agents/        # Agent dashboard + status cards
    chat/          # Eddie AI chat interface (streaming)
    content/       # Content calendar + draft editor
    dashboard/     # KPI cards + activity feed + pending actions
    layout/        # Sidebar navigation
    prospects/     # Pipeline kanban + follow-up engine
    research/      # Research hub + config + pipeline UI
    shared/        # Reusable UI components
  api/             # API client helpers
  types.ts         # Shared TypeScript types

server/
  index.ts         # Express app entry point
  db.ts            # SQLite database setup
  routes/
    agents.ts            # Agent state + commands
    agents-sse.ts        # Agent SSE stream
    campaigns.ts         # Campaign CRUD
    chat.ts              # Eddie chat (streaming)
    content.ts           # Drafts, images, published
    content-generate.ts  # AI content generation
    dashboard.ts         # KPIs, activity, pending
    prospects.ts         # Prospect CRUD
    publish.ts           # Social media publishing
    research.ts          # Research entries CRUD
    research-agent.ts    # Research agent runner
    research-config.ts   # Research config CRUD
    research-pipeline.ts # Pipeline orchestration
  agents/          # Agent state machine + Eddie orchestrator
  lib/             # AI client, research helpers, content generation
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite + Express in parallel (dev mode) |
| `pnpm build` | Type-check and build for production |
| `pnpm start` | Run the production server |
| `pnpm preview` | Preview the production build locally |

---

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create a branch** for your feature or fix (`git checkout -b feat/my-feature`)
3. **Commit** your changes with clear messages
4. **Push** to your fork and open a **Pull Request**

Please make sure your code:
- Passes TypeScript type checking (`pnpm build`)
- Follows the existing code style
- Includes meaningful commit messages

---

## License

MIT License — see [LICENSE](LICENSE) for details.

Copyright (c) 2025 OpenClaw Team

---

## Credits

- Built by [OpenClaw Team](https://github.com/[your-github])
- Part of the [OpenClaw](https://github.com/[your-github]) ecosystem

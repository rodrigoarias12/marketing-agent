# TOOLS.md - Marketing Tools & Config

## Notifications — Slack
- **Method:** Incoming Webhook via @slack/webhook
- **Config:** .env → SLACK_WEBHOOK_URL
- **Script preview diario:** `node scripts/notify-slack.mjs`
- **Script reporte semanal:** `node scripts/notify-weekly-report-slack.mjs`

## Social Media Publishing

### X (Twitter)
- **Handle:** @[completar]
- **API:** twitter-api-v2 (OAuth 1.0a User Context)
- **Config:** .env → TWITTER_APP_KEY, TWITTER_APP_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET
- **Script:** `node scripts/publish-twitter.mjs --date YYYY-MM-DD --post N`
- **Límites:** Free tier: 1,500 tweets/month, 50 req/15min

### LinkedIn
- **Profile:** [completar]
- **API:** REST API v2 (fetch nativo)
- **Config:** .env → LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN
- **Script:** `node scripts/publish-linkedin.mjs --date YYYY-MM-DD --post N`
- **Nota:** Token expira cada 60 días. Renovar con `node scripts/setup/linkedin-auth.mjs`

### TikTok (Phase 2 — manual)
- **Account:** @[completar]
- **Script:** `node scripts/publish-tiktok.mjs` (stub — imprime instrucciones)
- **Nota:** Requiere video. Full automation en Phase 2.

### YouTube (Phase 2 — manual)
- **Channel:** [completar]
- **Script:** `node scripts/publish-youtube.mjs` (stub — imprime instrucciones)
- **Nota:** Requiere video. Full automation en Phase 2.

## Orquestador
- **Publicar todo:** `node scripts/publish.mjs`
- **Por plataforma:** `node scripts/publish.mjs --platform twitter`
- **Por post:** `node scripts/publish.mjs --post 1,3`
- **Fecha específica:** `node scripts/publish.mjs --date 2026-02-27`

## Image Generation
- **Primary:** HTML/CSS → Screenshot via Playwright
- **Script:** `node scripts/generate-images.mjs`
- **Branding:** Paleta [YourBrand] Empresas (ver skills/image-generation.md)

## Content Storage
- Drafts: `./content/drafts/`
- Published: `./content/published/`
- Images: `./content/images/`
- Scripts: `./scripts/`

## Credenciales
- **Ubicación:** `.env` (NO commitear, está en .gitignore)
- **Guía de setup:** `docs/API-SETUP-GUIDE.md`

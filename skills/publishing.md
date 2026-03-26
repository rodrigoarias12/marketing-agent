# Skill: Publishing Content

## Prerequisites
- Content drafts exist in content/drafts/YYYY-MM-DD.md
- Images generated in content/images/YYYY-MM-DD/
- API keys configured in .env

## Publishing Commands

### Publish all today's content
```bash
node scripts/publish.mjs
```

### Publish specific platform
```bash
node scripts/publish.mjs --platform twitter
node scripts/publish.mjs --platform linkedin
```

### Publish specific post
```bash
node scripts/publish.mjs --post 1
node scripts/publish.mjs --post 1,3,4
```

### Publish for a specific date
```bash
node scripts/publish.mjs --date 2026-02-27
```

## Platform-Specific Scripts

### Twitter/X
```bash
node scripts/publish-twitter.mjs --date 2026-02-27 --post 1
node scripts/publish-twitter.mjs --date 2026-02-27 --all-twitter
```
- Thread posts: split on numbered lines (1/ 2/ 3/...)
- First tweet gets the banner image
- Character limit: 280 (free) / 4000+ (Premium)
- Handles media upload automatically

### LinkedIn
```bash
node scripts/publish-linkedin.mjs --date 2026-02-27 --post 4
```
- Single post with optional image
- Image upload is 3-step (initialize, upload binary, reference in post)

### TikTok (manual — Phase 2)
```bash
node scripts/publish-tiktok.mjs --date 2026-02-27 --post 5
```
- Logs content and provides manual posting instructions
- Copies script text and thumbnail path to clipboard

### YouTube (manual — Phase 2)
```bash
node scripts/publish-youtube.mjs --date 2026-02-27
```
- Logs video script and provides manual instructions

## After Publishing
- Results logged to content/published/YYYY-MM-DD.md
- Confirmation sent to Slack with post URLs
- Update memory with publishing status

## Important
- NUNCA publicar sin aprobación explícita de the user
- Siempre enviar preview a Slack primero
- Si algo falla, loguear el error y notificar en Slack

# Skill: Tracking & Analytics

## UTM Convention

### Format
```
https://yoursite.com?utm_source={source}&utm_medium={medium}&utm_campaign={campaign}&utm_content={content}
```

### Source Values
| Value | Platform |
|-------|----------|
| `twitter` | X (Twitter) |
| `linkedin` | LinkedIn |
| `tiktok` | TikTok |
| `instagram` | Instagram |
| `youtube` | YouTube |
| `meta_ads` | Meta Paid Ads |
| `google_ads` | Google Ads |
| `email` | Email campaigns |

### Medium Values
| Value | Type |
|-------|------|
| `organic` | Contenido orgánico |
| `paid` | Advertising pagado |
| `referral` | Referral/partner |
| `email` | Email |

### Campaign Values
| Value | Description |
|-------|-------------|
| `personal_brand` | Personal branding general |
| `weekly_build` | Serie "Building [YourBrand]" semanal |
| `tech_deepdive` | Contenido técnico profundo |
| `market_analysis` | Análisis de mercado |
| `sixty_sec_fintech` | Serie "60 Second Fintech" |
| `product_launch_{feature}` | Lanzamiento de feature |
| `series_{name}` | Serie de contenido nombrada |

### Content ID Format
`{platform}_{YYYYMMDD}_{type}_{seq}`
Ejemplo: `tw_20260227_thread_001`

## Generación de Links

Siempre generar el UTM link y incluirlo en el output del post:

```
UTM: https://yoursite.com?utm_source=twitter&utm_medium=organic&utm_campaign=weekly_build&utm_content=tw_20260227_thread_001
```

## Performance Tracking

### Daily Log Format
Guardar en `content/published/YYYY-MM-DD.md`:

```markdown
# Published Content — YYYY-MM-DD

## Post 1
- Platform: X
- Type: post
- Published: 9:15 AM UTC-3
- Content: [first line of post]
- Image: content/images/2026-02-27/data-card-01.png
- UTM: [full link]
- Performance (24h):
  - Impressions: X
  - Likes: X
  - Comments: X
  - Retweets: X
  - Link clicks: X
  - Engagement rate: X%
```

### Weekly Report Format
Guardar en `memory/weekly-report-YYYY-WNN.md`:

```markdown
# Weekly Marketing Report — Week NN, YYYY

## Summary
- Total posts: X
- Total impressions: X
- Total engagement: X
- Clicks to yoursite.com: X
- Best performing: [post description]

## Per Platform
### X: [followers] followers (+N)
- Posts: N | Impressions: N | Eng rate: N%
### LinkedIn: [connections] (+N)
- Posts: N | Impressions: N | Eng rate: N%
### TikTok: [followers] (+N)
- Videos: N | Views: N | Eng rate: N%
### YouTube: [subs] (+N)
- Videos: N | Views: N | Watch time: N

## Top 3 Posts
1. [Platform] [Content snippet] — [key metric]
2. [Platform] [Content snippet] — [key metric]
3. [Platform] [Content snippet] — [key metric]

## Insights
- [What worked]
- [What didn't]
- [Adjustments for next week]
```

## Growth Targets

### Month 1
| Platform | Followers | Impressions | yoursite.com clicks |
|----------|-----------|-------------|-------------------|
| X | 100+ | 10K+ | 50+ |
| LinkedIn | 50+ | 5K+ | 30+ |
| TikTok | 200+ | 20K+ | 20+ |
| YouTube | 30+ | 1K+ | 10+ |

### Month 3
| Platform | Followers | Impressions | yoursite.com clicks |
|----------|-----------|-------------|-------------------|
| X | 500+ | 50K+ | 200+ |
| LinkedIn | 200+ | 20K+ | 100+ |
| TikTok | 1K+ | 100K+ | 100+ |
| YouTube | 200+ | 10K+ | 50+ |

### Month 6
| Platform | Followers | Impressions | yoursite.com clicks |
|----------|-----------|-------------|-------------------|
| X | 2K+ | 200K+ | 1K+ |
| LinkedIn | 500+ | 50K+ | 300+ |
| TikTok | 5K+ | 500K+ | 500+ |
| YouTube | 1K+ | 50K+ | 200+ |

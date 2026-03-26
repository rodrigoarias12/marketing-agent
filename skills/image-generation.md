# Skill: Image Generation for Marketing

## Overview
Cada post necesita un visual. Esta skill define cómo generar imágenes para cada plataforma y tipo de contenido.

## Dimensiones por Plataforma

| Plataforma | Formato | Dimensiones |
|-----------|---------|-------------|
| X (Twitter) | Landscape | 1200x675 |
| X (Twitter) | Square | 1080x1080 |
| LinkedIn | Post | 1200x627 |
| LinkedIn | Carousel | 1080x1350 |
| TikTok/Reels | Vertical | 1080x1920 |
| YouTube | Thumbnail | 1280x720 |
| YouTube | Banner | 2560x1440 |
| Instagram | Square | 1080x1080 |
| Instagram | Story/Reel | 1080x1920 |

## Tipos de Imágenes

### 1. Infografía / Data Card
**Cuándo:** Posts con métricas, estadísticas, comparaciones
**Cómo generar:** HTML/CSS template → screenshot con Playwright/Puppeteer

```html
<!-- Template base para data card -->
<div style="
  width: 1200px; height: 675px;
  background: linear-gradient(135deg, #0a0d0a 0%, #161f15 100%);
  font-family: 'Inter', sans-serif;
  color: white;
  padding: 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
">
  <div style="font-size: 18px; color: #9ca89b; text-transform: uppercase; letter-spacing: 2px;">
    [BRAND] — MONTHLY UPDATE
  </div>
  <div style="font-size: 64px; font-weight: 800; margin: 20px 0;">
    $XX,XXX MRR
  </div>
  <div style="font-size: 24px; color: #00af75;">
    ↑ 23% vs last month
  </div>
  <div style="
    position: absolute; bottom: 40px; right: 60px;
    font-size: 16px; color: #647063;
  ">
    yoursite.com
  </div>
</div>
```

### 2. Code Screenshot
**Cuándo:** Posts técnicos, stack, implementaciones
**Cómo generar:**
- Carbon (carbon.now.sh) — API o CLI
- Ray.so — code screenshots bonitos
- Manual: screenshot del editor con tema oscuro

**Script para generar:**
```bash
# Usando carbon-now-cli
npx carbon-now-cli code-snippet.js --theme dracula --font-size 16 --padding-horizontal 40 --padding-vertical 30
```

### 3. Carousel Slides
**Cuándo:** LinkedIn carousels, Instagram
**Cómo generar:** HTML/CSS slides individuales → screenshot cada slide

```html
<!-- Slide template -->
<div style="
  width: 1080px; height: 1350px;
  background: #0a0d0a;
  color: white;
  font-family: 'Inter', sans-serif;
  padding: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
">
  <div style="font-size: 24px; color: #00af75; margin-bottom: 30px;">
    01 / 08
  </div>
  <div style="font-size: 56px; font-weight: 800; line-height: 1.2;">
    El título del slide va acá
  </div>
  <div style="font-size: 28px; color: #9ca89b; margin-top: 40px; line-height: 1.6;">
    La explicación o el punto principal del slide.
  </div>
  <!-- Logo bottom -->
  <div style="
    position: absolute; bottom: 60px; left: 80px;
    font-size: 20px; color: #647063;
  ">
    @yourhandle — yoursite.com
  </div>
</div>
```

### 4. YouTube Thumbnail
**Cuándo:** Cada video de YouTube
**Cómo generar:** Template HTML/CSS con texto grande + imagen de fondo

```html
<div style="
  width: 1280px; height: 720px;
  background: linear-gradient(135deg, #000 0%, #161f15 100%);
  font-family: 'Inter', sans-serif;
  color: white;
  display: flex;
  align-items: center;
  padding: 60px;
">
  <div style="flex: 1;">
    <div style="
      font-size: 72px; font-weight: 900;
      line-height: 1.1;
      text-shadow: 2px 2px 10px rgba(0,0,0,0.5);
    ">
      TÍTULO BOLD
    </div>
    <div style="
      font-size: 36px; color: #00af75;
      margin-top: 20px;
    ">
      Subtítulo descriptivo
    </div>
  </div>
  <!-- Face/logo area -->
  <div style="
    width: 300px; height: 300px;
    background: #20291f; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 48px;
  ">
    📈
  </div>
</div>
```

### 5. Meme / Relatable Image
**Cuándo:** Posts de engagement, humor
**Cómo generar:** Template con imagen + texto overlay

### 6. Thread Banner
**Cuándo:** Inicio de threads largos en X
**Cómo generar:** Banner horizontal con título del thread

```html
<div style="
  width: 1200px; height: 675px;
  background: linear-gradient(135deg, #0a0d0a 0%, #20291f 100%);
  font-family: 'Inter', sans-serif;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 80px;
">
  <div style="font-size: 20px; color: #00af75; letter-spacing: 3px; text-transform: uppercase;">
    🧵 THREAD
  </div>
  <div style="font-size: 56px; font-weight: 800; margin: 30px 0; line-height: 1.2;">
    Semana 1 construyendo [YourBrand]
  </div>
  <div style="font-size: 24px; color: #9ca89b;">
    Todo lo que shipeamos esta semana →
  </div>
</div>
```

## Branding Guidelines

### Colores Brand
```css
/* Brand primarios */
--brand-dark: #20291f;       /* Verde oscuro — backgrounds, cards */
--brand-darker: #161f15;     /* Más oscuro — gradientes */
--brand-darkest: #0a0d0a;    /* Casi negro — fondos principales */

/* Acento */
--accent: #00af75;           /* Verde vibrante — CTAs, highlights, links */

/* Texto */
--text-primary: #fdfffc;     /* Blanco cálido — títulos, texto principal */
--text-secondary: #9ca89b;   /* Gris verde — subtítulos, labels */
--text-muted: #647063;       /* Gris oscuro — footers, metadata */

/* Funcionales */
--error: #ed5a46;            /* Rojo — negativo, old, vs comparisons */

/* Bordes y superficies */
--border-subtle: rgba(0, 175, 117, 0.2);   /* Borde verde sutil */
--surface: rgba(32, 41, 31, 0.3);           /* Superficie de cards */
```

### Tipografía
- **Headlines:** Inter Bold/Black
- **Body:** Inter Regular
- **Code:** JetBrains Mono

### Logo Usage
- Siempre incluir "yoursite.com" o logo en esquina
- No cubrir más del 10% de la imagen
- Usar versión light sobre fondos oscuros

## Script de Generación

```bash
#!/bin/bash
# generate-image.sh — Genera imagen desde HTML template

TEMPLATE=$1
OUTPUT=$2
WIDTH=${3:-1200}
HEIGHT=${4:-675}

npx playwright screenshot \
  --viewport-size="${WIDTH}x${HEIGHT}" \
  --full-page \
  "$TEMPLATE" "$OUTPUT"

echo "Image generated: $OUTPUT (${WIDTH}x${HEIGHT})"
```

## Workflow

1. **Determinar tipo de imagen** según el contenido del post
2. **Seleccionar template** o crear HTML custom
3. **Generar imagen** con screenshot tool
4. **Verificar dimensiones** correctas para la plataforma
5. **Guardar** en `content/images/YYYY-MM-DD/` con nombre descriptivo
6. **Referenciar** en el post output

## Notas
- Preferir estilo **dark mode** — se ve mejor en feeds
- Texto en imágenes: **máximo 5-7 palabras** grandes
- Contraste alto: blanco sobre oscuro, o verde accent sobre oscuro
- Evitar stock photos — todo debe sentirse original y tech

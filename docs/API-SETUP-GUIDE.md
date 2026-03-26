# API Setup Guide — Marketing Agent Eddie

## 1. Slack Incoming Webhook (~5 min)

1. Ir a https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Nombre: "Eddie Marketing" → Seleccionar tu workspace
4. En el menú izquierdo: "Incoming Webhooks" → Activar
5. Click "Add New Webhook to Workspace" → Seleccionar canal (ej: #marketing)
6. Copiar la Webhook URL
7. Agregar a `.env`:
   ```
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxx
   ```

## 2. Twitter/X API (~15 min)

1. Ir a https://developer.x.com/
2. Sign up con tu cuenta de X (si no tenés developer account)
3. Free tier incluye: 1,500 tweets/month write, 10,000 tweets/month read
4. Create a Project → Create an App dentro del project
5. En App Settings → "User authentication settings":
   - App permissions: **Read and Write**
   - Type of App: **Web App**
   - Callback URL: `http://localhost:3000/callback` (no se usa pero es requerido)
6. En "Keys and tokens":
   - API Key and Secret → copiar
   - Access Token and Secret → generar y copiar
7. Agregar a `.env`:
   ```
   TWITTER_APP_KEY=tu-api-key
   TWITTER_APP_SECRET=tu-api-secret
   TWITTER_ACCESS_TOKEN=tu-access-token
   TWITTER_ACCESS_SECRET=tu-access-secret
   ```

**Importante:** Asegurate que el Access Token tenga permisos de Read AND Write. Si lo generaste antes de cambiar los permisos, regenerá el token.

## 3. LinkedIn API (~30 min)

### Crear App
1. Ir a https://www.linkedin.com/developers/
2. Click "Create App"
3. Nombre: "Eddie Marketing"
4. LinkedIn Page: asociar con tu Company Page de your company
5. Aceptar términos

### Obtener Products
1. En la app → Tab "Products"
2. Solicitar "Share on LinkedIn" (aprobación instantánea)
3. Solicitar "Sign in with LinkedIn using OpenID Connect"

### Obtener Access Token
1. Tab "Auth" → Copiar Client ID y Client Secret
2. Correr el helper de OAuth:
   ```bash
   node scripts/setup/linkedin-auth.mjs
   ```
3. Se abre el browser → Login → Autorizar → Token se muestra en terminal
4. Agregar a `.env`:
   ```
   LINKEDIN_ACCESS_TOKEN=tu-token
   LINKEDIN_PERSON_URN=urn:li:person:tu-id
   ```

### Person URN
Con el token, obtener tu Person URN:
```bash
curl -H "Authorization: Bearer TU_TOKEN" https://api.linkedin.com/v2/userinfo
```
El campo `sub` es tu Person ID. El URN es `urn:li:person:TU_SUB`.

**Nota:** El access token expira en 60 días. Renovar corriendo `node scripts/setup/linkedin-auth.mjs` nuevamente.

## 4. YouTube (Phase 2)

1. Ir a https://console.cloud.google.com/
2. Crear proyecto → Habilitar "YouTube Data API v3"
3. Crear credenciales OAuth 2.0 (Desktop application)
4. Correr helper de auth para obtener refresh token
5. Agregar a `.env`

## 5. TikTok (Phase 2)

1. Ir a https://developers.tiktok.com/
2. Registrarse como developer
3. Crear app con scope "Content Posting API"
4. Enviar para review (puede tardar días)

---

## Verificación Rápida

Después de configurar, testear cada integración:

```bash
# Slack
node scripts/notify-slack.mjs 2026-02-27

# Twitter (publicará un tweet real!)
node scripts/publish-twitter.mjs --date 2026-02-27 --post 3

# LinkedIn (publicará un post real!)
node scripts/publish-linkedin.mjs --date 2026-02-27 --post 4
```

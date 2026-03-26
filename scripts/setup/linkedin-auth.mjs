/**
 * LinkedIn OAuth 2.0 Helper
 * Starts a local server, opens LinkedIn auth in browser, captures the code,
 * exchanges it for an access token.
 *
 * Usage: node scripts/setup/linkedin-auth.mjs
 *
 * Requires LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in .env
 */

import http from 'http';
import { URL } from 'url';
import 'dotenv/config';

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/callback';
const SCOPES = 'openid profile w_member_social';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in .env first.');
  console.error('Get them from https://www.linkedin.com/developers/ → Your App → Auth tab');
  process.exit(1);
}

// Step 1: Build auth URL
const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}`;

console.log('\n🔗 Open this URL in your browser:\n');
console.log(authUrl);
console.log('\nWaiting for callback on http://localhost:3000...\n');

// Try to open in browser automatically
try {
  const { exec } = await import('child_process');
  exec(`open "${authUrl}"`);
} catch {}

// Step 2: Start local server to capture callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3000');

  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`<h1>Error: ${error}</h1><p>${url.searchParams.get('error_description')}</p>`);
      server.close();
      process.exit(1);
    }

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>No code received</h1>');
      return;
    }

    // Step 3: Exchange code for access token
    console.log('Authorization code received. Exchanging for token...');

    try {
      const tokenResp = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
        }),
      });

      const tokenData = await tokenResp.json();

      if (tokenData.error) {
        throw new Error(`${tokenData.error}: ${tokenData.error_description}`);
      }

      const accessToken = tokenData.access_token;
      const expiresIn = tokenData.expires_in;

      // Step 4: Get user info for Person URN via OpenID Connect userinfo
      const userResp = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userData = await userResp.json();
      const personUrn = `urn:li:person:${userData.sub}`;
      const name = userData.name || `${userData.given_name || ''} ${userData.family_name || ''}`.trim();

      console.log('\n✅ LinkedIn OAuth Success!\n');
      console.log('Add these to your .env:\n');
      console.log(`LINKEDIN_ACCESS_TOKEN=${accessToken}`);
      console.log(`LINKEDIN_PERSON_URN=${personUrn}`);
      console.log(`\nToken expires in ${Math.round(expiresIn / 86400)} days.`);
      console.log(`Name: ${name}`);

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<h1>✅ Success!</h1><p>Token obtained for ${name}. Check your terminal.</p>`);
    } catch (err) {
      console.error('Token exchange failed:', err.message);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>Error</h1><p>${err.message}</p>`);
    }

    server.close();
  }
});

server.listen(3000);

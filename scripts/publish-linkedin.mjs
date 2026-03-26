import { readFile } from 'fs/promises';
import { parseDrafts, getImageForPost } from './lib/parse-drafts.mjs';
import 'dotenv/config';

const args = parseArgs();
const API_VERSION = '202503';

async function main() {
  validateEnv();

  const posts = await parseDrafts(args.date);
  const linkedinPosts = posts.filter(p =>
    p.platform.toLowerCase().includes('linkedin')
  );

  if (linkedinPosts.length === 0) {
    console.log('No LinkedIn posts found for this date.');
    return [];
  }

  const toPublish = args.post
    ? linkedinPosts.filter(p => args.post.includes(p.number))
    : linkedinPosts;

  const results = [];

  for (const post of toPublish) {
    try {
      console.log(`Publishing POST ${post.number} to LinkedIn...`);
      const result = await publishPost(post, args.date);
      results.push({ ...post, status: 'published', result });
      console.log(`  ✅ POST ${post.number} published`);
    } catch (err) {
      console.error(`  ❌ POST ${post.number} failed: ${err.message}`);
      results.push({ ...post, status: 'failed', error: err.message });
    }
  }

  return results;
}

async function publishPost(post, date) {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;

  // Upload image if available
  let imageUrn;
  const imagePath = await getImageForPost(date, post.number);
  if (imagePath) {
    console.log(`  Uploading image: ${imagePath}`);
    imageUrn = await uploadImage(imagePath, accessToken, personUrn);
  }

  // Build post text
  let text = post.body;
  if (post.hashtags && !post.body.includes('#')) {
    text += '\n\n' + post.hashtags;
  }
  if (post.utm && post.utm !== 'N/A' && !post.body.includes(post.utm)) {
    text += '\n\n👉 ' + post.utm;
  }

  // Create post
  const postBody = {
    author: personUrn,
    commentary: text,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
  };

  if (imageUrn) {
    postBody.content = {
      media: {
        title: post.image?.textOnImage || '',
        id: imageUrn,
      },
    };
  }

  const resp = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': API_VERSION,
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(postBody),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`LinkedIn API error ${resp.status}: ${errBody}`);
  }

  // Get post ID from response header
  const postId = resp.headers.get('x-restli-id') || resp.headers.get('x-linkedin-id') || 'unknown';
  const postUrl = `https://www.linkedin.com/feed/update/${postId}`;
  console.log(`  URL: ${postUrl}`);
  return { postId, url: postUrl };
}

async function uploadImage(imagePath, accessToken, personUrn) {
  // Step 1: Initialize upload
  const initResp = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': API_VERSION,
    },
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: personUrn,
      },
    }),
  });

  if (!initResp.ok) {
    const errBody = await initResp.text();
    throw new Error(`Image init failed ${initResp.status}: ${errBody}`);
  }

  const initData = await initResp.json();
  const uploadUrl = initData.value.uploadUrl;
  const imageUrn = initData.value.image;

  // Step 2: Upload binary
  const imageBuffer = await readFile(imagePath);
  const uploadResp = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    body: imageBuffer,
  });

  if (!uploadResp.ok) {
    throw new Error(`Image upload failed ${uploadResp.status}`);
  }

  console.log(`  Image uploaded: ${imageUrn}`);
  return imageUrn;
}

function validateEnv() {
  const required = ['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_PERSON_URN'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Error: Missing env vars: ${missing.join(', ')}`);
    console.error('Configure them in .env file. See docs/API-SETUP-GUIDE.md');
    process.exit(1);
  }
}

function parseArgs() {
  const args = { date: new Date().toISOString().split('T')[0], post: null };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--date' && argv[i + 1]) args.date = argv[++i];
    if (argv[i] === '--post' && argv[i + 1]) args.post = argv[++i].split(',').map(Number);
  }
  return args;
}

export { main as publishLinkedIn };

main().then(results => {
  const published = results.filter(r => r.status === 'published');
  const failed = results.filter(r => r.status === 'failed');
  console.log(`\nDone: ${published.length} published, ${failed.length} failed`);
  if (failed.length > 0) process.exit(1);
}).catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

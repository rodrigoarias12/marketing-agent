import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { IncomingWebhook } from '@slack/webhook';
import { parseDrafts, getImages } from './lib/parse-drafts.mjs';
import 'dotenv/config';

const WORKSPACE = new URL('../', import.meta.url).pathname;
const args = parseArgs();

async function main() {
  console.log(`Publishing content for ${args.date}...`);

  const posts = await parseDrafts(args.date);
  if (posts.length === 0) {
    console.log('No posts found.');
    return;
  }

  // Filter by post number or platform
  let toPublish = posts;
  if (args.post) {
    toPublish = posts.filter(p => args.post.includes(p.number));
  }
  if (args.platform) {
    toPublish = toPublish.filter(p =>
      p.platform.toLowerCase().includes(args.platform.toLowerCase())
    );
  }

  console.log(`Publishing ${toPublish.length} of ${posts.length} posts...\n`);

  const results = [];

  for (const post of toPublish) {
    const platform = detectPlatform(post.platform);
    try {
      let result;
      switch (platform) {
        case 'twitter':
          result = await publishToTwitter(post);
          break;
        case 'linkedin':
          result = await publishToLinkedIn(post);
          break;
        case 'tiktok':
          result = manualStub('TikTok', post);
          break;
        case 'youtube':
          result = manualStub('YouTube', post);
          break;
        default:
          result = { status: 'skipped', reason: `Unknown platform: ${post.platform}` };
      }
      results.push({ ...post, publishStatus: 'published', result });
    } catch (err) {
      console.error(`❌ POST ${post.number} (${platform}) failed: ${err.message}`);
      results.push({ ...post, publishStatus: 'failed', error: err.message });
    }
  }

  // Log results
  await logResults(args.date, results);

  // Send confirmation to Slack
  await sendSlackConfirmation(args.date, results);

  // Summary
  const published = results.filter(r => r.publishStatus === 'published');
  const failed = results.filter(r => r.publishStatus === 'failed');
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Done: ${published.length} published, ${failed.length} failed`);
}

async function publishToTwitter(post) {
  const { publishTwitter } = await import('./publish-twitter.mjs');
  // publish-twitter runs on its own, we call the main function
  // For now, use child_process to run the script
  const { execSync } = await import('child_process');
  const cmd = `node ${join(WORKSPACE, 'scripts/publish-twitter.mjs')} --date ${args.date} --post ${post.number}`;
  const output = execSync(cmd, { cwd: WORKSPACE, encoding: 'utf-8' });
  console.log(output);
  return { platform: 'twitter', output };
}

async function publishToLinkedIn(post) {
  const { execSync } = await import('child_process');
  const cmd = `node ${join(WORKSPACE, 'scripts/publish-linkedin.mjs')} --date ${args.date} --post ${post.number}`;
  const output = execSync(cmd, { cwd: WORKSPACE, encoding: 'utf-8' });
  console.log(output);
  return { platform: 'linkedin', output };
}

function manualStub(platform, post) {
  console.log(`\n📋 ${platform} — POST ${post.number} (manual)`);
  console.log(`   Contenido guardado. Publicar manualmente.`);
  console.log(`   Script/texto: content/drafts/${args.date}.md → POST ${post.number}`);

  // Copy to clipboard on macOS
  try {
    const { execSync } = require('child_process');
    execSync(`echo "${post.body.substring(0, 200)}" | pbcopy`);
    console.log(`   📋 Texto copiado al clipboard`);
  } catch {}

  return { platform: platform.toLowerCase(), status: 'manual', postNumber: post.number };
}

function detectPlatform(platformStr) {
  const p = platformStr.toLowerCase();
  if (p.includes('x') || p.includes('twitter')) return 'twitter';
  if (p.includes('linkedin')) return 'linkedin';
  if (p.includes('tiktok') || p.includes('reels')) return 'tiktok';
  if (p.includes('youtube')) return 'youtube';
  return p;
}

async function logResults(date, results) {
  const publishedDir = join(WORKSPACE, 'content', 'published');
  const logPath = join(publishedDir, `${date}.md`);

  let content = `# Published Content — ${date}\n`;
  content += `## Generated at ${new Date().toISOString()}\n\n`;

  for (const r of results) {
    content += `### POST ${r.number} — ${r.platform} (${r.type})\n`;
    content += `- Status: ${r.publishStatus}\n`;
    if (r.result?.url) content += `- URL: ${r.result.url}\n`;
    if (r.error) content += `- Error: ${r.error}\n`;
    content += '\n';
  }

  await writeFile(logPath, content);
  console.log(`\nLog saved: ${logPath}`);
}

async function sendSlackConfirmation(date, results) {
  if (!process.env.SLACK_WEBHOOK_URL) return;

  const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);
  const published = results.filter(r => r.publishStatus === 'published');
  const failed = results.filter(r => r.publishStatus === 'failed');

  const [y, m, d] = date.split('-');
  const displayDate = `${d}/${m}`;

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `✅ Publicado — ${displayDate} — ${published.length}/${results.length} posts`,
        emoji: true,
      },
    },
  ];

  for (const r of results) {
    const emoji = r.publishStatus === 'published' ? '✅' : r.publishStatus === 'failed' ? '❌' : '📋';
    const urlText = r.result?.url ? ` — <${r.result.url}|Ver post>` : '';
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji} *POST ${r.number}* — ${r.platform} (${r.type})${urlText}`,
      },
    });
  }

  if (failed.length > 0) {
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `:warning: ${failed.length} post(s) fallaron. Revisar logs.` }],
    });
  }

  await webhook.send({ blocks });
  console.log('Slack confirmation sent.');
}

function parseArgs() {
  const args = { date: new Date().toISOString().split('T')[0], post: null, platform: null };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--date' && argv[i + 1]) args.date = argv[++i];
    if (argv[i] === '--post' && argv[i + 1]) args.post = argv[++i].split(',').map(Number);
    if (argv[i] === '--platform' && argv[i + 1]) args.platform = argv[++i];
  }
  return args;
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

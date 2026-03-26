import { IncomingWebhook } from '@slack/webhook';
import { parseDrafts, getImages } from './lib/parse-drafts.mjs';
import 'dotenv/config';

const date = process.argv[2] || new Date().toISOString().split('T')[0];

const PLATFORM_EMOJI = {
  'x': ':bird:',
  'x (twitter)': ':bird:',
  'twitter': ':bird:',
  'linkedin': ':briefcase:',
  'tiktok': ':musical_note:',
  'tiktok / instagram reels': ':musical_note:',
  'youtube': ':movie_camera:',
};

async function main() {
  if (!process.env.SLACK_WEBHOOK_URL) {
    console.error('Error: SLACK_WEBHOOK_URL not set in .env');
    process.exit(1);
  }

  const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);

  console.log(`Parsing drafts for ${date}...`);
  const posts = await parseDrafts(date);
  const images = await getImages(date);

  if (posts.length === 0) {
    console.log('No posts found for this date.');
    return;
  }

  // Build summary
  const platformCounts = {};
  for (const p of posts) {
    const key = p.platform.toLowerCase().includes('tiktok') ? 'TikTok' :
                p.platform.toLowerCase().includes('linkedin') ? 'LinkedIn' :
                p.platform.toLowerCase().includes('x') || p.platform.toLowerCase().includes('twitter') ? 'X' :
                p.platform;
    platformCounts[key] = (platformCounts[key] || 0) + 1;
  }
  const summaryParts = Object.entries(platformCounts).map(([k, v]) => `${v} ${k}`);
  const summary = summaryParts.join(' · ');

  // Format date for display
  const [y, m, d] = date.split('-');
  const displayDate = `${d}/${m}`;

  // Build Slack blocks
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📈 Eddie — Contenido del ${displayDate} — ${posts.length} posts`,
        emoji: true,
      },
    },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `${summary} · ${images.length} imágenes` },
      ],
    },
    { type: 'divider' },
  ];

  // Add each post
  for (const post of posts) {
    const emoji = PLATFORM_EMOJI[post.platform.toLowerCase()] || ':memo:';
    const preview = post.body.length > 300 ? post.body.substring(0, 300) + '...' : post.body;

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*POST ${post.number}* — ${emoji} ${post.platform} (${post.type}) | ${post.pillar}\n:clock1: ${post.postingTime || 'TBD'}`,
      },
    });

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `>>> ${preview}`,
      },
    });

    if (post.hashtags) {
      blocks.push({
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: post.hashtags },
        ],
      });
    }

    blocks.push({ type: 'divider' });
  }

  // Footer with publish instructions
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ':white_check_mark: *Para publicar:*\n```openclaw agent --agent marketing-agent --local -m "Publicar contenido de hoy"```\nO selectivo: `"Publicar post 1 y 4"`',
    },
  });

  // Send to Slack
  console.log('Sending to Slack...');
  await webhook.send({ blocks });
  console.log(`✅ Slack notification sent — ${posts.length} posts for ${date}`);
}

main().catch(err => {
  console.error('Error sending Slack notification:', err.message);
  process.exit(1);
});

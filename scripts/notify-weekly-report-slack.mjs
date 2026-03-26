import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { IncomingWebhook } from '@slack/webhook';
import 'dotenv/config';

const WORKSPACE = new URL('../', import.meta.url).pathname;

async function main() {
  if (!process.env.SLACK_WEBHOOK_URL) {
    console.error('Error: SLACK_WEBHOOK_URL not set in .env');
    process.exit(1);
  }

  const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);

  // Find the most recent weekly report
  const memoryDir = join(WORKSPACE, 'memory');
  let files;
  try {
    files = await readdir(memoryDir);
  } catch {
    console.log('No memory directory found. No weekly reports yet.');
    return;
  }

  const weeklyReports = files
    .filter(f => f.startsWith('weekly-report-'))
    .sort()
    .reverse();

  if (weeklyReports.length === 0) {
    console.log('No weekly reports found.');
    return;
  }

  const latestReport = weeklyReports[0];
  const reportPath = join(memoryDir, latestReport);
  const content = await readFile(reportPath, 'utf-8');

  console.log(`Sending weekly report: ${latestReport}`);

  // Parse report sections (basic markdown parsing)
  const sections = content.split(/(?=^##\s)/m).filter(s => s.trim());

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '📊 Eddie — Weekly Marketing Report',
        emoji: true,
      },
    },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `Report: ${latestReport}` },
      ],
    },
    { type: 'divider' },
  ];

  // Add report content (truncated per section to fit Slack limits)
  for (const section of sections.slice(0, 8)) {
    const truncated = section.length > 2900 ? section.substring(0, 2900) + '...' : section;
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: truncated,
      },
    });
  }

  // Also check published content for the past week
  const publishedDir = join(WORKSPACE, 'content', 'published');
  try {
    const publishedFiles = await readdir(publishedDir);
    const recentPublished = publishedFiles
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse()
      .slice(0, 7);

    if (recentPublished.length > 0) {
      blocks.push({ type: 'divider' });
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Published this week:* ${recentPublished.length} days with content`,
        },
      });
    }
  } catch {}

  await webhook.send({ blocks });
  console.log('✅ Weekly report sent to Slack');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

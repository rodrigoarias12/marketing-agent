import { TwitterApi } from 'twitter-api-v2';
import { readFile } from 'fs/promises';
import { parseDrafts, getImageForPost } from './lib/parse-drafts.mjs';
import 'dotenv/config';

const args = parseArgs();

async function main() {
  validateEnv();

  const client = new TwitterApi({
    appKey: process.env.TWITTER_APP_KEY,
    appSecret: process.env.TWITTER_APP_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  });

  const posts = await parseDrafts(args.date);
  const twitterPosts = posts.filter(p =>
    p.platform.toLowerCase().includes('x') || p.platform.toLowerCase().includes('twitter')
  );

  if (twitterPosts.length === 0) {
    console.log('No Twitter posts found for this date.');
    return [];
  }

  // Filter by post number if specified
  const toPublish = args.post
    ? twitterPosts.filter(p => args.post.includes(p.number))
    : twitterPosts;

  const results = [];

  for (const post of toPublish) {
    try {
      console.log(`Publishing POST ${post.number} (${post.type})...`);

      if (post.type === 'thread') {
        const result = await publishThread(client, post, args.date);
        results.push({ ...post, status: 'published', result });
      } else {
        const result = await publishTweet(client, post, args.date);
        results.push({ ...post, status: 'published', result });
      }

      console.log(`  ✅ POST ${post.number} published`);
    } catch (err) {
      console.error(`  ❌ POST ${post.number} failed: ${err.message}`);
      results.push({ ...post, status: 'failed', error: err.message });
    }
  }

  return results;
}

async function publishTweet(client, post, date) {
  // Upload image if available
  let mediaId;
  const imagePath = await getImageForPost(date, post.number);
  if (imagePath) {
    console.log(`  Uploading image: ${imagePath}`);
    mediaId = await client.v1.uploadMedia(imagePath);
  }

  const tweetText = buildTweetText(post);
  validateLength(tweetText);

  const tweet = await client.v2.tweet({
    text: tweetText,
    media: mediaId ? { media_ids: [mediaId] } : undefined,
  });

  const tweetUrl = `https://x.com/i/status/${tweet.data.id}`;
  console.log(`  URL: ${tweetUrl}`);
  return { tweetId: tweet.data.id, url: tweetUrl };
}

async function publishThread(client, post, date) {
  // Split thread by numbered tweets (1/ 2/ 3/ ...)
  const tweets = splitThread(post.body);

  if (tweets.length === 0) {
    throw new Error('Could not split thread into individual tweets');
  }

  // Upload image for first tweet
  let mediaId;
  const imagePath = await getImageForPost(date, post.number);
  if (imagePath) {
    console.log(`  Uploading banner image: ${imagePath}`);
    mediaId = await client.v1.uploadMedia(imagePath);
  }

  const results = [];

  // Post first tweet
  const firstText = tweets[0];
  validateLength(firstText);

  const firstTweet = await client.v2.tweet({
    text: firstText,
    media: mediaId ? { media_ids: [mediaId] } : undefined,
  });
  results.push(firstTweet.data);
  console.log(`  Thread 1/${tweets.length} posted`);

  // Post remaining tweets as replies
  let lastTweetId = firstTweet.data.id;
  for (let i = 1; i < tweets.length; i++) {
    const text = tweets[i];
    validateLength(text);

    const reply = await client.v2.tweet({
      text,
      reply: { in_reply_to_tweet_id: lastTweetId },
    });
    results.push(reply.data);
    lastTweetId = reply.data.id;
    console.log(`  Thread ${i + 1}/${tweets.length} posted`);

    // Small delay between tweets to avoid rate limits
    await sleep(1000);
  }

  const threadUrl = `https://x.com/i/status/${results[0].id}`;
  console.log(`  Thread URL: ${threadUrl}`);
  return { threadId: results[0].id, url: threadUrl, tweetCount: results.length };
}

function splitThread(body) {
  // Split by numbered patterns like "1/" or "1/🧵"
  const parts = body.split(/(?=\d+\/)/);
  return parts
    .map(part => part.trim())
    .filter(part => /^\d+\//.test(part));
}

function buildTweetText(post) {
  let text = post.body;
  // Add hashtags if not already in body
  if (post.hashtags && !post.body.includes('#')) {
    text += '\n\n' + post.hashtags;
  }
  // Add UTM link if present and not already in body
  if (post.utm && post.utm !== 'N/A' && !post.body.includes(post.utm)) {
    text += '\n\n' + post.utm;
  }
  return text;
}

function validateLength(text, maxLength = 280) {
  if (text.length > maxLength) {
    console.warn(`  ⚠️  Tweet is ${text.length} chars (limit: ${maxLength}). May need Twitter Premium.`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function validateEnv() {
  const required = ['TWITTER_APP_KEY', 'TWITTER_APP_SECRET', 'TWITTER_ACCESS_TOKEN', 'TWITTER_ACCESS_SECRET'];
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
    if (argv[i] === '--all-twitter') args.post = null; // all twitter posts
  }
  return args;
}

// Export for orchestrator
export { main as publishTwitter };

// CLI
main().then(results => {
  const published = results.filter(r => r.status === 'published');
  const failed = results.filter(r => r.status === 'failed');
  console.log(`\nDone: ${published.length} published, ${failed.length} failed`);
  if (failed.length > 0) process.exit(1);
}).catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

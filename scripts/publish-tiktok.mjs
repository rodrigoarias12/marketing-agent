import { parseDrafts, getImageForPost } from './lib/parse-drafts.mjs';
import 'dotenv/config';

const args = parseArgs();

async function main() {
  const posts = await parseDrafts(args.date);
  const tiktokPosts = posts.filter(p =>
    p.platform.toLowerCase().includes('tiktok') || p.platform.toLowerCase().includes('reels')
  );

  if (tiktokPosts.length === 0) {
    console.log('No TikTok posts found for this date.');
    return [];
  }

  const toPublish = args.post
    ? tiktokPosts.filter(p => args.post.includes(p.number))
    : tiktokPosts;

  for (const post of toPublish) {
    console.log(`\n📋 TikTok — POST ${post.number}`);
    console.log('=' .repeat(50));
    console.log(`Type: ${post.type}`);
    console.log(`Pillar: ${post.pillar}`);
    console.log(`Time: ${post.postingTime}`);
    console.log('');
    console.log('--- SCRIPT ---');
    console.log(post.body);
    console.log('');
    console.log(`Hashtags: ${post.hashtags}`);
    console.log(`UTM: ${post.utm}`);

    const imagePath = await getImageForPost(args.date, post.number);
    if (imagePath) {
      console.log(`\nThumbnail: ${imagePath}`);
      // Copy thumbnail path to clipboard on macOS
      try {
        const { execSync } = await import('child_process');
        execSync(`echo "${imagePath}" | pbcopy`);
        console.log('📋 Thumbnail path copied to clipboard');
      } catch {}
    }

    console.log('\n⚠️  TikTok requires video upload. Record the video using the script above,');
    console.log('   then upload manually at tiktok.com or via the TikTok app.');
    console.log('   Full API automation coming in Phase 2.');
  }

  return toPublish.map(p => ({ ...p, status: 'manual' }));
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

export { main as publishTikTok };

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

import { parseDrafts, getImageForPost } from './lib/parse-drafts.mjs';
import 'dotenv/config';

const args = parseArgs();

async function main() {
  const posts = await parseDrafts(args.date);
  const ytPosts = posts.filter(p =>
    p.platform.toLowerCase().includes('youtube')
  );

  if (ytPosts.length === 0) {
    console.log('No YouTube posts found for this date.');
    return [];
  }

  const toPublish = args.post
    ? ytPosts.filter(p => args.post.includes(p.number))
    : ytPosts;

  for (const post of toPublish) {
    console.log(`\n📋 YouTube — POST ${post.number}`);
    console.log('='.repeat(50));
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
    }

    console.log('\n⚠️  YouTube requires video upload. Record/edit the video,');
    console.log('   then upload at studio.youtube.com.');
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

export { main as publishYouTube };

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

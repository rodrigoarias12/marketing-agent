import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

const WORKSPACE = new URL('../../', import.meta.url).pathname;

/**
 * Parse a draft markdown file and extract structured post data.
 * @param {string} date - Date string in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of post objects
 */
export async function parseDrafts(date) {
  const draftPath = join(WORKSPACE, 'content', 'drafts', `${date}.md`);
  const content = await readFile(draftPath, 'utf-8');

  // Split by "## POST N" headers
  const postSections = content.split(/(?=## POST \d+)/);
  const posts = [];

  for (const section of postSections) {
    const headerMatch = section.match(/^## POST (\d+)\s*[—–-]\s*(.+)$/m);
    if (!headerMatch) continue;

    const postNumber = parseInt(headerMatch[1]);
    const headerDescription = headerMatch[2].trim();

    // Extract metadata from ━━━ POST ━━━ block
    const platform = extractField(section, 'PLATFORM');
    const type = extractField(section, 'TYPE');
    const pillar = extractField(section, 'PILLAR');
    const series = extractField(section, 'SERIES');

    // Extract content body (between metadata block and CTA/IMAGEN section)
    const body = extractBody(section);

    // Extract CTA, UTM, Hashtags
    const cta = extractField(section, 'CTA');
    const utm = extractField(section, 'UTM');
    const hashtags = extractField(section, 'HASHTAGS');

    // Extract image metadata
    const image = extractImageMeta(section);

    // Extract posting time
    const postingTime = extractField(section, 'POSTING_TIME');

    posts.push({
      number: postNumber,
      headerDescription,
      platform,
      type,
      pillar,
      series,
      body,
      cta,
      utm,
      hashtags,
      image,
      postingTime,
    });
  }

  return posts;
}

/**
 * Get list of generated image files for a date.
 */
export async function getImages(date) {
  const imagesDir = join(WORKSPACE, 'content', 'images', date);
  try {
    const files = await readdir(imagesDir);
    return files.filter(f => f.endsWith('.png')).map(f => join(imagesDir, f));
  } catch {
    return [];
  }
}

/**
 * Get the image path for a specific post number.
 */
export async function getImageForPost(date, postNumber) {
  const images = await getImages(date);
  // Images are named like 01-thread-banner.png, 02-hot-take-comparison.png
  const padded = String(postNumber).padStart(2, '0');
  return images.find(img => img.includes(`/${padded}-`)) || null;
}

// --- Internal helpers ---

function extractField(section, fieldName) {
  const regex = new RegExp(`^${fieldName}:\\s*(.+)$`, 'm');
  const match = section.match(regex);
  return match ? match[1].trim() : '';
}

function extractBody(section) {
  // Body is between the closing ━━━ of the POST metadata block and the next ━━━ block (CTA or IMAGEN)
  const lines = section.split('\n');
  let inBody = false;
  let metaBlockCount = 0;
  const bodyLines = [];

  for (const line of lines) {
    if (line.startsWith('━━━')) {
      metaBlockCount++;
      if (metaBlockCount === 2) {
        // End of POST metadata block, start collecting body
        inBody = true;
        continue;
      }
      if (metaBlockCount > 2) {
        // Hit the next metadata block (CTA/IMAGEN/META), stop
        break;
      }
      continue;
    }

    if (inBody) {
      bodyLines.push(line);
    }
  }

  return bodyLines.join('\n').trim();
}

function extractImageMeta(section) {
  // Find IMAGEN section: starts with a line containing "IMAGEN" and ━, collect fields until next ━━━ line
  const lines = section.split('\n');
  let inImagenBlock = false;
  const imageLines = [];

  for (const line of lines) {
    if (line.includes('IMAGEN') && line.includes('━━━')) {
      inImagenBlock = true;
      continue;
    }
    if (inImagenBlock) {
      if (line.startsWith('━━━')) break;
      imageLines.push(line);
    }
  }

  if (imageLines.length === 0) return null;

  const block = imageLines.join('\n');
  return {
    type: extractField(block, 'TYPE'),
    dimensions: extractField(block, 'DIMENSIONS'),
    description: extractField(block, 'DESCRIPTION'),
    textOnImage: extractField(block, 'TEXT_ON_IMAGE'),
    style: extractField(block, 'STYLE'),
  };
}

// CLI: run directly to test
if (process.argv[1] && process.argv[1].includes('parse-drafts')) {
  const date = process.argv[2] || new Date().toISOString().split('T')[0];
  parseDrafts(date).then(posts => {
    console.log(`Parsed ${posts.length} posts for ${date}:\n`);
    for (const p of posts) {
      console.log(`  POST ${p.number} — ${p.platform} (${p.type}) | ${p.pillar}`);
      console.log(`    Body: ${p.body.substring(0, 80)}...`);
      console.log(`    Time: ${p.postingTime}`);
      console.log(`    Image: ${p.image ? p.image.type : 'none'}`);
      console.log();
    }
  }).catch(err => {
    console.error('Error parsing drafts:', err.message);
    process.exit(1);
  });
}

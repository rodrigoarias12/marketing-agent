import { chromium } from 'playwright';
import { readdir } from 'fs/promises';
import { join, basename } from 'path';

const IMAGES_DIR = join(import.meta.dirname, '..', 'content', 'images', '2026-02-27');

const DIMENSIONS = {
  '01-thread-banner':     { width: 1200, height: 675 },
  '02-hot-take-comparison': { width: 1080, height: 1080 },
  '03-day1-metrics':      { width: 1200, height: 675 },
  '04-linkedin-workflow':  { width: 1200, height: 627 },
  '05-tiktok-thumbnail':  { width: 1080, height: 1920 },
};

async function main() {
  const browser = await chromium.launch();
  const files = (await readdir(IMAGES_DIR)).filter(f => f.endsWith('.html'));

  for (const file of files) {
    const name = basename(file, '.html');
    const dims = DIMENSIONS[name] || { width: 1200, height: 675 };
    const context = await browser.newContext({
      viewport: { width: dims.width, height: dims.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    const filePath = join(IMAGES_DIR, file);
    await page.goto(`file://${filePath}`, { waitUntil: 'networkidle' });
    // Wait for fonts to load
    await page.waitForTimeout(2000);
    const outputPath = join(IMAGES_DIR, `${name}.png`);
    await page.screenshot({ path: outputPath, fullPage: false });
    console.log(`✅ ${name}.png (${dims.width}x${dims.height})`);
    await context.close();
  }

  await browser.close();
  console.log(`\n🎉 Generated ${files.length} images in ${IMAGES_DIR}`);
}

main().catch(console.error);

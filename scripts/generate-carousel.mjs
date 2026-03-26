import { chromium } from 'playwright';
import { readdir } from 'fs/promises';
import { join, basename } from 'path';

const dateArg = process.argv.find(a => a.startsWith('--date='))?.split('=')[1]
  || new Date().toISOString().slice(0, 10);
const IMAGES_DIR = join(import.meta.dirname, '..', 'content', 'images', dateArg);

const CAROUSEL_DIMENSIONS = { width: 1080, height: 1350 };

async function main() {
  console.log(`Generating carousel images from ${IMAGES_DIR}...`);
  
  const browser = await chromium.launch();
  const files = (await readdir(IMAGES_DIR)).filter(f => f.endsWith('.html') && f.includes('slide'));

  for (const file of files) {
    const name = basename(file, '.html');
    const context = await browser.newContext({
      viewport: { width: CAROUSEL_DIMENSIONS.width, height: CAROUSEL_DIMENSIONS.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    const filePath = join(IMAGES_DIR, file);
    await page.goto(`file://${filePath}`, { waitUntil: 'networkidle' });
    
    // Wait for fonts to load
    await page.waitForTimeout(2000);
    
    const outputPath = join(IMAGES_DIR, `${name}.png`);
    await page.screenshot({ path: outputPath });
    
    console.log(`✅ ${name}.png (${CAROUSEL_DIMENSIONS.width}x${CAROUSEL_DIMENSIONS.height})`);
    await context.close();
  }

  await browser.close();
  console.log(`\n🎉 Generated ${files.length} carousel images in ${IMAGES_DIR}`);
}

main().catch(console.error);
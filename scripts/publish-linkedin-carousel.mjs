import { readFile, writeFile } from 'fs/promises';
import { PDFDocument } from 'pdf-lib';
import 'dotenv/config';

const API_VERSION = '202503';

async function main() {
  const args = parseArgs();
  validateEnv();

  // 1. Build PDF from slide images
  console.log('Building carousel PDF from slides...');
  const pdfBytes = await buildCarouselPdf(args.slides);
  const pdfPath = args.slides[0].replace(/[^/]+$/, 'carousel.pdf');
  await writeFile(pdfPath, pdfBytes);
  console.log(`  PDF created: ${pdfPath} (${(pdfBytes.length / 1024).toFixed(0)}KB)`);

  // 2. Upload document to LinkedIn
  console.log('Uploading document to LinkedIn...');
  const documentUrn = await uploadDocument(pdfBytes);
  console.log(`  Document uploaded: ${documentUrn}`);

  // 3. Create post with document
  console.log('Creating carousel post...');
  const result = await createPost(args.text, documentUrn, args.title);
  console.log(`  ✅ Published: ${result.url}`);
  return result;
}

async function buildCarouselPdf(slidePaths) {
  const pdfDoc = await PDFDocument.create();

  for (const slidePath of slidePaths) {
    const imageBytes = await readFile(slidePath);
    const image = await pdfDoc.embedPng(imageBytes);
    const { width, height } = image;

    const page = pdfDoc.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
  }

  return pdfDoc.save();
}

async function uploadDocument(pdfBytes) {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;

  // Step 1: Initialize upload
  const initResp = await fetch('https://api.linkedin.com/rest/documents?action=initializeUpload', {
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
    throw new Error(`Document init failed ${initResp.status}: ${errBody}`);
  }

  const initData = await initResp.json();
  const uploadUrl = initData.value.uploadUrl;
  const documentUrn = initData.value.document;

  // Step 2: Upload binary
  const uploadResp = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/pdf',
    },
    body: pdfBytes,
  });

  if (!uploadResp.ok) {
    const errBody = await uploadResp.text();
    throw new Error(`Document upload failed ${uploadResp.status}: ${errBody}`);
  }

  return documentUrn;
}

async function createPost(text, documentUrn, title) {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;

  const postBody = {
    author: personUrn,
    commentary: text,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    content: {
      media: {
        title: title || 'Carousel',
        id: documentUrn,
      },
    },
    lifecycleState: 'PUBLISHED',
  };

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

  const postId = resp.headers.get('x-restli-id') || resp.headers.get('x-linkedin-id') || 'unknown';
  const url = `https://www.linkedin.com/feed/update/${postId}`;
  return { postId, url };
}

function validateEnv() {
  const required = ['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_PERSON_URN'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Missing env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}

function parseArgs() {
  const argv = process.argv.slice(2);
  let slides = [];
  let text = '';
  let title = '';

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--slides' && argv[i + 1]) {
      slides = argv[++i].split(',');
    }
    if (argv[i] === '--text' && argv[i + 1]) {
      text = argv[++i];
    }
    if (argv[i] === '--title' && argv[i + 1]) {
      title = argv[++i];
    }
  }

  if (slides.length === 0 || !text) {
    console.error('Usage: node publish-linkedin-carousel.mjs --slides slide1.png,slide2.png --text "post text" [--title "carousel title"]');
    process.exit(1);
  }

  return { slides, text, title };
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

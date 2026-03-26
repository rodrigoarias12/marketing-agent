import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import 'dotenv/config';

const MODELS = {
  flash: 'gemini-2.5-flash-image',
  pro: 'gemini-3-pro-image-preview',
  fast: 'gemini-3.1-flash-image-preview',
  imagen: 'imagen-4.0-generate-001',
};

async function generateImage(prompt, outputPath, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY in .env');
  }

  const model = options.model || 'flash';
  const modelId = MODELS[model] || model;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  console.log(`Generating image with ${modelId}...`);
  console.log(`  Prompt: ${prompt.substring(0, 100)}...`);

  const body = {
    contents: [{
      parts: [{ text: prompt }],
    }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  };

  // If editing an existing image, include it
  if (options.inputImage) {
    const imageBytes = await readFile(options.inputImage);
    const base64 = imageBytes.toString('base64');
    const mimeType = options.inputImage.endsWith('.jpg') || options.inputImage.endsWith('.jpeg')
      ? 'image/jpeg' : 'image/png';
    body.contents[0].parts.unshift({
      inlineData: { mimeType, data: base64 },
    });
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`Gemini API error ${resp.status}: ${errBody}`);
  }

  const data = await resp.json();

  // Extract image from response
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
  const textPart = parts.find(p => p.text);

  if (!imagePart) {
    console.log('  Response text:', textPart?.text || 'No text');
    throw new Error('No image in response. The model may have refused the prompt.');
  }

  // Ensure output directory exists
  const dir = outputPath.substring(0, outputPath.lastIndexOf('/'));
  if (dir && !existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  // Save image
  const ext = imagePart.inlineData.mimeType === 'image/jpeg' ? '.jpg' : '.png';
  const finalPath = outputPath.endsWith(ext) ? outputPath : outputPath.replace(/\.\w+$/, ext);
  const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
  await writeFile(finalPath, imageBuffer);

  console.log(`  ✅ Image saved: ${finalPath} (${(imageBuffer.length / 1024).toFixed(0)}KB)`);
  if (textPart?.text) {
    console.log(`  Model notes: ${textPart.text.substring(0, 200)}`);
  }

  return { path: finalPath, size: imageBuffer.length, text: textPart?.text };
}

// Generate images for a draft's posts
async function generateImagesForDraft(draftPath, date) {
  const content = await readFile(draftPath, 'utf-8');
  const posts = parsePosts(content);
  const outputDir = `content/images/${date}`;

  const results = [];
  for (const post of posts) {
    if (!post.imageDescription) continue;

    const outputPath = `${outputDir}/post${post.number}-ai.png`;
    const prompt = buildImagePrompt(post);

    try {
      const result = await generateImage(prompt, outputPath);
      results.push({ post: post.number, ...result });
    } catch (err) {
      console.error(`  ❌ POST ${post.number} image failed: ${err.message}`);
      results.push({ post: post.number, error: err.message });
    }
  }

  return results;
}

function buildImagePrompt(post) {
  let prompt = `Create a professional social media image for ${post.platform}.\n\n`;
  prompt += `Description: ${post.imageDescription}\n`;
  if (post.textOnImage) prompt += `Text on image: ${post.textOnImage}\n`;
  if (post.dimensions) prompt += `Aspect ratio: ${post.dimensions}\n`;
  if (post.style) prompt += `Style: ${post.style}\n`;
  prompt += `\nBrand: Use brand colors and style from SOUL.md\n`;
  prompt += `Colors: dark background (#20291f), green accents (#00af75), white text\n`;
  prompt += `Typography: clean, modern, bold headings\n`;
  prompt += `NO stock photos. Professional, tech aesthetic.\n`;
  return prompt;
}

function parsePosts(content) {
  const posts = [];
  const sections = content.split(/---/);

  for (const section of sections) {
    const numMatch = section.match(/## POST (\d+)/);
    if (!numMatch) continue;

    const number = parseInt(numMatch[1]);
    const platform = section.match(/PLATFORM:\s*(.+)/)?.[1]?.trim() || '';
    const imageDescription = section.match(/DESCRIPTION:\s*(.+)/)?.[1]?.trim() || '';
    const textOnImage = section.match(/TEXT_ON_IMAGE:\s*(.+)/)?.[1]?.trim() || '';
    const dimensions = section.match(/DIMENSIONS:\s*(.+)/)?.[1]?.trim() || '';
    const style = section.match(/STYLE:\s*(.+)/)?.[1]?.trim() || '';

    posts.push({ number, platform, imageDescription, textOnImage, dimensions, style });
  }

  return posts;
}

// CLI
const args = process.argv.slice(2);

if (args[0] === '--draft') {
  const draftPath = args[1];
  const date = args[2] || new Date().toISOString().split('T')[0];
  generateImagesForDraft(draftPath, date)
    .then(results => {
      const ok = results.filter(r => !r.error).length;
      const fail = results.filter(r => r.error).length;
      console.log(`\nDone: ${ok} generated, ${fail} failed`);
    })
    .catch(err => { console.error('Fatal:', err.message); process.exit(1); });
} else if (args[0] === '--prompt') {
  const prompt = args[1];
  const output = args[2] || 'output.png';
  generateImage(prompt, output)
    .catch(err => { console.error('Fatal:', err.message); process.exit(1); });
} else {
  console.log(`Usage:
  node generate-image-ai.mjs --prompt "description" output.png
  node generate-image-ai.mjs --draft content/drafts/2026-03-04.md 2026-03-04`);
}

export { generateImage, generateImagesForDraft };

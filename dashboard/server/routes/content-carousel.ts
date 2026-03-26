import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router = Router();

interface CarouselSlide {
  title: string;
  body: string;
  slideNumber: number;
}

// POST /api/content/carousel/generate — AI-powered slide generation from post text
router.post("/carousel/generate", async (req, res) => {
  try {
    const { text, platform, instructions, currentSlides } = req.body as {
      text: string;
      platform?: string;
      instructions?: string;
      currentSlides?: Array<{ headline: string; body: string; slideNumber: number }>;
    };

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      res.status(400).json({ error: "text is required and must be a non-empty string" });
      return;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "ANTHROPIC_API_KEY no configurada." });
      return;
    }

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: `You are an expert LinkedIn carousel content creator. Your job is to take a post text and break it down into 6-10 visually compelling carousel slides.

Rules:
- Each slide has a "headline" (max 8 words, punchy and attention-grabbing) and a "body" (2-3 short lines, easy to read on a slide)
- Slide 1 MUST be a hook/attention grabber that makes people want to swipe
- The last slide MUST be a clear CTA (call to action)
- Keep the SAME LANGUAGE as the input text (if Spanish, write in Spanish; if English, write in English)
- Use short, punchy sentences perfect for visual slides
- Break complex ideas into digestible pieces
- Each slide should stand on its own but flow logically to the next
- Do NOT use markdown formatting in the slide content
- NEVER use these AI-sounding words: "delve", "realm", "pivotal", "harness", "innovative", "transformative", "landscape", "leverage", "robust", "seamless", "cutting-edge", "game-changer", "ecosystem" or their Spanish equivalents
- NEVER use these phrases: "dive into", "in the realm of", "plays a pivotal role", "Not X, it's Y" pattern repeatedly, "Let's unpack this"
- Sound like a real human founder, not a whitepaper. Use short punchy sentences mixed with longer ones
- Use strong opinions and specific details, not vague feel-good language
- If writing in Argentine Spanish, use professional slang: "laburo", "posta", "garpar", "bancarse". NEVER use vulgarities: "paja", "cagada", "mierda", "pelotudo", "boludo", "quilombo", "carajo"

Respond ONLY with valid JSON in this exact format, no other text:
{
  "slides": [
    { "headline": "...", "body": "...", "slideNumber": 1 },
    { "headline": "...", "body": "...", "slideNumber": 2 }
  ]
}`,
      messages: [
        ...(currentSlides && currentSlides.length > 0 && instructions
          ? [
              {
                role: "user" as const,
                content: `Generate carousel slides from this ${platform || "LinkedIn"} post:\n\n${text}`,
              },
              {
                role: "assistant" as const,
                content: JSON.stringify({ slides: currentSlides }, null, 2),
              },
              {
                role: "user" as const,
                content: `Modifica el carousel anterior con estas instrucciones del usuario:\n\n${instructions}\n\nDevolvé el JSON completo actualizado con todos los slides.`,
              },
            ]
          : [
              {
                role: "user" as const,
                content: instructions
                  ? `Generate carousel slides from this ${platform || "LinkedIn"} post. Additional instructions: ${instructions}\n\n${text}`
                  : `Generate carousel slides from this ${platform || "LinkedIn"} post:\n\n${text}`,
              },
            ]),
      ],
    });

    // Extract text from response
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    const rawText = textBlocks.map((b) => b.text).join("");

    // Parse JSON from response
    let slides: Array<{ headline: string; body: string; slideNumber: number }>;
    try {
      const parsed = JSON.parse(rawText);
      slides = parsed.slides;
    } catch {
      // Try to extract JSON from the response if wrapped in other text
      const jsonMatch = rawText.match(/\{[\s\S]*"slides"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        slides = parsed.slides;
      } else {
        res.status(500).json({ error: "Failed to parse AI response as JSON" });
        return;
      }
    }

    if (!Array.isArray(slides) || slides.length === 0) {
      res.status(500).json({ error: "AI did not return valid slides" });
      return;
    }

    // Normalize slide numbers
    const normalized = slides.map((s, idx) => ({
      headline: (s.headline || "").trim(),
      body: (s.body || "").trim(),
      slideNumber: idx + 1,
    }));

    res.json({ slides: normalized });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Carousel generate error:", msg);
    res.status(500).json({ error: msg });
  }
});

// POST /api/content/carousel/preview — format slides for preview / PDF generation
router.post("/carousel/preview", (req, res) => {
  try {
    const { slides } = req.body as { slides: CarouselSlide[] };

    if (!Array.isArray(slides) || slides.length === 0) {
      res.status(400).json({ error: "slides array is required and must not be empty" });
      return;
    }

    if (slides.length > 10) {
      res.status(400).json({ error: "Maximum 10 slides allowed" });
      return;
    }

    // Normalize and validate slides
    const formatted = slides.map((slide, idx) => ({
      slideNumber: idx + 1,
      title: (slide.title || "").trim(),
      body: (slide.body || "").trim(),
      charCount: ((slide.title || "") + (slide.body || "")).length,
    }));

    const totalSlides = formatted.length;
    const hasContent = formatted.some((s) => s.title || s.body);

    if (!hasContent) {
      res.status(400).json({ error: "At least one slide must have content" });
      return;
    }

    res.json({
      success: true,
      totalSlides,
      slides: formatted,
      metadata: {
        format: "linkedin-carousel",
        aspectRatio: "4:5",
        recommendedSize: "1080x1350",
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

export default router;

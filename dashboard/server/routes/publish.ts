import { Router } from "express";
import { db } from "../db.js";
import { runScript } from "../lib/script-runner.js";
import { toCamel, toCamelArray } from "../lib/case-convert.js";
import { logActivity } from "../lib/activity.js";
import { generateCarouselPdf } from "../lib/carousel-pdf.js";
import type { CarouselSlide } from "../lib/carousel-pdf.js";

const router = Router();

/**
 * PUT /api/publish/approve
 * Body: { date, postNumber, platform }
 * Sets status to "approved" and approved_at timestamp
 */
router.put("/approve", (req, res) => {
  const { date, postNumber, platform } = req.body as {
    date: string;
    postNumber: number;
    platform: string;
  };

  if (!date || !postNumber) {
    return res.status(400).json({ error: "date and postNumber are required" });
  }

  db.prepare(
    `INSERT INTO content_status (date, post_number, platform, status, approved_at)
     VALUES (?, ?, ?, 'approved', datetime('now'))
     ON CONFLICT(date, post_number) DO UPDATE SET
       status = 'approved',
       approved_at = datetime('now'),
       platform = COALESCE(excluded.platform, platform)`
  ).run(date, postNumber, platform || "linkedin");

  logActivity("approve", "content", `${date}-${postNumber}`, `Post ${postNumber} aprobado (${platform || "linkedin"})`, { date, postNumber, platform });

  const row = db.prepare(
    "SELECT * FROM content_status WHERE date = ? AND post_number = ?"
  ).get(date, postNumber);
  res.json(toCamel(row as Record<string, unknown>));
});

/**
 * PUT /api/publish/edit
 * Body: { date, postNumber, body }
 * Saves body_override without changing status
 */
router.put("/edit", (req, res) => {
  const { date, postNumber, body, platform } = req.body as {
    date: string;
    postNumber: number;
    body: string;
    platform?: string;
  };

  if (!date || !postNumber) {
    return res.status(400).json({ error: "date and postNumber are required" });
  }

  db.prepare(
    `INSERT INTO content_status (date, post_number, platform, body_override)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(date, post_number) DO UPDATE SET body_override = excluded.body_override`
  ).run(date, postNumber, platform || "linkedin", body);

  const row = db.prepare(
    "SELECT * FROM content_status WHERE date = ? AND post_number = ?"
  ).get(date, postNumber);
  res.json(toCamel(row as Record<string, unknown>));
});

/**
 * POST /api/publish
 * Body: { date, postNumber, platform }
 * Only allows publishing if status is "approved"
 */
router.post("/", async (req, res) => {
  const { date, postNumber, platform, carouselSlides, carouselTitle } = req.body as {
    date: string;
    postNumber: number;
    platform: string;
    carouselSlides?: CarouselSlide[];
    carouselTitle?: string;
  };

  if (!date || !postNumber || !platform) {
    return res.status(400).json({ error: "date, postNumber, and platform are required" });
  }

  // Normalize platform to lowercase
  const normalizedPlatform = platform.toLowerCase();

  // Check if approved
  const existing = db.prepare(
    "SELECT status FROM content_status WHERE date = ? AND post_number = ?"
  ).get(date, postNumber) as { status: string } | undefined;

  if (existing && existing.status !== "approved" && existing.status !== "draft") {
    if (existing.status === "published") {
      return res.status(400).json({ error: "Post already published" });
    }
    if (existing.status === "publishing") {
      return res.status(400).json({ error: "Post is currently being published" });
    }
  }

  // Update to publishing
  db.prepare(
    `INSERT INTO content_status (date, post_number, platform, status)
     VALUES (?, ?, ?, 'publishing')
     ON CONFLICT(date, post_number) DO UPDATE SET status = 'publishing'`
  ).run(date, postNumber, platform);

  try {
    if (normalizedPlatform === "linkedin") {
      // Publish directly via LinkedIn API
      const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
      const personUrn = process.env.LINKEDIN_PERSON_URN;

      if (!accessToken || !personUrn) {
        throw new Error("LINKEDIN_ACCESS_TOKEN y LINKEDIN_PERSON_URN son requeridos en .env");
      }

      // Get post body from DB or drafts file
      const statusRow = db.prepare(
        "SELECT body_override FROM content_status WHERE date = ? AND post_number = ?"
      ).get(date, postNumber) as { body_override?: string } | undefined;

      let postBody = statusRow?.body_override || "";

      // If no override, use parseDrafts from the existing scripts
      if (!postBody) {
        const { resolve } = await import("node:path");
        const { parseDrafts } = await import(
          resolve(import.meta.dirname, "../../../scripts/lib/parse-drafts.mjs")
        );
        const posts = await parseDrafts(date);
        const target = posts.find((p: any) => p.number === postNumber);
        if (target) {
          postBody = target.body;
          // Append hashtags and UTM like the original publish script
          if (target.hashtags && !target.body.includes("#")) {
            postBody += "\n\n" + target.hashtags;
          }
          if (target.utm && target.utm !== "N/A" && !target.body.includes("utm_source")) {
            postBody += "\n\n👉 " + target.utm;
          }
        }
      }

      if (!postBody) {
        throw new Error("No se encontró el contenido del post para publicar");
      }

      // If carousel slides provided, generate PDF and upload as document
      let documentUrn: string | null = null;
      if (carouselSlides && carouselSlides.length > 0) {
        console.log(`[publish] Generating carousel PDF with ${carouselSlides.length} slides...`);
        const pdfBuffer = await generateCarouselPdf(carouselSlides);
        console.log(`[publish] PDF generated: ${(pdfBuffer.length / 1024).toFixed(0)}KB`);

        // Step 1: Initialize document upload
        const initResp = await fetch("https://api.linkedin.com/rest/documents?action=initializeUpload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "LinkedIn-Version": "202503",
          },
          body: JSON.stringify({
            initializeUploadRequest: {
              owner: personUrn,
            },
          }),
        });

        if (!initResp.ok) {
          const errBody = await initResp.text();
          throw new Error(`LinkedIn document init failed ${initResp.status}: ${errBody}`);
        }

        const initData = (await initResp.json()) as { value: { uploadUrl: string; document: string } };
        const uploadUrl = initData.value.uploadUrl;
        documentUrn = initData.value.document;

        // Step 2: Upload PDF binary
        const uploadResp = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/pdf",
          },
          body: pdfBuffer,
        });

        if (!uploadResp.ok) {
          const errBody = await uploadResp.text();
          throw new Error(`LinkedIn document upload failed ${uploadResp.status}: ${errBody}`);
        }

        console.log(`[publish] Document uploaded: ${documentUrn}`);
      }

      // Upload image if available (for non-carousel posts)
      let imageUrn: string | null = null;
      if (!documentUrn) {
        try {
          const { resolve } = await import("node:path");
          const { readdir, readFile } = await import("node:fs/promises");
          const { WORKSPACE } = await import("../db.js");
          const imagesDir = resolve(WORKSPACE, "content", "images", date);
          const files = await readdir(imagesDir).catch(() => [] as string[]);
          const prefix = String(postNumber).padStart(2, "0");
          const imageFile = files.find((f: string) => f.startsWith(prefix) && (f.endsWith(".png") || f.endsWith(".jpg")));

          if (imageFile) {
            const imagePath = resolve(imagesDir, imageFile);
            console.log(`[publish] Uploading image: ${imagePath}`);

            // Initialize image upload
            const initResp = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                "LinkedIn-Version": "202503",
              },
              body: JSON.stringify({ initializeUploadRequest: { owner: personUrn } }),
            });

            if (initResp.ok) {
              const initData = (await initResp.json()) as { value: { uploadUrl: string; image: string } };
              const imageBuffer = await readFile(imagePath);

              const uploadResp = await fetch(initData.value.uploadUrl, {
                method: "PUT",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/octet-stream",
                },
                body: imageBuffer,
              });

              if (uploadResp.ok) {
                imageUrn = initData.value.image;
                console.log(`[publish] Image uploaded: ${imageUrn}`);
              }
            }
          }
        } catch (imgErr: any) {
          console.log(`[publish] Image upload skipped: ${imgErr.message}`);
        }
      }

      // Build LinkedIn post body
      const linkedInBody: Record<string, unknown> = {
        author: personUrn,
        commentary: postBody,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
      };

      // Attach document (carousel) or image
      if (documentUrn) {
        linkedInBody.content = {
          media: {
            title: carouselTitle || "Carousel",
            id: documentUrn,
          },
        };
      } else if (imageUrn) {
        linkedInBody.content = {
          media: {
            title: "",
            id: imageUrn,
          },
        };
      }

      // Log what we're sending
      console.log(`[publish] Body length: ${postBody.length} chars`);
      console.log(`[publish] Body preview: ${postBody.substring(0, 100)}...`);
      console.log(`[publish] Has image: ${!!imageUrn}, Has document: ${!!documentUrn}`);

      // Call LinkedIn API to create post
      const resp = await fetch("https://api.linkedin.com/rest/posts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": "202503",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(linkedInBody),
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        throw new Error(`LinkedIn API error ${resp.status}: ${errBody}`);
      }

      const postId = resp.headers.get("x-restli-id") || "unknown";
      const postUrl = `https://www.linkedin.com/feed/update/${postId}`;

      db.prepare(
        `UPDATE content_status SET status = 'published', published_at = datetime('now'), published_url = ? WHERE date = ? AND post_number = ?`
      ).run(postUrl, date, postNumber);

      const isCarousel = !!documentUrn;
      logActivity("publish", "content", `${date}-${postNumber}`, `Post ${postNumber} publicado en LinkedIn${isCarousel ? " (carousel)" : ""}: ${postUrl}`, { date, postNumber, platform, postUrl, isCarousel });

      res.json({ success: true, message: `Publicado en LinkedIn${isCarousel ? " como carousel" : ""}`, postUrl, date, postNumber, platform, isCarousel });
    } else {
      // For other platforms, use the existing script runner
      const scriptMap: Record<string, string> = {
        twitter: "publish-twitter.mjs",
        tiktok: "publish-tiktok.mjs",
      };

      const script = scriptMap[normalizedPlatform];
      if (!script) {
        throw new Error(`Plataforma no soportada: ${platform}`);
      }

      const result = await runScript(script, ["--date", date, "--post", String(postNumber)]);

      if (result.code !== 0) {
        db.prepare(
          `UPDATE content_status SET status = 'failed' WHERE date = ? AND post_number = ?`
        ).run(date, postNumber);
        return res.status(500).json({ error: "Publish script failed", stderr: result.stderr, stdout: result.stdout });
      }

      db.prepare(
        `UPDATE content_status SET status = 'published', published_at = datetime('now') WHERE date = ? AND post_number = ?`
      ).run(date, postNumber);

      logActivity("publish", "content", `${date}-${postNumber}`, `Post ${postNumber} publicado en ${platform}`, { date, postNumber, platform });

      res.json({ success: true, stdout: result.stdout, date, postNumber, platform });
    }
  } catch (err: any) {
    db.prepare(
      `UPDATE content_status SET status = 'failed' WHERE date = ? AND post_number = ?`
    ).run(date, postNumber);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/publish/status/:date
router.get("/status/:date", (req, res) => {
  const rows = db.prepare("SELECT * FROM content_status WHERE date = ?").all(req.params.date);
  res.json(toCamelArray(rows as Record<string, unknown>[]));
});

export default router;

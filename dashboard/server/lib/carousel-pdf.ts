import PDFDocument from "pdfkit";

export interface CarouselSlide {
  title: string;
  body: string;
  slideNumber: number;
}

const SIZE = 1080;
const MARGIN = 80;
const CONTENT_W = SIZE - MARGIN * 2;

// Colors
const BG = "#1a1a2e";
const WHITE = "#FFFFFF";
const GREEN = "#5b8a6e";
const ORANGE = "#c97b2a";
const MUTED = "#9ca3af";
const DARK_ACCENT = "#16213e";

/**
 * Generates a professional-looking square PDF carousel from slide data.
 * Each slide is a 1080x1080 page with dark theme styling.
 */
export function generateCarouselPdf(slides: CarouselSlide[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [SIZE, SIZE], margin: 0 });
    const buffers: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    slides.forEach((slide, idx) => {
      if (idx > 0) doc.addPage({ size: [SIZE, SIZE], margin: 0 });

      const isFirst = idx === 0;
      const isLast = idx === slides.length - 1;
      const total = slides.length;

      // --- Background ---
      doc.rect(0, 0, SIZE, SIZE).fill(BG);

      // Top decorative bar
      doc.rect(0, 0, SIZE, 6).fill(GREEN);

      // Subtle corner accents
      drawCornerAccent(doc, 40, 40, 1);
      drawCornerAccent(doc, SIZE - 40, SIZE - 40, -1);

      // Bottom decorative line
      doc.rect(MARGIN, SIZE - 100, CONTENT_W, 1).fill(DARK_ACCENT);

      if (isFirst) {
        renderHookSlide(doc, slide, total);
      } else if (isLast) {
        renderCtaSlide(doc, slide, total);
      } else {
        renderContentSlide(doc, slide, total);
      }
    });

    doc.end();
  });
}

function drawCornerAccent(doc: PDFKit.PDFDocument, x: number, y: number, dir: number) {
  const len = 30;
  doc
    .moveTo(x, y)
    .lineTo(x + len * dir, y)
    .lineWidth(2)
    .strokeColor(GREEN)
    .stroke();
  doc
    .moveTo(x, y)
    .lineTo(x, y + len * dir)
    .lineWidth(2)
    .strokeColor(GREEN)
    .stroke();
}

function renderSlideNumber(doc: PDFKit.PDFDocument, current: number, total: number) {
  // Progress dots at bottom
  const dotRadius = 5;
  const gap = 18;
  const totalWidth = (total - 1) * gap;
  const startX = SIZE / 2 - totalWidth / 2;
  const dotY = SIZE - 55;

  for (let i = 0; i < total; i++) {
    const cx = startX + i * gap;
    if (i === current - 1) {
      doc.circle(cx, dotY, dotRadius).fill(GREEN);
    } else {
      doc.circle(cx, dotY, dotRadius).fill(DARK_ACCENT);
    }
  }

  // Slide number label top-right
  doc
    .fontSize(16)
    .fillColor(MUTED)
    .text(`${current}/${total}`, SIZE - MARGIN - 60, 30, {
      width: 60,
      align: "right",
    });
}

function renderHookSlide(doc: PDFKit.PDFDocument, slide: CarouselSlide, total: number) {
  renderSlideNumber(doc, 1, total);

  // Small label above headline
  doc
    .fontSize(18)
    .fillColor(ORANGE)
    .text("CAROUSEL", MARGIN, 180, { width: CONTENT_W, align: "center" });

  // Decorative line under label
  const lineW = 60;
  doc
    .rect(SIZE / 2 - lineW / 2, 215, lineW, 3)
    .fill(ORANGE);

  // Big headline centered
  doc
    .fontSize(56)
    .fillColor(WHITE)
    .text(slide.title, MARGIN, 260, {
      width: CONTENT_W,
      align: "center",
      lineGap: 8,
    });

  // Body text centered below
  if (slide.body) {
    const titleHeight = doc.heightOfString(slide.title, { width: CONTENT_W, fontSize: 56 });
    const bodyY = Math.max(260 + titleHeight + 40, 520);
    doc
      .fontSize(24)
      .fillColor(MUTED)
      .text(slide.body, MARGIN + 40, bodyY, {
        width: CONTENT_W - 80,
        align: "center",
        lineGap: 6,
      });
  }

  // Decorative bottom element
  doc
    .rect(SIZE / 2 - 30, SIZE - 130, 60, 3)
    .fill(GREEN);
}

function renderContentSlide(doc: PDFKit.PDFDocument, slide: CarouselSlide, total: number) {
  renderSlideNumber(doc, slide.slideNumber, total);

  // Accent bar left side
  doc.rect(MARGIN - 20, 120, 4, 80).fill(GREEN);

  // Slide number big watermark
  doc
    .fontSize(200)
    .fillColor(DARK_ACCENT)
    .text(String(slide.slideNumber), SIZE - 250, SIZE - 350, {
      width: 200,
      align: "right",
    });

  // Headline
  doc
    .fontSize(48)
    .fillColor(WHITE)
    .text(slide.title, MARGIN, 130, {
      width: CONTENT_W,
      lineGap: 6,
    });

  // Divider line
  const headlineH = doc.heightOfString(slide.title, { width: CONTENT_W, fontSize: 48 });
  const dividerY = 130 + headlineH + 20;
  doc.rect(MARGIN, dividerY, 80, 3).fill(ORANGE);

  // Body
  if (slide.body) {
    const bodyY = dividerY + 30;
    doc
      .fontSize(26)
      .fillColor(MUTED)
      .text(slide.body, MARGIN, bodyY, {
        width: CONTENT_W - 40,
        lineGap: 10,
      });
  }
}

function renderCtaSlide(doc: PDFKit.PDFDocument, slide: CarouselSlide, total: number) {
  renderSlideNumber(doc, slide.slideNumber, total);

  // Decorative top element
  doc
    .rect(SIZE / 2 - 30, 150, 60, 3)
    .fill(GREEN);

  // CTA headline centered
  doc
    .fontSize(52)
    .fillColor(WHITE)
    .text(slide.title, MARGIN, 220, {
      width: CONTENT_W,
      align: "center",
      lineGap: 8,
    });

  // Body / CTA text
  if (slide.body) {
    const titleH = doc.heightOfString(slide.title, { width: CONTENT_W, fontSize: 52 });
    const bodyY = Math.max(220 + titleH + 30, 440);
    doc
      .fontSize(24)
      .fillColor(MUTED)
      .text(slide.body, MARGIN + 60, bodyY, {
        width: CONTENT_W - 120,
        align: "center",
        lineGap: 6,
      });
  }

  // CTA button-like element
  const btnW = 320;
  const btnH = 56;
  const btnX = SIZE / 2 - btnW / 2;
  const btnY = SIZE - 220;

  doc.roundedRect(btnX, btnY, btnW, btnH, 28).fill(GREEN);
  doc
    .fontSize(22)
    .fillColor(WHITE)
    .text("github.com/openclaw-team", btnX, btnY + 17, {
      width: btnW,
      align: "center",
    });

  // Arrow decoration
  doc
    .rect(SIZE / 2 - 20, btnY - 30, 40, 2)
    .fill(ORANGE);
}

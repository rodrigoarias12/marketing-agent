import { useEffect, useRef, useCallback } from "react";
import { Application, Graphics, Container, Text, TextStyle } from "pixi.js";

// ── Agent data types ──
export interface OfficeAgent {
  id: string;
  name: string;
  role: string;
  status: "active" | "idle" | "working";
  currentTask: string;
  color: number; // hex color
}

// ── Default agents ──
const DEFAULT_AGENTS: OfficeAgent[] = [
  { id: "eddie", name: "Eddie", role: "AI Strategy Lead", status: "working", currentTask: "Coordinating campaigns", color: 0x7c5b8a },
  { id: "scout", name: "Scout", role: "Research Agent", status: "working", currentTask: "Analyzing competitors", color: 0x5b7ea8 },
  { id: "pixel", name: "Pixel", role: "Content Creator", status: "active", currentTask: "Writing LinkedIn post", color: 0xc97b2a },
  { id: "link", name: "Link", role: "Publishing Agent", status: "idle", currentTask: "", color: 0x8b5ca8 },
  { id: "analyst", name: "Analyst", role: "Data Analyst", status: "working", currentTask: "Processing metrics", color: 0xe07844 },
];

// ── Pixel scale & canvas ──
const PX = 4;
const CANVAS_W = 200; // pixel units
const CANVAS_H = 112;
const TITLE_BAR_H = 24; // screen pixels

// ── Color palette ──
const C = {
  wallBg: 0xf8f6f0,
  wallTrim: 0xe8e0d5,
  floorBase: 0xe8dfd0,
  floorLine: 0xddd4c4,
  deskTop: 0xd4c5b0,
  deskLeg: 0xbcab94,
  deskEdge: 0xc4b49e,
  monitorBody: 0x3a3a3c,
  monitorBezel: 0x2c2c2e,
  monitorStand: 0xc0c0c0,
  monitorScreen: 0x1e2028,
  screenGreen: 0x4ade80,
  screenBlue: 0x60a5fa,
  screenOrange: 0xfbbf24,
  chairBase: 0x4a4a4c,
  keyboard: 0xe5e5e5,
  keyboardKey: 0xd0d0d0,
  plantGreen1: 0x4a7c59,
  plantGreen2: 0x6b9b7b,
  plantGreen3: 0x3d6b4a,
  plantPot: 0xc4866a,
  plantPotDark: 0xa86e55,
  skyTop: 0x87ceeb,
  skyBot: 0xe0f0ff,
  cityDark: 0x8899aa,
  cityMid: 0x99aabb,
  cityLight: 0xaabbcc,
  skin: 0xf5d0a9,
  skinDark: 0xe8b888,
  hair1: 0x3a2a1a,
  hair2: 0x8b6543,
  hair3: 0xd4a050,
  windowFrame: 0xd0d0d0,
  whiteboard: 0xffffff,
  whiteboardBorder: 0xcccccc,
  couchBase: 0x6b7b8b,
  couchCushion: 0x7b8b9b,
  couchArm: 0x5b6b7b,
  coffeeTable: 0xc4b49e,
  coffeeMachine: 0x3a3a3c,
  coffeeCup: 0xf5f0e8,
  steam: 0xffffff,
  pendantCord: 0x888888,
  pendantShade: 0x2c2c2e,
  pendantGlow: 0xfffbe6,
  bubbleBg: 0xffffff,
  bubbleBorder: 0xe0e0e0,
  slackGreen: 0x22c55e,
  idleGray: 0xb0b0b0,
  zzzColor: 0xaabbcc,
  dustMote: 0xfff8e8,
  titleBg: 0xfafaf8,
  titleBorder: 0xe8e0d5,
  titleText: 0x3a3a3c,
  clockText: 0x9a9a9a,
  statusDot: 0x22c55e,
};

// ── Desk positions ──
interface DeskPos { x: number; y: number }

const DESK_POSITIONS: DeskPos[] = [
  { x: 30, y: 34 },
  { x: 65, y: 34 },
  { x: 100, y: 34 },
  { x: 47, y: 68 },
  { x: 82, y: 68 },
];

const LOUNGE_POS = { x: 158, y: 76 };
const COFFEE_POS = { x: 170, y: 40 };

// ── Helpers ──
function drawRect(g: Graphics, x: number, y: number, w: number, h: number, color: number) {
  g.rect(x * PX, y * PX, w * PX, h * PX).fill(color);
}

function lighten(color: number, amt: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + Math.floor(255 * amt));
  const gv = Math.min(255, ((color >> 8) & 0xff) + Math.floor(255 * amt));
  const b = Math.min(255, (color & 0xff) + Math.floor(255 * amt));
  return (r << 16) | (gv << 8) | b;
}

function darken(color: number, amt: number): number {
  const r = Math.max(0, ((color >> 16) & 0xff) - Math.floor(255 * amt));
  const gv = Math.max(0, ((color >> 8) & 0xff) - Math.floor(255 * amt));
  const b = Math.max(0, (color & 0xff) - Math.floor(255 * amt));
  return (r << 16) | (gv << 8) | b;
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return (rr << 16) | (rg << 8) | rb;
}

// ── Scene builders ──

function buildBackground(container: Container, tick: number) {
  const g = new Graphics();

  // Wall background
  drawRect(g, 0, 0, CANVAS_W, CANVAS_H, C.wallBg);

  // Floor with wood plank lines
  drawRect(g, 0, 52, CANVAS_W, CANVAS_H - 52, C.floorBase);
  for (let y = 54; y < CANVAS_H; y += 6) {
    drawRect(g, 0, y, CANVAS_W, 1, C.floorLine);
  }
  // Offset planks
  for (let y = 57; y < CANVAS_H; y += 6) {
    for (let x = 20; x < CANVAS_W; x += 40) {
      drawRect(g, x, y - 2, 1, 5, C.floorLine);
    }
  }
  for (let y = 54; y < CANVAS_H; y += 6) {
    for (let x = 0; x < CANVAS_W; x += 40) {
      drawRect(g, x, y + 1, 1, 5, C.floorLine);
    }
  }

  // Wall base trim
  drawRect(g, 0, 50, CANVAS_W, 2, C.wallTrim);

  container.addChild(g);

  // --- Large window with cityscape ---
  buildWindow(container, 16, 4, 48, 38, tick);

  // --- Whiteboard on wall (right side) ---
  buildWhiteboard(container, 128, 6, 30, 22, tick);
}

function buildWindow(container: Container, wx: number, wy: number, ww: number, wh: number, tick: number) {
  const g = new Graphics();

  // Window frame
  drawRect(g, wx - 1, wy - 1, ww + 2, wh + 2, C.windowFrame);

  // Sky gradient (approximated with horizontal strips)
  for (let row = 0; row < wh; row++) {
    const t = row / wh;
    const color = lerpColor(C.skyTop, C.skyBot, t);
    drawRect(g, wx, wy + row, ww, 1, color);
  }

  // Cityscape silhouette at bottom of window
  const buildings = [
    { bx: 0, bw: 6, bh: 14 },
    { bx: 5, bw: 4, bh: 18 },
    { bx: 8, bw: 7, bh: 22 },
    { bx: 14, bw: 3, bh: 10 },
    { bx: 16, bw: 5, bh: 16 },
    { bx: 20, bw: 8, bh: 25 },
    { bx: 27, bw: 4, bh: 12 },
    { bx: 30, bw: 6, bh: 20 },
    { bx: 35, bw: 3, bh: 8 },
    { bx: 37, bw: 5, bh: 15 },
    { bx: 41, bw: 7, bh: 24 },
  ];
  for (const b of buildings) {
    const bx = wx + b.bx;
    const by = wy + wh - b.bh;
    if (bx + b.bw <= wx + ww) {
      drawRect(g, bx, by, b.bw, b.bh, b.bh > 18 ? C.cityDark : b.bh > 12 ? C.cityMid : C.cityLight);
      // Tiny windows on buildings
      for (let ry = by + 2; ry < wy + wh - 2; ry += 3) {
        for (let rx = bx + 1; rx < bx + b.bw - 1; rx += 2) {
          const lit = Math.sin(tick * 0.01 + rx * 3.7 + ry * 2.1) > 0.3;
          if (lit) {
            drawRect(g, rx, ry, 1, 1, 0xfff8dd);
          }
        }
      }
    }
  }

  // Window cross dividers
  const midX = wx + Math.floor(ww / 2);
  const midY = wy + Math.floor(wh / 2);
  drawRect(g, midX, wy, 1, wh, C.windowFrame);
  drawRect(g, wx, midY, ww, 1, C.windowFrame);

  container.addChild(g);

  // Sunbeam overlay (faint)
  const sunbeam = new Graphics();
  // Diagonal light beam from top-right of window
  const beamG = new Graphics();
  const bsx = (wx + ww - 8) * PX;
  const bsy = wy * PX;
  beamG.moveTo(bsx, bsy);
  beamG.lineTo(bsx + 16 * PX, bsy);
  beamG.lineTo(bsx + 32 * PX, (wy + wh + 30) * PX);
  beamG.lineTo(bsx + 8 * PX, (wy + wh + 30) * PX);
  beamG.closePath();
  beamG.fill(0xfffff0);
  beamG.alpha = 0.04 + Math.sin(tick * 0.008) * 0.01;
  sunbeam.addChild(beamG);
  container.addChild(sunbeam);
}

function buildWhiteboard(container: Container, wx: number, wy: number, ww: number, wh: number, _tick: number) {
  const g = new Graphics();
  // Board
  drawRect(g, wx, wy, ww, wh, C.whiteboard);
  drawRect(g, wx, wy, ww, 1, C.whiteboardBorder);
  drawRect(g, wx, wy + wh - 1, ww, 1, C.whiteboardBorder);
  drawRect(g, wx, wy, 1, wh, C.whiteboardBorder);
  drawRect(g, wx + ww - 1, wy, 1, wh, C.whiteboardBorder);

  // Kanban columns
  drawRect(g, wx + 10, wy + 1, 1, wh - 2, 0xeeeeee);
  drawRect(g, wx + 20, wy + 1, 1, wh - 2, 0xeeeeee);

  // Sticky notes (colored rectangles)
  const stickies = [
    { sx: 2, sy: 3, sw: 6, sh: 3, color: 0xfde68a },
    { sx: 3, sy: 8, sw: 5, sh: 3, color: 0xbbf7d0 },
    { sx: 2, sy: 13, sw: 6, sh: 3, color: 0xfecaca },
    { sx: 12, sy: 3, sw: 6, sh: 3, color: 0xbfdbfe },
    { sx: 13, sy: 8, sw: 5, sh: 3, color: 0xfde68a },
    { sx: 22, sy: 4, sw: 6, sh: 3, color: 0xbbf7d0 },
    { sx: 23, sy: 9, sw: 5, sh: 3, color: 0xe9d5ff },
  ];
  for (const s of stickies) {
    drawRect(g, wx + s.sx, wy + s.sy, s.sw, s.sh, s.color);
  }

  // Shelf under whiteboard
  drawRect(g, wx, wy + wh, ww, 1, C.whiteboardBorder);

  container.addChild(g);
}

function buildPendantLights(container: Container, tick: number) {
  const positions = [40, 80, 120, 160];
  for (const px of positions) {
    const g = new Graphics();
    // Cord
    drawRect(g, px, 0, 1, 5, C.pendantCord);
    // Shade
    drawRect(g, px - 2, 5, 5, 2, C.pendantShade);
    drawRect(g, px - 1, 7, 3, 1, C.pendantShade);

    container.addChild(g);

    // Glow
    const glow = new Graphics();
    glow.circle(px * PX + 2, 8 * PX, 12 * PX);
    glow.fill(C.pendantGlow);
    glow.alpha = 0.03 + Math.sin(tick * 0.015 + px * 0.1) * 0.008;
    container.addChild(glow);
  }
}

function buildPlant(container: Container, px: number, py: number, variant: number, tick: number) {
  const g = new Graphics();

  // Pot
  drawRect(g, px - 2, py, 5, 3, C.plantPot);
  drawRect(g, px - 1, py + 3, 3, 1, C.plantPotDark);

  // Leaves with gentle sway
  const sway = Math.sin(tick * 0.02 + variant * 2.5) * 0.5;

  if (variant % 3 === 0) {
    // Monstera style - big round leaves
    const leaves = [
      { dx: -3, dy: -5, s: 3 },
      { dx: 1, dy: -6, s: 3 },
      { dx: -1, dy: -4, s: 2 },
      { dx: 3, dy: -4, s: 2 },
      { dx: 0, dy: -7, s: 2 },
    ];
    for (const l of leaves) {
      const lx = px + l.dx + Math.round(sway * (l.dy < -5 ? 1 : 0.5));
      drawRect(g, lx, py + l.dy, l.s, l.s, C.plantGreen1);
      drawRect(g, lx + 1, py + l.dy + 1, 1, 1, C.plantGreen2);
    }
    // Stem
    drawRect(g, px, py - 3, 1, 3, C.plantGreen3);
  } else if (variant % 3 === 1) {
    // Fiddle leaf fig - tall stems with big leaves at top
    drawRect(g, px, py - 7, 1, 7, C.plantGreen3);
    drawRect(g, px - 2, py - 9, 5, 3, C.plantGreen1);
    drawRect(g, px - 1, py - 10, 3, 2, C.plantGreen2);
    const swayPx = Math.round(sway);
    drawRect(g, px - 1 + swayPx, py - 11, 3, 2, C.plantGreen1);
  } else {
    // Small succulent
    drawRect(g, px - 1, py - 2, 3, 2, C.plantGreen2);
    drawRect(g, px, py - 3, 1, 1, C.plantGreen1);
    drawRect(g, px - 2, py - 1, 1, 1, C.plantGreen1);
    drawRect(g, px + 2, py - 1, 1, 1, C.plantGreen1);
  }

  container.addChild(g);
}

function buildDesk(container: Container, pos: DeskPos) {
  const g = new Graphics();
  const { x, y } = pos;

  // Desk surface (standing desk style - taller legs)
  drawRect(g, x - 10, y, 20, 2, C.deskTop);
  drawRect(g, x - 10, y + 2, 20, 1, C.deskEdge);

  // Thin metal legs
  drawRect(g, x - 9, y + 3, 1, 8, C.deskLeg);
  drawRect(g, x + 8, y + 3, 1, 8, C.deskLeg);

  // iMac-style monitor: thin body, silver stand
  // Screen
  drawRect(g, x - 6, y - 9, 12, 8, C.monitorBezel);
  drawRect(g, x - 5, y - 8, 10, 6, C.monitorScreen);
  // Thin chin
  drawRect(g, x - 6, y - 1, 12, 1, C.monitorBody);
  // Stand (thin silver)
  drawRect(g, x - 1, y - 0, 2, 1, C.monitorStand);
  // Stand base
  drawRect(g, x - 3, y + 0, 6, 1, C.monitorStand);

  // Keyboard
  drawRect(g, x - 4, y + 1, 8, 1, C.keyboard);

  container.addChild(g);
}

function buildMonitorContent(container: Container, pos: DeskPos, agent: OfficeAgent, tick: number) {
  const g = new Graphics();
  const { x, y } = pos;
  const sx = x - 5;
  const sy = y - 8;
  const sw = 10;
  const sh = 6;

  if (agent.status === "idle") {
    // Screensaver: bouncing color dot
    const phase = tick * 0.03 + DESK_POSITIONS.indexOf(pos);
    const dotX = sx + 2 + Math.abs(Math.sin(phase) * (sw - 4));
    const dotY = sy + 1 + Math.abs(Math.cos(phase * 0.7) * (sh - 3));
    drawRect(g, Math.floor(dotX), Math.floor(dotY), 2, 2, lighten(agent.color, 0.2));
    // Dim screen tint
    drawRect(g, sx, sy, sw, sh, 0x1a1a2e);
    g.alpha = 0.5;
  } else {
    // Code scrolling effect
    const scrollOffset = Math.floor(tick * 0.15) % 8;
    for (let row = 0; row < sh; row++) {
      const lineY = sy + row;
      const seed = (row + scrollOffset) * 7 + DESK_POSITIONS.indexOf(pos) * 13;
      const indent = (seed % 3) * 1;
      const lineLen = 3 + (seed % 5);
      const color = seed % 4 === 0 ? C.screenGreen : seed % 4 === 1 ? C.screenBlue : seed % 4 === 2 ? C.screenOrange : C.screenGreen;
      drawRect(g, sx + indent, lineY, Math.min(lineLen, sw - indent), 1, color);
    }
    g.alpha = 0.9;
  }

  container.addChild(g);
}

function buildChair(container: Container, pos: DeskPos, agent: OfficeAgent) {
  const g = new Graphics();
  const { x, y } = pos;
  const cy = y + 12;

  // Ergonomic chair with agent color accent
  const chairColor = agent.status === "idle" ? C.chairBase : darken(agent.color, 0.15);

  // Chair back (curved)
  drawRect(g, x - 4, cy - 2, 8, 3, chairColor);
  drawRect(g, x - 3, cy - 3, 6, 1, chairColor);

  // Seat cushion
  drawRect(g, x - 4, cy + 1, 8, 2, lighten(chairColor, 0.1));

  // Chair base / wheels
  drawRect(g, x - 1, cy + 3, 2, 2, C.chairBase);
  drawRect(g, x - 3, cy + 5, 6, 1, C.chairBase);

  container.addChild(g);
}

function buildCharacter(
  container: Container,
  pos: DeskPos,
  agent: OfficeAgent,
  tick: number,
  atLounge: boolean,
) {
  const charC = new Container();
  const g = new Graphics();

  const isIdle = agent.status === "idle";
  const agentIdx = DESK_POSITIONS.indexOf(pos);
  const baseColor = isIdle ? C.idleGray : agent.color;
  const skinColor = isIdle ? C.skinDark : C.skin;

  let cx: number, cy: number;
  if (atLounge) {
    cx = LOUNGE_POS.x + agentIdx * 4;
    cy = LOUNGE_POS.y;
  } else {
    cx = pos.x;
    cy = pos.y + 13;
  }

  // Breathing animation (subtle vertical scale pulse)
  const breathe = Math.sin(tick * 0.04 + agentIdx * 1.7) * 0.6;
  // Working bob
  const bob = (!isIdle && !atLounge) ? Math.sin(tick * 0.08 + agentIdx * 1.3) * 0.8 : 0;
  const yOff = breathe * 0.3 + bob;

  const py = cy + yOff;

  // ── Hair (varies per agent) ──
  const hairColors = [C.hair1, C.hair2, C.hair3, C.hair1, C.hair2];
  const hairColor = isIdle ? darken(hairColors[agentIdx % 5], 0.1) : hairColors[agentIdx % 5];

  // Hair top
  if (agentIdx % 3 === 0) {
    // Short spiky
    drawRect(g, cx - 3, py - 14, 6, 2, hairColor);
    drawRect(g, cx - 2, py - 15, 4, 1, hairColor);
  } else if (agentIdx % 3 === 1) {
    // Side part
    drawRect(g, cx - 3, py - 14, 7, 2, hairColor);
    drawRect(g, cx - 3, py - 12, 1, 2, hairColor);
  } else {
    // Full top
    drawRect(g, cx - 3, py - 15, 6, 3, hairColor);
  }

  // ── Head ──
  drawRect(g, cx - 3, py - 12, 6, 6, skinColor);

  // Eyes
  const blinkPhase = tick % 180;
  const isBlinking = blinkPhase > 175;
  if (isBlinking) {
    drawRect(g, cx - 2, py - 9, 1, 1, darken(skinColor, 0.15));
    drawRect(g, cx + 1, py - 9, 1, 1, darken(skinColor, 0.15));
  } else {
    drawRect(g, cx - 2, py - 10, 1, 2, 0x2c2c2e);
    drawRect(g, cx + 1, py - 10, 1, 2, 0x2c2c2e);
    // Eye highlights
    drawRect(g, cx - 2, py - 10, 1, 1, 0x444444);
    drawRect(g, cx + 1, py - 10, 1, 1, 0x444444);
  }

  // Mouth
  if (!isIdle) {
    drawRect(g, cx - 1, py - 7, 2, 1, 0xd49888);
  } else {
    drawRect(g, cx - 1, py - 7, 2, 1, darken(skinColor, 0.1));
  }

  // ── Body ── (shirt in agent color)
  drawRect(g, cx - 4, py - 6, 8, 7, baseColor);
  // Shirt collar/detail
  drawRect(g, cx - 1, py - 6, 2, 2, lighten(baseColor, 0.15));

  // ── Arms ──
  if (!isIdle && !atLounge) {
    // Typing animation: arms move
    const armPhase = Math.sin(tick * 0.12 + agentIdx * 2) > 0 ? 0 : 1;
    drawRect(g, cx - 5, py - 5 + armPhase, 1, 4, skinColor);
    drawRect(g, cx + 4, py - 5 - armPhase, 1, 4, skinColor);
    // Hands
    drawRect(g, cx - 5, py - 1 + armPhase, 1, 1, skinColor);
    drawRect(g, cx + 4, py - 1 - armPhase, 1, 1, skinColor);
  } else if (atLounge) {
    // Holding coffee
    drawRect(g, cx - 5, py - 4, 1, 3, skinColor);
    drawRect(g, cx + 4, py - 4, 1, 3, skinColor);
    // Coffee cup in hand
    drawRect(g, cx + 4, py - 5, 2, 2, C.coffeeCup);
    drawRect(g, cx + 4, py - 5, 2, 1, 0xaa6633);
  } else {
    // Relaxed arms
    drawRect(g, cx - 5, py - 4, 1, 4, skinColor);
    drawRect(g, cx + 4, py - 4, 1, 4, skinColor);
  }

  // ── Legs ──
  // Pants slightly darker than shirt
  drawRect(g, cx - 3, py + 1, 3, 4, 0x4a5060);
  drawRect(g, cx, py + 1, 3, 4, 0x4a5060);
  // Shoes
  drawRect(g, cx - 3, py + 5, 3, 1, 0x333338);
  drawRect(g, cx, py + 5, 3, 1, 0x333338);

  charC.addChild(g);
  container.addChild(charC);
}

function buildLounge(container: Container) {
  const g = new Graphics();
  const lx = 140;
  const ly = 72;

  // Couch - modern sectional
  // Back
  drawRect(g, lx, ly, 24, 3, C.couchArm);
  // Seat cushions
  drawRect(g, lx, ly + 3, 24, 6, C.couchBase);
  drawRect(g, lx + 1, ly + 3, 10, 5, C.couchCushion);
  drawRect(g, lx + 13, ly + 3, 10, 5, C.couchCushion);
  // Arms
  drawRect(g, lx - 2, ly, 2, 9, C.couchArm);
  drawRect(g, lx + 24, ly, 2, 9, C.couchArm);
  // Legs
  drawRect(g, lx, ly + 9, 2, 1, 0x333338);
  drawRect(g, lx + 22, ly + 9, 2, 1, 0x333338);

  // Coffee table in front of couch
  drawRect(g, lx + 4, ly + 12, 16, 6, C.coffeeTable);
  drawRect(g, lx + 4, ly + 18, 16, 1, darken(C.coffeeTable, 0.1));
  // Table legs
  drawRect(g, lx + 5, ly + 19, 1, 2, darken(C.coffeeTable, 0.15));
  drawRect(g, lx + 18, ly + 19, 1, 2, darken(C.coffeeTable, 0.15));

  // Magazine / tablet on table
  drawRect(g, lx + 7, ly + 13, 5, 3, 0x3a3a3c);
  drawRect(g, lx + 8, ly + 14, 3, 1, 0x60a5fa);

  container.addChild(g);
}

function buildCoffeeMachine(container: Container, tick: number) {
  const g = new Graphics();
  const mx = COFFEE_POS.x;
  const my = COFFEE_POS.y;

  // Counter / table
  drawRect(g, mx - 6, my + 4, 14, 3, C.deskTop);
  drawRect(g, mx - 6, my + 7, 14, 1, C.deskEdge);
  drawRect(g, mx - 5, my + 8, 1, 5, C.deskLeg);
  drawRect(g, mx + 6, my + 8, 1, 5, C.deskLeg);

  // Machine body
  drawRect(g, mx - 3, my - 4, 8, 8, C.coffeeMachine);
  drawRect(g, mx - 2, my - 3, 6, 4, 0x555555);
  // Red indicator light
  drawRect(g, mx + 3, my - 3, 1, 1, 0xff4444);
  // Drip area
  drawRect(g, mx - 1, my + 1, 4, 2, 0x222222);
  // Cup
  drawRect(g, mx, my + 3, 2, 2, C.coffeeCup);

  container.addChild(g);

  // Steam particles
  const steamC = new Container();
  for (let i = 0; i < 3; i++) {
    const sg = new Graphics();
    const phase = tick * 0.04 + i * 2.1;
    const sy = my - 5 - (phase % 6);
    const sx = mx + Math.sin(phase * 1.3 + i) * 1.5;
    const alpha = Math.max(0, 1 - ((phase % 6) / 6));
    drawRect(sg, Math.floor(sx), Math.floor(sy), 1, 1, C.steam);
    sg.alpha = alpha * 0.35;
    steamC.addChild(sg);
  }
  container.addChild(steamC);
}

function buildDustMotes(container: Container, tick: number) {
  const moteC = new Container();
  // A few floating dust motes in the sunbeam area
  for (let i = 0; i < 6; i++) {
    const phase = tick * 0.008 + i * 11.3;
    const mx = 52 + Math.sin(phase * 0.7 + i * 3) * 20;
    const my = 12 + Math.sin(phase * 0.5 + i * 5) * 28 + (phase % 50);
    if (my > 5 && my < 50) {
      const g = new Graphics();
      drawRect(g, Math.floor(mx), Math.floor(my), 1, 1, C.dustMote);
      g.alpha = 0.2 + Math.sin(phase + i) * 0.1;
      moteC.addChild(g);
    }
  }
  container.addChild(moteC);
}

function buildStatusBubble(
  container: Container,
  pos: DeskPos,
  agent: OfficeAgent,
  tick: number,
  atLounge: boolean,
) {
  const agentIdx = DESK_POSITIONS.indexOf(pos);

  let bx: number, by: number;
  if (atLounge) {
    bx = LOUNGE_POS.x + agentIdx * 4;
    by = LOUNGE_POS.y - 18;
  } else {
    bx = pos.x;
    by = pos.y - 2;
  }

  // Fade/bounce animation
  const fadeIn = Math.min(1, (Math.sin(tick * 0.02 + agentIdx * 1.1) + 1) / 2 * 1.5);
  const bounce = Math.sin(tick * 0.05 + agentIdx * 0.9) * 1;

  if (agent.status === "idle") {
    // Zzz floating
    const zzzC = new Container();
    for (let i = 0; i < 3; i++) {
      const zPhase = tick * 0.03 + i * 1.5;
      const zy = by - 2 - i * 3 - (zPhase % 4);
      const zAlpha = Math.max(0, 0.7 - i * 0.2 - ((zPhase % 4) / 8));
      const zt = new Text({
        text: "z",
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 8 + i * 2,
          fill: C.zzzColor,
          fontWeight: "bold",
        }),
      });
      zt.x = (bx + 5 + i * 2) * PX;
      zt.y = zy * PX;
      zt.alpha = zAlpha;
      zzzC.addChild(zt);
    }
    container.addChild(zzzC);
    return;
  }

  if (!agent.currentTask) return;

  const bubbleC = new Container();
  bubbleC.alpha = fadeIn;

  const taskText = agent.currentTask.length > 24
    ? agent.currentTask.slice(0, 22) + ".."
    : agent.currentTask;

  const textW = taskText.length * 5.2 + 20;
  const bubbleH = 18;
  const bubbleX = (bx - 8) * PX;
  const bubbleY = (by + bounce - 10) * PX;

  const bg = new Graphics();
  // Rounded bubble
  bg.roundRect(bubbleX, bubbleY, textW, bubbleH, 6).fill(C.bubbleBg);
  bg.roundRect(bubbleX, bubbleY, textW, bubbleH, 6).stroke({ color: C.bubbleBorder, width: 1 });
  // Pointer triangle
  bg.moveTo(bx * PX, (by + bounce) * PX);
  bg.lineTo((bx - 2) * PX, bubbleY + bubbleH);
  bg.lineTo((bx + 2) * PX, bubbleY + bubbleH);
  bg.closePath();
  bg.fill(C.bubbleBg);

  bubbleC.addChild(bg);

  // Status dot (like Slack)
  const dotG = new Graphics();
  dotG.circle(bubbleX + 8, bubbleY + bubbleH / 2, 3).fill(C.slackGreen);
  bubbleC.addChild(dotG);

  // Task text
  const txt = new Text({
    text: taskText,
    style: new TextStyle({
      fontFamily: "monospace",
      fontSize: 8,
      fill: 0x3a3a3c,
    }),
  });
  txt.x = bubbleX + 14;
  txt.y = bubbleY + 4;
  bubbleC.addChild(txt);

  container.addChild(bubbleC);
}

function buildActivityIndicator(container: Container, pos: DeskPos, agent: OfficeAgent, tick: number) {
  if (agent.status === "idle") return;

  const g = new Graphics();
  const cx = (pos.x + 12) * PX;
  const cy = (pos.y + 2) * PX;

  // Three spinning dots
  for (let i = 0; i < 3; i++) {
    const angle = tick * 0.08 + (i * Math.PI * 2) / 3;
    const dx = Math.cos(angle) * 4;
    const dy = Math.sin(angle) * 4;
    g.circle(cx + dx, cy + dy, 1.5).fill(agent.color);
  }
  g.alpha = 0.6;
  container.addChild(g);
}

function buildNameLabels(container: Container, pos: DeskPos, agent: OfficeAgent) {
  const label = new Text({
    text: agent.name,
    style: new TextStyle({
      fontFamily: "monospace",
      fontSize: 9,
      fill: 0x5a5a5c,
      fontWeight: "bold",
    }),
  });
  label.anchor.set(0.5, 0);
  label.x = pos.x * PX;
  label.y = (pos.y + 22) * PX;
  container.addChild(label);

  const role = new Text({
    text: agent.role,
    style: new TextStyle({
      fontFamily: "monospace",
      fontSize: 7,
      fill: 0x9a9a9c,
    }),
  });
  role.anchor.set(0.5, 0);
  role.x = pos.x * PX;
  role.y = (pos.y + 22) * PX + 11;
  container.addChild(role);
}

function buildWallClock(container: Container, tick: number) {
  const g = new Graphics();
  const cx = 110;
  const cy = 10;
  const r = 5;

  // Clock body
  g.circle(cx * PX, cy * PX, r * PX).fill(0xffffff);
  g.circle(cx * PX, cy * PX, r * PX).stroke({ color: 0xcccccc, width: 1 });

  // Clock hands based on real time
  const now = new Date();
  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  // Hour hand
  const hAngle = ((hours + minutes / 60) / 12) * Math.PI * 2 - Math.PI / 2;
  const hLen = 2.5 * PX;
  g.moveTo(cx * PX, cy * PX);
  g.lineTo(cx * PX + Math.cos(hAngle) * hLen, cy * PX + Math.sin(hAngle) * hLen);
  g.stroke({ color: 0x333333, width: 2 });

  // Minute hand
  const mAngle = ((minutes + seconds / 60) / 60) * Math.PI * 2 - Math.PI / 2;
  const mLen = 3.5 * PX;
  g.moveTo(cx * PX, cy * PX);
  g.lineTo(cx * PX + Math.cos(mAngle) * mLen, cy * PX + Math.sin(mAngle) * mLen);
  g.stroke({ color: 0x555555, width: 1.5 });

  // Second hand (smooth sweep using tick for sub-second smoothness)
  const sAngle = ((seconds + (tick % 60) / 60) / 60) * Math.PI * 2 - Math.PI / 2;
  const sLen = 3.8 * PX;
  g.moveTo(cx * PX, cy * PX);
  g.lineTo(cx * PX + Math.cos(sAngle) * sLen, cy * PX + Math.sin(sAngle) * sLen);
  g.stroke({ color: 0xee4444, width: 1 });

  // Center dot
  g.circle(cx * PX, cy * PX, 1.5).fill(0x333333);

  container.addChild(g);
}

function buildTitleBar(container: Container) {
  const bg = new Graphics();
  bg.rect(0, 0, CANVAS_W * PX, TITLE_BAR_H).fill(C.titleBg);
  bg.rect(0, TITLE_BAR_H - 1, CANVAS_W * PX, 1).fill(C.titleBorder);
  container.addChild(bg);

  // Status dot
  const dot = new Graphics();
  dot.circle(12, TITLE_BAR_H / 2, 3.5).fill(C.statusDot);
  container.addChild(dot);

  const title = new Text({
    text: "Eddie HQ",
    style: new TextStyle({
      fontFamily: "monospace",
      fontSize: 11,
      fill: C.titleText,
      fontWeight: "bold",
      letterSpacing: 0.5,
    }),
  });
  title.x = 20;
  title.y = 6;
  container.addChild(title);

  // Current time on right side
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const clock = new Text({
    text: timeStr,
    style: new TextStyle({
      fontFamily: "monospace",
      fontSize: 10,
      fill: C.clockText,
    }),
  });
  clock.anchor.set(1, 0);
  clock.x = CANVAS_W * PX - 8;
  clock.y = 7;
  container.addChild(clock);
}

// ── Main component ──
interface PixelOfficeProps {
  agents?: OfficeAgent[];
}

export function PixelOffice({ agents = DEFAULT_AGENTS }: PixelOfficeProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const tickRef = useRef(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5 }); // normalized 0-1

  const buildScene = useCallback(
    (app: Application, currentAgents: OfficeAgent[]) => {
      // Clear stage
      while (app.stage.children.length > 0) {
        app.stage.removeChildAt(0);
      }

      const tick = tickRef.current;

      // Title bar layer (fixed at top)
      const titleLayer = new Container();
      buildTitleBar(titleLayer);
      app.stage.addChild(titleLayer);

      // Main scene container (offset below title bar)
      const scene = new Container();
      scene.y = TITLE_BAR_H;

      // Parallax: subtle shift based on mouse position
      const parallaxX = (mouseRef.current.x - 0.5) * -3;
      const parallaxY = (mouseRef.current.y - 0.5) * -2;

      // Background layer (parallax moves less)
      const bgLayer = new Container();
      bgLayer.x = parallaxX * 0.5;
      bgLayer.y = parallaxY * 0.5;
      buildBackground(bgLayer, tick);
      buildPendantLights(bgLayer, tick);
      buildWallClock(bgLayer, tick);
      scene.addChild(bgLayer);

      // Midground: furniture
      const furnitureLayer = new Container();
      furnitureLayer.x = parallaxX * 0.7;
      furnitureLayer.y = parallaxY * 0.7;

      // Plants
      buildPlant(furnitureLayer, 8, 48, 0, tick);
      buildPlant(furnitureLayer, 190, 48, 1, tick);
      buildPlant(furnitureLayer, 75, 50, 2, tick);
      buildPlant(furnitureLayer, 130, 50, 3, tick);
      buildPlant(furnitureLayer, 170, 60, 5, tick);

      // Lounge area
      buildLounge(furnitureLayer);
      buildCoffeeMachine(furnitureLayer, tick);

      // Desks and chairs
      currentAgents.forEach((agent, i) => {
        const pos = DESK_POSITIONS[i];
        if (!pos) return;
        buildDesk(furnitureLayer, pos);
        buildChair(furnitureLayer, pos, agent);
      });

      scene.addChild(furnitureLayer);

      // Foreground: characters, monitor content, effects
      const charLayer = new Container();
      charLayer.x = parallaxX;
      charLayer.y = parallaxY;

      // Dust motes
      buildDustMotes(charLayer, tick);

      currentAgents.forEach((agent, i) => {
        const pos = DESK_POSITIONS[i];
        if (!pos) return;

        // Monitor content
        buildMonitorContent(charLayer, pos, agent, tick);

        // Determine if agent is at lounge (idle agents sometimes)
        const atLounge = false; // Could be extended for "break" status

        // Character
        buildCharacter(charLayer, pos, agent, tick, atLounge);

        // Activity spinner
        buildActivityIndicator(charLayer, pos, agent, tick);

        // Name labels
        buildNameLabels(charLayer, pos, agent);

        // Status bubble
        buildStatusBubble(charLayer, pos, agent, tick, atLounge);
      });

      scene.addChild(charLayer);
      app.stage.addChild(scene);
    },
    [],
  );

  useEffect(() => {
    if (!canvasRef.current) return;

    let destroyed = false;
    const app = new Application();
    const targetW = CANVAS_W * PX;
    const targetH = CANVAS_H * PX + TITLE_BAR_H;

    (async () => {
      await app.init({
        width: targetW,
        height: targetH,
        antialias: false,
        resolution: 2,
        autoDensity: true,
        backgroundColor: C.titleBg,
        roundPixels: true,
      });

      if (destroyed) {
        app.destroy(true);
        return;
      }

      appRef.current = app;

      app.canvas.style.imageRendering = "pixelated";
      app.canvas.style.width = `${targetW}px`;
      app.canvas.style.height = `${targetH}px`;

      canvasRef.current?.appendChild(app.canvas);

      // Mouse tracking for parallax
      const handleMouse = (e: MouseEvent) => {
        const rect = app.canvas.getBoundingClientRect();
        mouseRef.current = {
          x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
          y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
        };
      };
      app.canvas.addEventListener("mousemove", handleMouse);

      // Use ticker for 60fps
      app.ticker.add(() => {
        if (destroyed) return;
        tickRef.current += 1;
        // Rebuild every 2 frames for perf (~30 effective fps for scene rebuild)
        if (tickRef.current % 2 === 0) {
          buildScene(app, agents);
        }
      });

      // Initial build
      buildScene(app, agents);

      // Cleanup mouse listener on destroy
      const canvas = app.canvas;
      const cleanup = () => {
        canvas.removeEventListener("mousemove", handleMouse);
      };
      (app as any).__cleanupMouse = cleanup;
    })();

    return () => {
      destroyed = true;
      if (appRef.current) {
        (appRef.current as any).__cleanupMouse?.();
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, [agents, buildScene]);

  return (
    <div
      ref={canvasRef}
      className="rounded-xl border border-outline overflow-hidden shadow-low bg-surface inline-block"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

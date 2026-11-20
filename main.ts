// news-image-20261119 — one-day newspaper poster for Thursday 19 November 2026.
// Node 22, standard library only. The program draws the poster itself: a hand-written
// 5x7 bitmap font, vector pictograms, and a hand-built PNG encoder (node:zlib + CRC32).
// Fully deterministic: no clock, no randomness, no network, no env reads except
// MAKEFUN_OUTPUT_DIR. Run: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows of 5 cells; '#' is ink, '.' is blank.
// ---------------------------------------------------------------------------
const FONT: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#..##', '#.#.#', '##..#', '#...#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  ';': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.#...'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '#.##.', '#..##'],
  $: ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
  '(': ['...##', '..#..', '.#...', '.#...', '.#...', '..#..', '...##'],
  ')': ['##...', '..#..', '...#.', '...#.', '...#.', '..#..', '##...'],
  '&': ['.##..', '#..#.', '#..#.', '.#...', '#.#.#', '#..#.', '.##.#'],
  '+': ['.....', '..#..', '..#..', '.###.', '..#..', '..#..', '.....'],
  '=': ['.....', '.....', '.###.', '.....', '.###.', '.....', '.....'],
};
const BLANK = ['.....', '.....', '.....', '.....', '.....', '.....', '.....'];

// ---------------------------------------------------------------------------
// CRC32 (IEEE 802.3) and a minimal PNG encoder: RGB, 8-bit, no filtering.
// ---------------------------------------------------------------------------
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table.push(c >>> 0);
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(width: number, height: number, rgb: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type 2 = RGB
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter: none
    rgb.copy(raw, y * (1 + width * 3) + 1, y * width * 3, (y + 1) * width * 3);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Canvas: an RGB pixel buffer with small drawing primitives.
// ---------------------------------------------------------------------------
type RGB = [number, number, number];
const PAPER: RGB = [245, 240, 225];
const INK: RGB = [26, 26, 26];
const NAVY: RGB = [27, 42, 74];
const RED: RGB = [176, 58, 46];
const WHITE: RGB = [255, 253, 246];
const MUTED: RGB = [96, 94, 84];
const BLUE: RGB = [38, 84, 140];
const GREEN: RGB = [46, 110, 70];
const ORANGE: RGB = [200, 110, 30];
const GOLD: RGB = [168, 128, 36];
const TEAL: RGB = [30, 118, 108];
const SKY: RGB = [120, 170, 210];
const SUN: RGB = [232, 150, 40];

class Canvas {
  readonly w = 1024;
  readonly h = 1024;
  readonly px = Buffer.alloc(1024 * 1024 * 3);

  constructor() {
    for (let i = 0; i < 1024 * 1024; i++) {
      this.px[i * 3] = PAPER[0];
      this.px[i * 3 + 1] = PAPER[1];
      this.px[i * 3 + 2] = PAPER[2];
    }
  }

  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.px[i] = c[0];
    this.px[i + 1] = c[1];
    this.px[i + 2] = c[2];
  }

  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c);
  }

  hline(x0: number, x1: number, y: number, c: RGB, t = 1): void {
    for (let t0 = 0; t0 < t; t0++)
      for (let x = x0; x <= x1; x++) this.set(x, y + t0, c);
  }

  vline(x: number, y0: number, y1: number, c: RGB, t = 1): void {
    for (let t0 = 0; t0 < t; t0++)
      for (let y = y0; y <= y1; y++) this.set(x + t0, y, c);
  }

  line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1): void {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
      for (let a = 0; a < t; a++)
        for (let b = 0; b < t; b++) this.set(x + a, y + b, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  circle(cx: number, cy: number, r: number, c: RGB, t = 1): void {
    for (let a = 0; a < 360; a += 2) {
      const rad = (a * Math.PI) / 180;
      const x = Math.round(cx + r * Math.cos(rad));
      const y = Math.round(cy + r * Math.sin(rad));
      for (let i = 0; i < t; i++)
        for (let j = 0; j < t; j++) this.set(x + i, y + j, c);
    }
  }

  disc(cx: number, cy: number, r: number, c: RGB): void {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++)
        if (x * x + y * y <= r * r) this.set(cx + x, cy + y, c);
  }

  glyph(ch: string, x: number, y: number, s: number, c: RGB): void {
    const g = FONT[ch] ?? BLANK;
    for (let row = 0; row < 7; row++)
      for (let col = 0; col < 5; col++)
        if (g[row][col] === '#') this.rect(x + col * s, y + row * s, s, s, c);
  }

  text(str: string, x: number, y: number, s: number, c: RGB, tracking = 0): void {
    let cx = x;
    for (const ch of str) {
      this.glyph(ch, cx, y, s, c);
      cx += 6 * s + tracking;
    }
  }

  textWidth(str: string, s: number, tracking = 0): number {
    if (str.length === 0) return 0;
    return str.length * 6 * s + (str.length - 1) * tracking - s;
  }

  wrap(text: string, maxW: number, s: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const next = cur === '' ? w : cur + ' ' + w;
      if (this.textWidth(next, s) <= maxW) {
        cur = next;
      } else {
        if (cur !== '') lines.push(cur);
        cur = w;
      }
    }
    if (cur !== '') lines.push(cur);
    return lines;
  }
}

// ---------------------------------------------------------------------------
// Pictograms, drawn with the same primitives. Each takes a centre and a size.
// ---------------------------------------------------------------------------
function picGlobe(cv: Canvas, cx: number, cy: number, r: number): void {
  cv.circle(cx, cy, r, WHITE, 3);
  cv.circle(cx, cy, Math.round(r * 0.55), WHITE, 2);
  cv.hline(cx - r, cx + r, cy, WHITE, 2);
  cv.vline(cx, cy - r, cy + r, WHITE, 2);
  cv.disc(cx - Math.round(r * 0.4), cy - Math.round(r * 0.35), 5, [120, 200, 120]);
  cv.disc(cx + Math.round(r * 0.35), cy + Math.round(r * 0.4), 5, [120, 200, 120]);
}

function picScales(cv: Canvas, cx: number, cy: number, h: number): void {
  const top = cy - Math.round(h / 2);
  const bot = cy + Math.round(h / 2);
  const beam = Math.round(h * 0.42);
  cv.vline(cx, top, bot, NAVY, 5);
  cv.hline(cx - beam, cx + beam, top + 14, NAVY, 4);
  cv.disc(cx, top + 14, 5, NAVY);
  for (const side of [-1, 1]) {
    const px = cx + side * beam;
    cv.line(px, top + 16, px - 16, top + 52, NAVY, 2);
    cv.line(px, top + 16, px + 16, top + 52, NAVY, 2);
    cv.hline(px - 18, px + 18, top + 52, NAVY, 3);
    cv.rect(px - 18, top + 52, 36, 10, NAVY);
  }
  cv.hline(cx - 34, cx + 34, bot, NAVY, 5);
}

function picFlags(cv: Canvas, cx: number, cy: number, w: number, h: number): void {
  const fw = Math.round(w / 3) - 4;
  const fh = h;
  const x0 = cx - Math.round(w / 2);
  // US: red-white stripes with a blue corner
  const ux = x0;
  for (let i = 0; i < 7; i++)
    cv.rect(ux, cy - Math.round(fh / 2) + Math.round((i * fh) / 7), fw, Math.ceil(fh / 7), i % 2 === 0 ? RED : WHITE);
  cv.rect(ux, cy - Math.round(fh / 2), Math.round(fw * 0.45), Math.round(fh * 0.5), BLUE);
  // China: red field, yellow stars
  const kx = x0 + fw + 4;
  cv.rect(kx, cy - Math.round(fh / 2), fw, fh, RED);
  cv.disc(kx + 8, cy - Math.round(fh / 2) + 9, 3, [240, 210, 60]);
  cv.disc(kx + 15, cy - Math.round(fh / 2) + 6, 2, [240, 210, 60]);
  cv.disc(kx + 17, cy - Math.round(fh / 2) + 12, 2, [240, 210, 60]);
  // Russia: white-blue-red tricolour
  const rx = x0 + 2 * (fw + 4);
  cv.rect(rx, cy - Math.round(fh / 2), fw, Math.round(fh / 3), WHITE);
  cv.rect(rx, cy - Math.round(fh / 2) + Math.round(fh / 3), fw, Math.round(fh / 3), BLUE);
  cv.rect(rx, cy - Math.round(fh / 2) + Math.round((2 * fh) / 3), fw, Math.round(fh / 3), RED);
}

function picSunset(cv: Canvas, cx: number, cy: number, s: number): void {
  cv.disc(cx, cy - 16, 16, SUN);
  cv.rect(cx - 34, cy + 6, 68, 4, INK);
  const heights = [18, 26, 12, 22, 16];
  let bx = cx - 34;
  for (const hh of heights) {
    cv.rect(bx, cy + 10 - hh, 12, hh + 8, INK);
    bx += 14;
  }
  cv.hline(cx - 34, cx + 34, cy + 22, INK, 3);
}

function picChart(cv: Canvas, cx: number, cy: number, w: number, h: number): void {
  const x0 = cx - Math.round(w / 2);
  const y0 = cy + Math.round(h / 2);
  cv.hline(x0, x0 + w, y0, INK, 2);
  cv.vline(x0, cy - Math.round(h / 2), y0, INK, 2);
  const pts: [number, number][] = [
    [0, 4],
    [14, 10],
    [26, 8],
    [40, 18],
    [54, 16],
    [68, 28],
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const col = by > ay ? GREEN : RED;
    cv.line(x0 + 4 + ax, y0 - 6 - ay, x0 + 4 + bx, y0 - 6 - by, col, 3);
  }
  const ex = x0 + 4 + 68;
  const ey = y0 - 6 - 28;
  cv.line(ex, ey, ex - 8, ey + 2, GREEN, 3);
  cv.line(ex, ey, ex - 2, ey + 8, GREEN, 3);
}

function picTower(cv: Canvas, cx: number, cy: number, w: number, h: number): void {
  const x0 = cx - Math.round(w / 2);
  const y0 = cy - Math.round(h / 2);
  cv.rect(x0, y0, w, h, NAVY);
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 3; c++)
      cv.rect(x0 + 5 + c * 9, y0 + 6 + r * 10, 5, 5, [240, 210, 90]);
  // impact burst near the top
  cv.line(cx + 2, y0 + 14, cx + 14, y0 + 4, RED, 2);
  cv.line(cx + 2, y0 + 14, cx + 16, y0 + 14, RED, 2);
  cv.line(cx + 2, y0 + 14, cx + 13, y0 + 24, RED, 2);
  cv.disc(cx + 2, y0 + 14, 4, RED);
  cv.hline(x0 - 6, x0 + w + 6, y0 + h, INK, 3);
}

function picBridge(cv: Canvas, cx: number, cy: number, w: number, h: number): void {
  const x0 = cx - Math.round(w / 2);
  const y0 = cy - Math.round(h / 2);
  // arch
  for (let a = 180; a <= 360; a += 3) {
    const rad = (a * Math.PI) / 180;
    const x = Math.round(cx + (w / 2) * Math.cos(rad));
    const y = Math.round(cy + 6 + (h / 2 - 8) * Math.sin(rad));
    cv.set(x, y, BLUE);
    cv.set(x, y + 1, BLUE);
  }
  cv.hline(x0, x0 + w, cy + 6, BLUE, 4);
  for (const fx of [-0.32, 0, 0.32]) {
    const px = Math.round(cx + fx * w);
    cv.vline(px, cy - 8, cy + 6, BLUE, 3);
  }
  cv.hline(x0, x0 + w, cy + 18, SKY, 2);
  cv.hline(x0 + 8, x0 + w - 8, cy + 24, SKY, 2);
  void y0;
}

function picTank(cv: Canvas, cx: number, cy: number, w: number, h: number): void {
  const x0 = cx - Math.round(w / 2);
  const y0 = cy - Math.round(h / 2);
  cv.rect(x0, y0 + 18, w, 16, GREEN);
  cv.rect(x0 + 12, y0 + 6, 26, 12, GREEN);
  cv.line(x0 + 38, y0 + 10, x0 + w, y0 + 4, INK, 3);
  for (let i = 0; i < 4; i++) cv.disc(x0 + 8 + i * 16, y0 + 38, 5, INK);
  cv.hline(x0 - 6, x0 + w + 6, y0 + 46, INK, 3);
}

// ---------------------------------------------------------------------------
// The day's stories. All facts verified from at least two reputable sources
// on 19 November 2026: Le Monde, Reuters, WSJ, CNN, USA Today, Fox News.
// ---------------------------------------------------------------------------
type Story = {
  kicker: string;
  color: RGB;
  lines: string[];
  summary: string;
  pic: string;
};

const HERO: Story = {
  kicker: 'THE HAGUE - WORLD COURT',
  color: RED,
  lines: ['WORLD COURT RULES', 'MYANMAR GUILTY OF', 'GENOCIDE'],
  summary:
    'FIRST TIME A STATE IS HELD RESPONSIBLE FOR GENOCIDE. THE 9-6 RULING COVERS THE 2017 CAMPAIGN AGAINST THE ROHINGYA; REPARATIONS ORDERED.',
  pic: 'scales',
};

const GRID: Story[] = [
  {
    kicker: 'SHENZHEN - GREAT POWERS',
    color: RED,
    lines: ['TRUMP, XI AND', 'PUTIN IN SHENZHEN'],
    summary:
      'FIRST THREE-WAY SUMMIT AGREES A FOUR-POINT PEACE PLAN. NO WORD ON UKRAINE OR IRAN.',
    pic: 'flags',
  },
  {
    kicker: 'ENTERTAINMENT - GAMES',
    color: ORANGE,
    lines: ['GTA 6 LAUNCHES', 'WORLDWIDE'],
    summary:
      'THE GAME UNLOCKS AT MIDNIGHT ON PS5 AND XBOX. CRITICS GIVE IT 99 ON METACRITIC.',
    pic: 'sunset',
  },
  {
    kicker: 'NEW YORK - MARKETS',
    color: BLUE,
    lines: ['ANTHROPIC IPO', 'SETS A RECORD'],
    summary:
      '$83 A SHARE RAISES $81.3BN, THE BIGGEST IPO EVER. SHARES CLOSE UP 17%.',
    pic: 'chart',
  },
  {
    kicker: 'RIYADH - MIDDLE EAST',
    color: GOLD,
    lines: ['MISSILE HITS', 'RIYADH TOWER'],
    summary:
      'HOUTHI STRIKE HITS 80-STOREY PIF TOWER; WINDOWS OUT ON 7-8 FLOORS. NO INJURIES.',
    pic: 'tower',
  },
  {
    kicker: 'KYIV - WAR IN UKRAINE',
    color: GREEN,
    lines: ['CRIMEA BRIDGE', 'HIT A THIRD TIME'],
    summary:
      'NEPTUNE MISSILES STRIKE THE RAIL SPAN; TRAINS HALT HOURS BEFORE THE SHENZHEN SUMMIT.',
    pic: 'bridge',
  },
  {
    kicker: 'GAZA - CEASEFIRE',
    color: TEAL,
    lines: ['ISRAEL ENDS', 'GAZA TANK RAID'],
    summary:
      'FIRST RAID PAST THE YELLOW LINE SINCE THE TRUCE ENDS. FAMILIES RETURN TO NUSEIRAT.',
    pic: 'tank',
  },
];

function drawPic(cv: Canvas, name: string, cx: number, cy: number): void {
  if (name === 'scales') picScales(cv, cx, cy, 170);
  else if (name === 'flags') picFlags(cv, cx, cy, 72, 44);
  else if (name === 'sunset') picSunset(cv, cx, cy, 1);
  else if (name === 'chart') picChart(cv, cx, cy, 72, 48);
  else if (name === 'tower') picTower(cv, cx, cy, 26, 62);
  else if (name === 'bridge') picBridge(cv, cx, cy, 72, 44);
  else if (name === 'tank') picTank(cv, cx, cy, 72, 48);
}

// ---------------------------------------------------------------------------
// Layout: a newspaper front page, 1024 x 1024.
// ---------------------------------------------------------------------------
function drawPoster(cv: Canvas): void {
  // Masthead band
  cv.rect(0, 0, 1024, 150, NAVY);
  cv.text('THE WORLD IN ONE DAY', 24, 26, 2, WHITE, 3);
  cv.text('THURSDAY 19 NOVEMBER 2026', 24, 58, 5, WHITE);
  picGlobe(cv, 925, 76, 42);
  cv.rect(0, 150, 1024, 4, RED);

  // Dateline strip
  cv.text('THE DAY IN SEVEN STORIES', 24, 168, 2, INK);
  const right = 'AS REPORTED ON 19 NOVEMBER 2026';
  cv.text(right, 1000 - cv.textWidth(right, 2), 168, 2, INK);

  // Hero block
  cv.rect(24, 204, 976, 248, WHITE);
  cv.rect(24, 204, 976, 4, NAVY);
  cv.rect(24, 204, 8, 248, RED);
  cv.text(HERO.kicker, 44, 220, 2, RED);
  let hy = 242;
  for (const line of HERO.lines) {
    cv.text(line, 44, hy, 6, INK);
    hy += 50;
  }
  const heroLines = cv.wrap(HERO.summary, 664, 2);
  let sy = 396;
  for (const line of heroLines) {
    cv.text(line, 44, sy, 2, INK);
    sy += 18;
  }
  drawPic(cv, HERO.pic, 850, 330);

  // Grid: 2 columns x 3 rows
  const colX = [24, 520];
  const rowY = [468, 637, 806];
  GRID.forEach((story, i) => {
    const x = colX[i % 2];
    const y = rowY[Math.floor(i / 2)];
    cv.rect(x, y, 480, 157, WHITE);
    cv.rect(x, y, 480, 3, story.color);
    cv.rect(x, y, 480, 1, MUTED);
    cv.rect(x, y + 156, 480, 1, MUTED);
    cv.rect(x, y, 1, 157, MUTED);
    cv.rect(x + 479, y, 1, 157, MUTED);
    cv.text(story.kicker, x + 16, y + 10, 2, story.color);
    let ly = y + 32;
    for (const line of story.lines) {
      cv.text(line, x + 16, ly, 4, INK);
      ly += 30;
    }
    const sumLines = cv.wrap(story.summary, 356, 2);
    let syy = y + 98;
    for (const line of sumLines.slice(0, 3)) {
      cv.text(line, x + 16, syy, 2, INK);
      syy += 17;
    }
    drawPic(cv, story.pic, x + 426, y + 116);
  });

  // Footer
  cv.hline(24, 1000, 972, NAVY, 2);
  const foot = 'SOURCES: LE MONDE, REUTERS, WSJ, CNN, USA TODAY, FOX NEWS';
  cv.text(foot, Math.round((1024 - cv.textWidth(foot, 2)) / 2), 984, 2, MUTED);
}

// ---------------------------------------------------------------------------
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
const cv = new Canvas();
drawPoster(cv);
const png = encodePNG(1024, 1024, cv.px);
const outPath = join(outDir, 'entry.png');
writeFileSync(outPath, png);
console.log(`wrote ${outPath} (${png.length} bytes, 1024x1024)`);

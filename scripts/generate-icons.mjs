import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');
const imagesDir = path.resolve(publicDir, 'images');

// Precompute CRC32 table for valid PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodeRgbaToPng(width, height, rgba) {
  const rawScanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    rawScanlines[rowStart] = 0; // Filter type 0 (None)
    rgba.copy(rawScanlines, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idatData = zlib.deflateSync(rawScanlines, { level: 9 });
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    signature,
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', idatData),
    makePngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function sdistRoundedRect(nx, ny, cx, cy, hw, hh, r) {
  const dx = Math.max(Math.abs(nx - cx) - hw + r, 0);
  const dy = Math.max(Math.abs(ny - cy) - hh + r, 0);
  return Math.hypot(dx, dy) - r;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

/**
 * Renders the Official Habitra Purple-to-Orange H-Leaf Icon at (size x size)
 */
function renderHabitraIconRgba(size) {
  const rgba = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = ((x + 0.5) / size) * 512;
      const v = ((y + 0.5) / size) * 512;
      const idx = (y * size + x) * 4;

      // Squircle container (rx=116)
      const bgDist = sdistRoundedRect(u, v, 256, 256, 224, 224, 116);
      if (bgDist > 1.2) {
        rgba[idx] = 0;
        rgba[idx + 1] = 0;
        rgba[idx + 2] = 0;
        rgba[idx + 3] = 0;
        continue;
      }

      // Purple to Orange gradient (bottom-left to top-right)
      // bottom-left: #4f46e5 (79, 70, 229) -> middle: #7c3aed (124, 58, 237) -> top-right: #f97316 (249, 115, 22)
      const t = Math.min(1, Math.max(0, (u - 64 + (512 - v) - 64) / 768));
      let r, g, b;
      if (t < 0.45) {
        const f = t / 0.45;
        r = Math.round(79 * (1 - f) + 124 * f);
        g = Math.round(70 * (1 - f) + 58 * f);
        b = Math.round(229 * (1 - f) + 237 * f);
      } else {
        const f = (t - 0.45) / 0.55;
        r = Math.round(124 * (1 - f) + 249 * f);
        g = Math.round(58 * (1 - f) + 115 * f);
        b = Math.round(237 * (1 - f) + 22 * f);
      }

      let a = bgDist > 0 ? Math.round(255 * (1 - bgDist / 1.2)) : 255;

      // Subtle inner rim lighting
      const innerRim = Math.abs(sdistRoundedRect(u, v, 256, 256, 220, 220, 112));
      if (innerRim <= 3.5) {
        r = Math.min(255, Math.round(r * 0.7 + 255 * 0.3));
        g = Math.min(255, Math.round(g * 0.7 + 255 * 0.3));
        b = Math.min(255, Math.round(b * 0.7 + 255 * 0.3));
      }

      // Symbol Mark: Stylized H with organic leaf
      // 1. Left loop capsule: x around 188, y from 180 to 330, width=80
      const leftLoopDist = Math.abs(sdistRoundedRect(u, v, 188, 256, 46, 94, 46));
      if (leftLoopDist <= 16) {
        const blend = (16 - leftLoopDist) / 16;
        r = Math.round(r * (1 - blend * 0.9) + 255 * blend * 0.9);
        g = Math.round(g * (1 - blend * 0.9) + 255 * blend * 0.9);
        b = Math.round(b * (1 - blend * 0.9) + 255 * blend * 0.9);
      }

      // 2. Right vertical stem: x around 324, y from 220 to 350
      const rightStemDist = Math.abs(sdistRoundedRect(u, v, 324, 285, 46, 65, 46));
      if (rightStemDist <= 16 && (u >= 278 || v >= 285)) {
        const blend = (16 - rightStemDist) / 16;
        r = Math.round(r * (1 - blend * 0.95) + 255 * blend * 0.95);
        g = Math.round(g * (1 - blend * 0.95) + 245 * blend * 0.95);
        b = Math.round(b * (1 - blend * 0.95) + 230 * blend * 0.95);
      }

      // 3. Swooping diagonal ribbon from bottom-left to top-right
      const ribbonDist = distToSegment(u, v, 150, 310, 335, 170);
      if (ribbonDist <= 15) {
        const blend = (15 - ribbonDist) / 15;
        r = Math.round(r * (1 - blend * 0.95) + 255 * blend * 0.95);
        g = Math.round(g * (1 - blend * 0.95) + 245 * blend * 0.95);
        b = Math.round(b * (1 - blend * 0.95) + 230 * blend * 0.95);
      }

      // 4. Leaf at top right (around 350, 175)
      const lx = (u - 355) * 0.707 - (v - 175) * 0.707;
      const ly = (u - 355) * 0.707 + (v - 175) * 0.707;
      if ((lx * lx) / (52 * 52) + (ly * ly) / (28 * 28) <= 1.0 && u >= 300) {
        r = 254;
        g = 186;
        b = 116;
      }

      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = a;
    }
  }

  return encodeRgbaToPng(size, size, rgba);
}

/**
 * Renders the Full Horizontal Habitra Brand Card (760 x 380)
 * with Dark Navy background, Purple-to-Orange Icon, and typography
 */
function renderHabitraFullCardRgba(width, height) {
  const rgba = Buffer.alloc(width * height * 4);
  const iconSize = 210;
  const iconX = 75;
  const iconY = 85;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Dark navy container background (#0b0f19)
      let r = 11;
      let g = 15;
      let b = 25;
      let a = 255;

      // Icon region
      if (
        x >= iconX &&
        x < iconX + iconSize &&
        y >= iconY &&
        y < iconY + iconSize
      ) {
        const u = ((x - iconX + 0.5) / iconSize) * 512;
        const v = ((y - iconY + 0.5) / iconSize) * 512;

        const bgDist = sdistRoundedRect(u, v, 256, 256, 224, 224, 116);
        if (bgDist <= 1.2) {
          const t = Math.min(1, Math.max(0, (u - 64 + (512 - v) - 64) / 768));
          if (t < 0.45) {
            const f = t / 0.45;
            r = Math.round(79 * (1 - f) + 124 * f);
            g = Math.round(70 * (1 - f) + 58 * f);
            b = Math.round(229 * (1 - f) + 237 * f);
          } else {
            const f = (t - 0.45) / 0.55;
            r = Math.round(124 * (1 - f) + 249 * f);
            g = Math.round(58 * (1 - f) + 115 * f);
            b = Math.round(237 * (1 - f) + 22 * f);
          }

          // Left loop
          const leftLoopDist = Math.abs(sdistRoundedRect(u, v, 188, 256, 46, 94, 46));
          if (leftLoopDist <= 16) {
            const blend = (16 - leftLoopDist) / 16;
            r = Math.round(r * (1 - blend) + 255 * blend);
            g = Math.round(g * (1 - blend) + 255 * blend);
            b = Math.round(b * (1 - blend) + 255 * blend);
          }

          // Right stem
          const rightStemDist = Math.abs(sdistRoundedRect(u, v, 324, 285, 46, 65, 46));
          if (rightStemDist <= 16 && (u >= 278 || v >= 285)) {
            const blend = (16 - rightStemDist) / 16;
            r = Math.round(r * (1 - blend) + 255 * blend);
            g = Math.round(g * (1 - blend) + 245 * blend);
            b = Math.round(b * (1 - blend) + 230 * blend);
          }

          // Diagonal ribbon
          const ribbonDist = distToSegment(u, v, 150, 310, 335, 170);
          if (ribbonDist <= 15) {
            const blend = (15 - ribbonDist) / 15;
            r = Math.round(r * (1 - blend) + 255 * blend);
            g = Math.round(g * (1 - blend) + 245 * blend);
            b = Math.round(b * (1 - blend) + 230 * blend);
          }

          // Leaf
          const lx = (u - 355) * 0.707 - (v - 175) * 0.707;
          const ly = (u - 355) * 0.707 + (v - 175) * 0.707;
          if ((lx * lx) / (52 * 52) + (ly * ly) / (28 * 28) <= 1.0 && u >= 300) {
            r = 254;
            g = 186;
            b = 116;
          }
        }
      }

      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = a;
    }
  }

  return encodeRgbaToPng(width, height, rgba);
}

function buildIcoFromPngs(entries) {
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // ICO type = 1
  header.writeUInt16LE(count, 4); // Number of images

  const dirEntries = [];
  let offset = 6 + count * 16;

  for (const { size, png } of entries) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // Width (0 means 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // Height (0 means 256)
    entry.writeUInt8(0, 2); // Color palette count
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(png.length, 8); // Size of PNG data
    entry.writeUInt32LE(offset, 12); // Offset of PNG data
    dirEntries.push(entry);
    offset += png.length;
  }

  return Buffer.concat([header, ...dirEntries, ...entries.map((e) => e.png)]);
}

// Generate all standard icon sizes
const png512 = renderHabitraIconRgba(512);
const png256 = renderHabitraIconRgba(256);
const png180 = renderHabitraIconRgba(180);
const png64 = renderHabitraIconRgba(64);
const png48 = renderHabitraIconRgba(48);
const png32 = renderHabitraIconRgba(32);
const png16 = renderHabitraIconRgba(16);

// Build Windows multi-resolution .ico
const icoBuffer = buildIcoFromPngs([
  { size: 256, png: png256 },
  { size: 64, png: png64 },
  { size: 48, png: png48 },
  { size: 32, png: png32 },
  { size: 16, png: png16 },
]);

// Full logo banner card (760 x 380)
const fullCardPng = renderHabitraFullCardRgba(760, 380);

fs.mkdirSync(imagesDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, 'icon.png'), png512);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png180);
fs.writeFileSync(path.join(publicDir, 'tray-icon.png'), png32);
fs.writeFileSync(path.join(publicDir, 'icon.ico'), icoBuffer);
fs.writeFileSync(path.join(imagesDir, 'habitra-logo.png'), fullCardPng);
fs.writeFileSync(path.join(publicDir, 'habitra-logo.png'), fullCardPng);

console.log(
  `Generated official Habitra icons and logo in ${publicDir}:\n` +
    ` - icon.ico (${icoBuffer.length} bytes)\n` +
    ` - icon.png (${png512.length} bytes)\n` +
    ` - apple-touch-icon.png (${png180.length} bytes)\n` +
    ` - tray-icon.png (${png32.length} bytes)\n` +
    ` - images/habitra-logo.png (${fullCardPng.length} bytes)\n` +
    ` - habitra-logo.png (${fullCardPng.length} bytes)`
);

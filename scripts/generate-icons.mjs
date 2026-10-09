import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');

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

/**
 * Renders the Habitra Pixel-Art Sprout & Sanctuary Window Icon at (size x size)
 * Using normalized 0..512 coordinate space matching public/icon.svg
 */
function renderHabitraIconRgba(size) {
  const rgba = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Normalized 0..512 coordinates
      const u = ((x + 0.5) / size) * 512;
      const v = ((y + 0.5) / size) * 512;
      const idx = (y * size + x) * 4;

      // 1. Rounded square background (0..512, rx=112)
      const bgDist = sdistRoundedRect(u, v, 256, 256, 256, 256, 112);
      if (bgDist > 1.2) {
        rgba[idx] = 0;
        rgba[idx + 1] = 0;
        rgba[idx + 2] = 0;
        rgba[idx + 3] = 0;
        continue;
      }

      // Diagonal indigo/midnight gradient
      const t = Math.min(1, Math.max(0, (u + v) / 1024));
      let r = Math.round(15 * (1 - t) + 49 * t);
      let g = Math.round(23 * (1 - t) + 46 * t);
      let b = Math.round(42 * (1 - t) + 129 * t);
      let a = bgDist > 0 ? Math.round(255 * (1 - bgDist / 1.2)) : 255;

      // 2. Inner frame border (x=36..476, rx=88)
      const innerDist = Math.abs(sdistRoundedRect(u, v, 256, 256, 220, 220, 88));
      if (innerDist <= 4.5) {
        r = Math.round(r * 0.65 + 99 * 0.35);
        g = Math.round(g * 0.65 + 102 * 0.35);
        b = Math.round(b * 0.65 + 241 * 0.35);
      }

      // 3. Warm golden sun/lantern moon at (380, 132), r=24
      const sunDist = Math.hypot(u - 380, v - 132);
      if (sunDist <= 25) {
        r = 253;
        g = 224;
        b = 71;
      } else if (sunDist <= 42) {
        const glow = (42 - sunDist) / 17;
        r = Math.min(255, Math.round(r + 80 * glow));
        g = Math.min(255, Math.round(g + 65 * glow));
        b = Math.min(255, Math.round(b + 20 * glow));
      }

      // 4. Plant stem: rect x=244..268, y=216..324
      if (sdistRoundedRect(u, v, 256, 270, 12, 54, 6) <= 0) {
        r = 16;
        g = 185;
        b = 129;
      }

      // 5. Left emerald leaf: ellipse tilted around (214, 190)
      const lx = (u - 214) * 0.85 + (v - 190) * 0.52;
      const ly = -(u - 214) * 0.52 + (v - 190) * 0.85;
      if ((lx * lx) / (44 * 44) + (ly * ly) / (24 * 24) <= 1.0) {
        r = 52;
        g = 211;
        b = 153;
      }

      // 6. Right mint leaf: ellipse tilted around (298, 212)
      const rx = (u - 298) * 0.85 - (v - 212) * 0.52;
      const ry = (u - 298) * 0.52 + (v - 212) * 0.85;
      if ((rx * rx) / (44 * 44) + (ry * ry) / (24 * 24) <= 1.0) {
        r = 110;
        g = 231;
        b = 183;
      }

      // 7. Terracotta planter rim: rect x=136..376, y=320..348
      if (sdistRoundedRect(u, v, 256, 334, 120, 14, 8) <= 0) {
        r = 245;
        g = 158;
        b = 11;
      }

      // 8. Terracotta planter base: rect x=176..336, y=348..416
      if (sdistRoundedRect(u, v, 256, 382, 80, 34, 10) <= 0) {
        r = 217;
        g = 119;
        b = 6;
      }

      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = a;
    }
  }

  return encodeRgbaToPng(size, size, rgba);
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

const png512 = renderHabitraIconRgba(512);
const png256 = renderHabitraIconRgba(256);
const png180 = renderHabitraIconRgba(180);
const png64 = renderHabitraIconRgba(64);
const png48 = renderHabitraIconRgba(48);
const png32 = renderHabitraIconRgba(32);
const png16 = renderHabitraIconRgba(16);

const icoBuffer = buildIcoFromPngs([
  { size: 256, png: png256 },
  { size: 64, png: png64 },
  { size: 48, png: png48 },
  { size: 32, png: png32 },
  { size: 16, png: png16 },
]);

fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, 'icon.png'), png512);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png180);
fs.writeFileSync(path.join(publicDir, 'tray-icon.png'), png32);
fs.writeFileSync(path.join(publicDir, 'icon.ico'), icoBuffer);

console.log(
  `Generated icons in ${publicDir}:\n` +
    ` - icon.ico (${icoBuffer.length} bytes)\n` +
    ` - icon.png (${png512.length} bytes)\n` +
    ` - apple-touch-icon.png (${png180.length} bytes)\n` +
    ` - tray-icon.png (${png32.length} bytes)`
);

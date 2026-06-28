#!/usr/bin/env node
/**
 * generate-assets.mjs — write the synthetic validation image binaries.
 *
 * Hand-rolls minimal solid-colour PNGs (zlib + manual chunk/CRC) so the repo
 * carries tiny, deterministic source media with no image-tooling dependency.
 * Solid colour compresses to a few KB even at 2560px. Distinct colour + aspect
 * per file so the art-direction <picture> switch is observable.
 *
 *   node .scripts/seed/generate-assets.mjs
 *
 * Outputs to .scripts/seed/assets/ — uploaded to the store by seed-validation-assets.mjs.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function png(width, height, [r, g, b]) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour (RGB)
  // bytes 10-12 default 0: compression / filter / interlace
  const row = Buffer.alloc(1 + width * 3); // leading filter byte (0) + RGB triples
  for (let x = 0; x < width; x++) {
    row[1 + x * 3] = r;
    row[1 + x * 3 + 1] = g;
    row[1 + x * 3 + 2] = b;
  }
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync('.scripts/seed/assets', { recursive: true });
// landscape (desktop, full srcset ladder to 2560) — teal
writeFileSync('.scripts/seed/assets/landscape.png', png(2560, 1440, [13, 110, 128]));
// portrait (mobile art-direction, mobile ladder to 1440) — coral
writeFileSync('.scripts/seed/assets/portrait.png', png(1440, 2560, [200, 70, 50]));
console.log('generated .scripts/seed/assets/{landscape,portrait}.png');

// Generates the PWA app icons as PNGs with no external dependencies.
// Draws a calendar glyph on an indigo gradient, full-bleed so the icon is
// "maskable" (Android can crop it to any shape without showing empty corners).
// Run: node scripts/gen-icons.mjs

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', 'public')
mkdirSync(OUT, { recursive: true })

// ---- CRC32 (for PNG chunks) ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  // raw: each row prefixed with filter byte 0
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// ---- tiny drawing helpers on an RGBA buffer ----
function canvas(S) {
  return { S, buf: Buffer.alloc(S * S * 4) }
}
function setPx(c, x, y, [r, g, b, a = 255]) {
  if (x < 0 || y < 0 || x >= c.S || y >= c.S) return
  const i = (y * c.S + x) * 4
  // simple alpha-over composite
  const ia = a / 255
  c.buf[i] = r * ia + c.buf[i] * (1 - ia)
  c.buf[i + 1] = g * ia + c.buf[i + 1] * (1 - ia)
  c.buf[i + 2] = b * ia + c.buf[i + 2] * (1 - ia)
  c.buf[i + 3] = Math.max(c.buf[i + 3], a)
}
function lerp(a, b, t) { return a + (b - a) * t }
function gradientBg(c, top, bottom) {
  for (let y = 0; y < c.S; y++) {
    const t = y / (c.S - 1)
    const col = [Math.round(lerp(top[0], bottom[0], t)), Math.round(lerp(top[1], bottom[1], t)), Math.round(lerp(top[2], bottom[2], t)), 255]
    for (let x = 0; x < c.S; x++) setPx(c, x, y, col)
  }
}
function roundRect(c, x, y, w, h, r, color) {
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      // rounded-corner mask
      const dx = Math.min(xx, w - 1 - xx)
      const dy = Math.min(yy, h - 1 - yy)
      if (dx < r && dy < r) {
        const ddx = r - dx, ddy = r - dy
        if (ddx * ddx + ddy * ddy > r * r) continue
      }
      setPx(c, x + xx, y + yy, color)
    }
  }
}
function disc(c, cx, cy, rad, color) {
  for (let yy = -rad; yy <= rad; yy++) {
    for (let xx = -rad; xx <= rad; xx++) {
      if (xx * xx + yy * yy <= rad * rad) setPx(c, cx + xx, cy + yy, color)
    }
  }
}

function drawIcon(S) {
  const c = canvas(S)
  gradientBg(c, [99, 102, 241], [79, 70, 229]) // indigo -> deeper indigo
  const white = [255, 255, 255, 255]
  const ink = [79, 70, 229, 255]

  // calendar body (centered, within maskable safe zone)
  const w = Math.round(S * 0.52)
  const h = Math.round(S * 0.46)
  const x = Math.round((S - w) / 2)
  const y = Math.round(S * 0.30)
  const r = Math.round(S * 0.06)
  roundRect(c, x, y, w, h, r, white)

  // top header band of the calendar
  const band = Math.round(h * 0.26)
  roundRect(c, x, y, w, band, r, ink)
  // square off the band's bottom corners so it reads as a header strip
  roundRect(c, x, y + Math.round(band * 0.5), w, Math.round(band * 0.5), 0, ink)

  // two binding tabs above the body
  const tabW = Math.round(S * 0.05)
  const tabH = Math.round(S * 0.09)
  const tabY = Math.round(y - tabH * 0.55)
  roundRect(c, Math.round(x + w * 0.28 - tabW / 2), tabY, tabW, tabH, Math.round(tabW / 2), white)
  roundRect(c, Math.round(x + w * 0.72 - tabW / 2), tabY, tabW, tabH, Math.round(tabW / 2), white)

  // accent dot (the "important date") inside the body
  disc(c, Math.round(S / 2), Math.round(y + band + (h - band) * 0.52), Math.round(S * 0.075), ink)

  return encodePNG(S, S, c.buf)
}

for (const size of [192, 512]) {
  writeFileSync(resolve(OUT, `icon-${size}.png`), drawIcon(size))
}
writeFileSync(resolve(OUT, 'apple-touch-icon.png'), drawIcon(180))
console.log('Generated icon-192.png, icon-512.png, apple-touch-icon.png in public/')

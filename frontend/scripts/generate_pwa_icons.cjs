const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

function createPWAIcon(size, isMaskable = false) {
  const png = new PNG({ width: size, height: size });
  const cornerRadius = isMaskable ? 0 : Math.round(size * 0.22);
  const cornerRadiusSq = cornerRadius * cornerRadius;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;

      // Check corner rounding if not maskable
      let isInside = true;
      if (!isMaskable) {
        let dx = 0;
        let dy = 0;
        if (x < cornerRadius) dx = cornerRadius - x;
        else if (x >= size - cornerRadius) dx = x - (size - cornerRadius);

        if (y < cornerRadius) dy = cornerRadius - y;
        else if (y >= size - cornerRadius) dy = y - (size - cornerRadius);

        if (dx > 0 && dy > 0 && (dx * dx + dy * dy > cornerRadiusSq)) {
          isInside = false;
        }
      }

      if (!isInside) {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0;
        continue;
      }

      // Background Gradient: #1e3a8a (30, 58, 138) to #2563eb (37, 99, 235) to #0284c7 (2, 132, 199)
      const t = (x + y) / (size * 2);
      let r = Math.round(30 * (1 - t) + 2 * t);
      let g = Math.round(58 * (1 - t) + 132 * t);
      let b = Math.round(138 * (1 - t) + 225 * t);

      // Top gloss highlight
      if (y < size * 0.4) {
        const glossFactor = (1 - (y / (size * 0.4))) * 0.25;
        r = Math.min(255, Math.round(r + 255 * glossFactor));
        g = Math.min(255, Math.round(g + 255 * glossFactor));
        b = Math.min(255, Math.round(b + 255 * glossFactor));
      }

      // Bottom orange accent line around y = 0.85
      const lineY = Math.round(size * 0.86 + Math.sin(x / size * Math.PI) * (size * 0.04));
      if (Math.abs(y - lineY) <= Math.max(2, Math.round(size * 0.015))) {
        r = 249; g = 115; b = 22; // #f97316 GS25 orange
      }

      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = 255;
    }
  }

  // Draw simple text / glyphs: "DNT" pill at top, "GS25" in center
  drawBadge(png, size);

  return png;
}

// Draw crisp badge & typography
function drawBadge(png, size) {
  const scale = size / 512;

  // 1. Top Pill for "DNT": x: 256 +/- 80, y: 120 +/- 28
  const pillW = Math.round(160 * scale);
  const pillH = Math.round(56 * scale);
  const pillX = Math.round((size - pillW) / 2);
  const pillY = Math.round(90 * scale);
  fillRoundRect(png, size, pillX, pillY, pillW, pillH, pillH / 2, 255, 255, 255);

  // Draw D N T letters inside the pill
  drawTextDNT(png, size, pillX + pillW / 2, pillY + pillH / 2, scale * 0.8);

  // 2. Center Text "GS25":
  drawTextGS25(png, size, Math.round(size / 2), Math.round(270 * scale), scale * 2.5);

  // 3. Bottom Pill "SCHEDULE":
  const subW = Math.round(260 * scale);
  const subH = Math.round(38 * scale);
  const subX = Math.round((size - subW) / 2);
  const subY = Math.round(380 * scale);
  fillRoundRect(png, size, subX, subY, subW, subH, subH / 2, 15, 23, 42, 180);
}

function fillRoundRect(png, size, x0, y0, w, h, r, red, green, blue, alpha = 255) {
  const rSq = r * r;
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (x < 0 || x >= size || y < 0 || y >= size) continue;
      let dx = 0; let dy = 0;
      if (x < x0 + r) dx = x0 + r - x;
      else if (x >= x0 + w - r) dx = x - (x0 + w - r);
      if (y < y0 + r) dy = y0 + r - y;
      else if (y >= y0 + h - r) dy = y - (y0 + h - r);

      if (dx > 0 && dy > 0 && dx * dx + dy * dy > rSq) continue;

      const idx = (size * y + x) << 2;
      const a = alpha / 255;
      png.data[idx] = Math.round(red * a + png.data[idx] * (1 - a));
      png.data[idx + 1] = Math.round(green * a + png.data[idx + 1] * (1 - a));
      png.data[idx + 2] = Math.round(blue * a + png.data[idx + 2] * (1 - a));
      png.data[idx + 3] = 255;
    }
  }
}

// 5x7 matrix font for D, N, T
const FONT_5X7 = {
  'D': [
    [1,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,0]
  ],
  'N': [
    [1,0,0,0,1],
    [1,1,0,0,1],
    [1,0,1,0,1],
    [1,0,0,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1]
  ],
  'T': [
    [1,1,1,1,1],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0]
  ],
  'G': [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,0],
    [1,0,1,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0]
  ],
  'S': [
    [0,1,1,1,1],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [0,1,1,1,0],
    [0,0,0,0,1],
    [0,0,0,0,1],
    [1,1,1,1,0]
  ],
  '2': [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [0,0,0,0,1],
    [0,0,1,1,0],
    [0,1,0,0,0],
    [1,0,0,0,0],
    [1,1,1,1,1]
  ],
  '5': [
    [1,1,1,1,1],
    [1,0,0,0,0],
    [1,1,1,1,0],
    [0,0,0,0,1],
    [0,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0]
  ]
};

function renderBitmapText(png, size, text, centerX, centerY, scale, r, g, b) {
  const charW = 5 * scale;
  const charH = 7 * scale;
  const spacing = 2 * scale;
  const totalW = text.length * charW + (text.length - 1) * spacing;
  const startX = Math.round(centerX - totalW / 2);
  const startY = Math.round(centerY - charH / 2);

  for (let c = 0; c < text.length; c++) {
    const char = text[c];
    const grid = FONT_5X7[char];
    if (!grid) continue;
    const charLeft = Math.round(startX + c * (charW + spacing));

    for (let gy = 0; gy < 7; gy++) {
      for (let gx = 0; gx < 5; gx++) {
        if (grid[gy][gx]) {
          const px0 = Math.round(charLeft + gx * scale);
          const py0 = Math.round(startY + gy * scale);
          const block = Math.max(1, Math.ceil(scale));
          for (let dy = 0; dy < block; dy++) {
            for (let dx = 0; dx < block; dx++) {
              const x = px0 + dx;
              const y = py0 + dy;
              if (x >= 0 && x < size && y >= 0 && y < size) {
                const idx = (size * y + x) << 2;
                png.data[idx] = r;
                png.data[idx + 1] = g;
                png.data[idx + 2] = b;
                png.data[idx + 3] = 255;
              }
            }
          }
        }
      }
    }
  }
}

function drawTextDNT(png, size, cx, cy, scale) {
  renderBitmapText(png, size, 'DNT', cx, cy, scale * 3.5, 30, 58, 138); // Blue #1e3a8a
}

function drawTextGS25(png, size, cx, cy, scale) {
  // Shadow
  renderBitmapText(png, size, 'GS25', cx, cy + Math.round(4 * scale), scale * 6.5, 15, 23, 42);
  // Main White Text
  renderBitmapText(png, size, 'GS25', cx, cy, scale * 6.5, 255, 255, 255);
}

// Generate files
const publicDir = path.join(__dirname, '../public');

const icon192 = createPWAIcon(192, false);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), PNG.sync.write(icon192));

const icon512 = createPWAIcon(512, false);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), PNG.sync.write(icon512));

const maskable512 = createPWAIcon(512, true);
fs.writeFileSync(path.join(publicDir, 'icon-maskable-512.png'), PNG.sync.write(maskable512));

console.log('✅ Generated icon-192.png, icon-512.png, and icon-maskable-512.png successfully!');

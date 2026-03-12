import sharp from "sharp";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../public");

// SVG icon template — M in red circle on beige background
function iconSvg(size) {
  const r = Math.round(size * 0.35);
  const fontSize = Math.round(size * 0.39);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#E8E4DD"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="#E63B2E"/>
  <text x="${size / 2}" y="${size / 2}" font-family="Arial,Helvetica,sans-serif" font-weight="bold" font-size="${fontSize}" fill="#F5F3EE" text-anchor="middle" dominant-baseline="central">M</text>
</svg>`;
}

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180, root: true },
];

for (const { name, size, root } of sizes) {
  const svg = Buffer.from(iconSvg(size));
  const outPath = root
    ? resolve(publicDir, name)
    : resolve(publicDir, "icons", name);

  await sharp(svg).png().toFile(outPath);
  console.log(`Generated ${name} (${size}x${size})`);
}

console.log("Done!");

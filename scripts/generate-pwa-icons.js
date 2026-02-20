#!/usr/bin/env node
/**
 * Generates PWA icons (icon-192.png, icon-512.png) from public/icon.svg.
 * Run: node scripts/generate-pwa-icons.js
 * Root cause fix: these files are requested by layout and manifest but were missing.
 */
const fs = require("fs")
const path = require("path")

const publicDir = path.join(__dirname, "..", "public")
const svgPath = path.join(publicDir, "icon.svg")

async function main() {
  let sharp
  try {
    sharp = require("sharp")
  } catch {
    console.error("Run: npm install --save-dev sharp")
    process.exit(1)
  }

  if (!fs.existsSync(svgPath)) {
    console.error("Missing public/icon.svg")
    process.exit(1)
  }

  const svg = fs.readFileSync(svgPath)
  for (const size of [192, 512]) {
    const outPath = path.join(publicDir, `icon-${size}.png`)
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(outPath)
    console.log("Wrote", outPath)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

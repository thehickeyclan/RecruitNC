import sharp from "sharp"
import { readFileSync } from "fs"
import { resolve } from "path"
import { removeEdgeConnectedStudioBackground } from "../lib/store-product-image-process"

async function main() {
  const src = readFileSync(resolve("public/images/store/first-in-flight-singlet-source.png"))
  const processed = await removeEdgeConnectedStudioBackground(src)
  const { data, info } = await sharp(processed).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info

  // Sample corners for bg
  const corners = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]
  let bgR = 0, bgG = 0, bgB = 0
  for (const [x, y] of corners) {
    const i = (y * width + x) * 4
    bgR += data[i]; bgG += data[i+1]; bgB += data[i+2]
  }
  bgR /= 4; bgG /= 4; bgB /= 4
  console.log("corner bg (should be transparent):", bgR, bgG, bgB)

  let badPixels = 0
  const yStart = Math.floor(height * 0.5)
  for (let y = yStart; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (data[i+3] < 128) continue
      const r = data[i], g = data[i+1], b = data[i+2]
      const dist = Math.sqrt((r-bgR)**2 + (g-bgG)**2 + (b-bgB)**2)
      const lum = 0.299*r + 0.587*g + 0.114*b
      if (lum > 190 && dist < 25) {
        badPixels++
        if (badPixels <= 5) console.log("bad", x, y, { r, g, b, dist, lum, a: data[i+3] })
      }
    }
  }
  console.log("bottom-half bg-like opaque pixels:", badPixels)
}

main().catch(console.error)

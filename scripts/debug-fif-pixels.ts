import sharp from "sharp"
import { readFileSync } from "fs"
import { resolve } from "path"

async function main() {
  const src = readFileSync(resolve("public/images/store/first-in-flight-singlet-source.png"))
  const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info

  const corners = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]
  let bgR = 0, bgG = 0, bgB = 0
  for (const [x, y] of corners) {
    const i = (y * width + x) * 3
    bgR += data[i]; bgG += data[i+1]; bgB += data[i+2]
  }
  bgR /= 4; bgG /= 4; bgB /= 4
  const bgLum = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB
  console.log("bg", { bgR, bgG, bgB, bgLum })

  // sample bottom-right quadrant light pixels
  let count = 0
  for (let y = Math.floor(height * 0.65); y < height; y++) {
    for (let x = Math.floor(width * 0.45); x < width; x++) {
      const i = (y * width + x) * 3
      const r = data[i], g = data[i+1], b = data[i+2]
      const lum = 0.299*r + 0.587*g + 0.114*b
      const dist = Math.sqrt((r-bgR)**2 + (g-bgG)**2 + (b-bgB)**2)
      if (lum > 175) {
        count++
        if (count <= 15) console.log(x, y, { r, g, b, lum, dist })
      }
    }
  }
  console.log("light pixels bottom-right:", count)
}

main().catch(console.error)

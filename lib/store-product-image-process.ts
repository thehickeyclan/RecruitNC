import sharp from "sharp"

/** Remove light/gray studio backgrounds for catalog PNGs (no FAL required). */
export async function removeStudioBackground(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const pixels = data as Buffer
  const { width, height } = info

  // Sample corners for studio backdrop color
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ]
  let bgR = 0
  let bgG = 0
  let bgB = 0
  for (const [x, y] of corners) {
    const i = (y * width + x) * 4
    bgR += pixels[i]
    bgG += pixels[i + 1]
    bgB += pixels[i + 2]
  }
  bgR /= corners.length
  bgG /= corners.length
  bgB /= corners.length

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      const sat = max === 0 ? 0 : (max - min) / max
      const edge = Math.min(x, y, width - 1 - x, height - 1 - y)
      const edgeBias = edge < 12 ? 18 : 0

      const distBg = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2)
      const nearCornerBg = distBg < 42 + edgeBias

      let alphaMul = 1
      if (nearCornerBg || (lum > 158 - edgeBias && sat < 0.32)) {
        const t = nearCornerBg
          ? Math.min(1, distBg / 38)
          : Math.min(1, Math.max(0, (lum - (148 - edgeBias)) / 75))
        alphaMul = 1 - t
      }

      pixels[i + 3] = Math.round(pixels[i + 3] * alphaMul)
    }
  }

  const trimmed = await sharp(pixels, { raw: { width, height, channels: 4 } })
    .png()
    .trim({ threshold: 10 })
    .toBuffer()

  // Add breathing room so object-contain never clips straps/feet
  return sharp(trimmed)
    .extend({
      top: 28,
      bottom: 28,
      left: 24,
      right: 24,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()
}

function sampleStudioBackdrop(pixels: Buffer, width: number, height: number) {
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ]
  let bgR = 0
  let bgG = 0
  let bgB = 0
  for (const [x, y] of corners) {
    const i = (y * width + x) * 4
    bgR += pixels[i]
    bgG += pixels[i + 1]
    bgB += pixels[i + 2]
  }
  bgR /= corners.length
  bgG /= corners.length
  bgB /= corners.length
  const bgLum = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB
  return { bgR, bgG, bgB, bgLum }
}

function makeStudioBgMatcher(bgR: number, bgG: number, bgB: number, bgLum: number, loose: boolean) {
  return (r: number, g: number, b: number) => {
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    const sat = max === 0 ? 0 : (max - min) / max
    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2)
    // White singlet fabric sits above studio gray — never key it out
    if (lum > bgLum + 3) return false
    if (loose) return dist < 20 && sat < 0.16
    return dist < 14 && sat < 0.14
  }
}

const STORE_FRAME_RGB = { r: 15, g: 28, b: 46 } // #0f1c2e

/** Flatten studio gray onto store navy — no alpha halos on dark frames. */
export async function flattenStudioBackgroundToStoreFrame(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const pixels = data as Buffer
  const { width, height } = info
  const { bgR, bgG, bgB, bgLum } = sampleStudioBackdrop(pixels, width, height)
  const isBgStrict = makeStudioBgMatcher(bgR, bgG, bgB, bgLum, false)
  const isBgLoose = makeStudioBgMatcher(bgR, bgG, bgB, bgLum, true)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]
      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2)

      let bgMix = 0
      if (isBgStrict(r, g, b)) bgMix = 1
      else if (isBgLoose(r, g, b)) bgMix = Math.min(1, Math.max(0, 1 - dist / 20))
      else if (lum <= bgLum + 1 && dist < 28) bgMix = Math.min(1, Math.max(0, 1 - dist / 28))

      if (bgMix <= 0) {
        pixels[i + 3] = 255
        continue
      }

      pixels[i] = Math.round(r * (1 - bgMix) + STORE_FRAME_RGB.r * bgMix)
      pixels[i + 1] = Math.round(g * (1 - bgMix) + STORE_FRAME_RGB.g * bgMix)
      pixels[i + 2] = Math.round(b * (1 - bgMix) + STORE_FRAME_RGB.b * bgMix)
      pixels[i + 3] = 255
    }
  }

  const trimmed = await sharp(pixels, { raw: { width, height, channels: 4 } })
    .png()
    .trim({ threshold: 8, background: STORE_FRAME_RGB })
    .toBuffer()

  return sharp(trimmed)
    .extend({
      top: 28,
      bottom: 28,
      left: 24,
      right: 24,
      background: STORE_FRAME_RGB,
    })
    .png()
    .toBuffer()
}

/** Remove backdrop only from edge-connected pixels (keeps white product areas). */
export async function removeEdgeConnectedStudioBackground(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const pixels = data as Buffer
  const { width, height } = info
  const { bgR, bgG, bgB, bgLum } = sampleStudioBackdrop(pixels, width, height)
  const isBgStrict = makeStudioBgMatcher(bgR, bgG, bgB, bgLum, false)
  const isBgLoose = makeStudioBgMatcher(bgR, bgG, bgB, bgLum, true)

  const isBgAt = (x: number, y: number, loose: boolean) => {
    const i = (y * width + x) * 4
    const fn = loose ? isBgLoose : isBgStrict
    return fn(pixels[i], pixels[i + 1], pixels[i + 2])
  }

  const visited = new Uint8Array(width * height)
  const queue: Array<[number, number]> = []

  for (let x = 0; x < width; x++) {
    if (isBgAt(x, 0, false)) queue.push([x, 0])
    if (isBgAt(x, height - 1, false)) queue.push([x, height - 1])
  }
  for (let y = 0; y < height; y++) {
    if (isBgAt(0, y, false)) queue.push([0, y])
    if (isBgAt(width - 1, y, false)) queue.push([width - 1, y])
  }

  while (queue.length > 0) {
    const [x, y] = queue.pop()!
    const idx = y * width + x
    if (visited[idx]) continue
    if (!isBgAt(x, y, false)) continue
    visited[idx] = 1
    pixels[idx * 4 + 3] = 0
    if (x > 0) queue.push([x - 1, y])
    if (x < width - 1) queue.push([x + 1, y])
    if (y > 0) queue.push([x, y - 1])
    if (y < height - 1) queue.push([x, y + 1])
  }

  // Eat enclosed studio pockets (between legs, anti-alias halos) from transparent edges inward
  const neighbors = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]
  for (let pass = 0; pass < 48; pass++) {
    let changed = 0
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        if (pixels[i + 3] === 0) continue
        if (!isBgAt(x, y, true)) continue
        let touchesTransparent = false
        for (const [dx, dy] of neighbors) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            touchesTransparent = true
            break
          }
          if (pixels[(ny * width + nx) * 4 + 3] === 0) {
            touchesTransparent = true
            break
          }
        }
        if (touchesTransparent) {
          pixels[i + 3] = 0
          changed++
        }
      }
    }
    if (changed === 0) break
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (pixels[i + 3] < 64) pixels[i + 3] = 0
    }
  }

  const trimmed = await sharp(pixels, { raw: { width, height, channels: 4 } })
    .png()
    .trim({ threshold: 10 })
    .toBuffer()

  return sharp(trimmed)
    .extend({
      top: 28,
      bottom: 28,
      left: 24,
      right: 24,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()
}

export async function processStoreCatalogImage(input: Buffer): Promise<Buffer> {
  const meta = await sharp(input).metadata()
  if (meta.hasAlpha) {
    return sharp(input).png().trim({ threshold: 10 }).extend({
      top: 28,
      bottom: 28,
      left: 24,
      right: 24,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    }).png().toBuffer()
  }
  return flattenStudioBackgroundToStoreFrame(input)
}

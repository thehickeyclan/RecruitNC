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

/** Remove backdrop only from edge-connected pixels (keeps white product areas). */
export async function removeEdgeConnectedStudioBackground(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const pixels = data as Buffer
  const { width, height } = info

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

  const isBg = (x: number, y: number) => {
    const i = (y * width + x) * 4
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    return dist < 14 && lum <= bgLum + 4
  }

  const visited = new Uint8Array(width * height)
  const queue: Array<[number, number]> = []

  for (let x = 0; x < width; x++) {
    if (isBg(x, 0)) queue.push([x, 0])
    if (isBg(x, height - 1)) queue.push([x, height - 1])
  }
  for (let y = 0; y < height; y++) {
    if (isBg(0, y)) queue.push([0, y])
    if (isBg(width - 1, y)) queue.push([width - 1, y])
  }

  while (queue.length > 0) {
    const [x, y] = queue.pop()!
    const idx = y * width + x
    if (visited[idx]) continue
    if (!isBg(x, y)) continue
    visited[idx] = 1
    pixels[idx * 4 + 3] = 0
    if (x > 0) queue.push([x - 1, y])
    if (x < width - 1) queue.push([x + 1, y])
    if (y > 0) queue.push([x, y - 1])
    if (y < height - 1) queue.push([x, y + 1])
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
  return removeEdgeConnectedStudioBackground(input)
}

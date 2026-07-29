import sharp from "sharp"
import { readFileSync, writeFileSync } from "fs"
import { resolve } from "path"
import { removeEdgeConnectedStudioBackground, processStoreCatalogImage } from "../lib/store-product-image-process"

async function analyze(label: string, buf: Buffer) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  let lightOpaque = 0
  let totalOpaque = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const a = data[i + 3]
      if (a < 128) continue
      totalOpaque++
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      if (lum > 200) lightOpaque++
    }
  }
  const meta = await sharp(buf).metadata()
  console.log(label, { width, height, hasAlpha: meta.hasAlpha, totalOpaque, lightOpaque })
}

async function main() {
  const src = readFileSync(resolve("public/images/store/first-in-flight-singlet-source.png"))
  await analyze("source", src)

  const processed = await removeEdgeConnectedStudioBackground(src)
  await analyze("edge-connected", processed)
  writeFileSync("/tmp/fif-edge-connected.png", processed)

  const full = await processStoreCatalogImage(src)
  writeFileSync("/tmp/fif-processed.png", full)
  await analyze("processStoreCatalogImage", full)

  const url =
    "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/store/products/5beafde6-acbf-4bdd-aa68-9b80722eb7a9-main-1780950164011.png"
  const live = Buffer.from(await (await fetch(url)).arrayBuffer())
  await analyze("live blob", live)
  writeFileSync("/tmp/fif-live.png", live)
}

main().catch(console.error)

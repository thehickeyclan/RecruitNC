/**
 * One-off: upload product image (transparent PNG) and update products + product_images.
 *
 * Usage:
 *   npx tsx scripts/update-store-product-image.ts <product-id> <path-to-image>
 *
 * Requires .env.local: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL,
 * BLOB_READ_WRITE_TOKEN, FAL_KEY (for background removal when source is not PNG with alpha).
 */

import { existsSync, readFileSync } from "fs"
import { resolve, join } from "path"
import sharp from "sharp"
import { createClient } from "@supabase/supabase-js"
import {
  removeBackgroundFromBytes,
  uploadGearBytesToBlob,
} from "../lib/nhsca-gear-background-removal"
import { processStoreCatalogImage } from "../lib/store-product-image-process"

const root = resolve(__dirname, "..")

function loadEnvFile(rel: string) {
  const p = join(root, rel)
  if (!existsSync(p)) return
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq <= 0) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val.replace(/\r$/, "").trim()
  }
}

loadEnvFile(".env.local")
loadEnvFile(".env")

const PRODUCT_ID = process.argv[2]
const IMAGE_PATH = process.argv[3]
const RAW_UPLOAD = process.argv.includes("--raw")

/** Knock out light gray studio gradients (product mockups) when FAL is unavailable. */
async function removeLightStudioBackground(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const pixels = data as Buffer
  const { width, height } = info

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
      const edgeBias = edge < 8 ? 12 : 0

      if (lum > 165 - edgeBias && sat < 0.28) {
        const t = Math.min(1, Math.max(0, (lum - (155 - edgeBias)) / 70))
        pixels[i + 3] = Math.round(pixels[i + 3] * (1 - t))
      }
    }
  }

  return sharp(pixels, { raw: { width, height, channels: 4 } })
    .png()
    .trim({ threshold: 12 })
    .toBuffer()
}

async function main() {
  if (!PRODUCT_ID || !IMAGE_PATH) {
    console.error("Usage: npx tsx scripts/update-store-product-image.ts <product-id> <image-path>")
    process.exit(1)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Missing BLOB_READ_WRITE_TOKEN in .env.local")
  }

  const absPath = resolve(IMAGE_PATH)
  let buffer = readFileSync(absPath)

  if (RAW_UPLOAD) {
    console.log("Raw upload — no background processing")
    buffer = await sharp(buffer).png().toBuffer()
  } else {
  const meta = await sharp(buffer).metadata()
  const hasAlpha = meta.hasAlpha === true

  if (!hasAlpha) {
    let removed = false
    if (process.env.FAL_KEY) {
      try {
        console.log("Removing background via fal BiRefNet…")
        const { buffer: transparentBuffer } = await removeBackgroundFromBytes(
          `store-product-${PRODUCT_ID}.jpg`,
          buffer,
        )
        buffer = transparentBuffer
        removed = true
      } catch (e) {
        console.warn("FAL background removal failed, using local fallback:", e instanceof Error ? e.message : e)
      }
    }
    if (!removed) {
      console.log("Removing studio background (edge-connected)…")
      buffer = await processStoreCatalogImage(buffer)
    }
  } else {
    console.log("Source already has alpha; encoding PNG…")
    buffer = await sharp(buffer).png().toBuffer()
  }
  }

  const blobPath = `store/products/${PRODUCT_ID}-main-${Date.now()}.png`
  const blobUrl = await uploadGearBytesToBlob(blobPath, buffer, "image/png")
  console.log("Uploaded:", blobUrl)

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: product, error: fetchErr } = await admin
    .from("products")
    .select("id, name, image_url")
    .eq("id", PRODUCT_ID)
    .single()

  if (fetchErr || !product) {
    throw new Error(fetchErr?.message ?? `Product ${PRODUCT_ID} not found`)
  }

  console.log("Updating product:", product.name)

  const { error: updateErr } = await admin
    .from("products")
    .update({ image_url: blobUrl })
    .eq("id", PRODUCT_ID)

  if (updateErr) throw new Error(updateErr.message)

  const { error: deleteErr } = await admin.from("product_images").delete().eq("product_id", PRODUCT_ID)
  if (deleteErr) console.warn("product_images delete:", deleteErr.message)

  const { error: insertErr } = await admin.from("product_images").insert({
    product_id: PRODUCT_ID,
    url: blobUrl,
    color: null,
    display_order: 0,
  })

  if (insertErr) throw new Error(insertErr.message)

  console.log("Done. Store URL: https://app.ncwrestlingunited.com/store-app/product/" + PRODUCT_ID)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

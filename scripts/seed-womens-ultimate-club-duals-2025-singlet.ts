/**
 * Create Women's Ultimate Club Duals 2025 singlet — sold out, $75, public store listing.
 *
 * Usage: npx tsx scripts/seed-womens-ultimate-club-duals-2025-singlet.ts
 */

import { existsSync, readFileSync } from "fs"
import { join, resolve } from "path"
import sharp from "sharp"
import { createClient } from "@supabase/supabase-js"
import { uploadGearBytesToBlob } from "../lib/nhsca-gear-background-removal"
import { NHSCA_HUB_GEAR_SIZES } from "../lib/nhsca-hub-checkout-pricing"

const SLUG = "womens-ultimate-club-duals-2025-singlet"
const SOURCE_IMAGE = "public/images/store/womens-ultimate-club-duals-2025-singlet-source.png"
const PRICE = 75
const SKU_PREFIX = "NCU-UC25W-SING"

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
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY")
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Missing BLOB_READ_WRITE_TOKEN")

  const sourcePath = join(root, SOURCE_IMAGE)
  if (!existsSync(sourcePath)) throw new Error(`Source image not found: ${sourcePath}`)

  let buffer = readFileSync(sourcePath)
  const meta = await sharp(buffer).metadata()
  if (!meta.hasAlpha) {
    console.log("Processing transparent background…")
    buffer = await removeLightStudioBackground(buffer)
  } else {
    buffer = await sharp(buffer).png().trim({ threshold: 12 }).toBuffer()
  }

  const blobUrl = await uploadGearBytesToBlob(
    `store/products/${SLUG}-${Date.now()}.png`,
    buffer,
    "image/png",
  )
  console.log("Image:", blobUrl)

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: existing } = await admin.from("products").select("id").eq("slug", SLUG).maybeSingle()

  const productRow = {
    name: "Women's Ultimate Club Duals 2025 Singlet",
    description:
      "Official NC United women's singlet from Ultimate Club Duals 2025. Takedown competition cut — red and navy body with North Carolina script, NC crest, and gold N★C leg detail. This season is complete — listing kept for reference; all sizes are sold out.",
    category: "athletic-wear",
    price: PRICE,
    in_stock: true,
    featured: false,
    image_url: blobUrl,
    display_order: 7,
    show_in_public_store: true,
    slug: SLUG,
  }

  let productId: string
  if (existing?.id) {
    productId = String(existing.id)
    const { error } = await admin.from("products").update(productRow).eq("id", productId)
    if (error) throw new Error(error.message)
    console.log("Updated product", productId)
  } else {
    const { data: inserted, error } = await admin.from("products").insert(productRow).select("id").single()
    if (error || !inserted) throw new Error(error?.message ?? "insert failed")
    productId = String(inserted.id)
    console.log("Created product", productId)
  }

  await admin.from("product_images").delete().eq("product_id", productId)
  await admin.from("product_variants").delete().eq("product_id", productId)

  const { error: imgErr } = await admin.from("product_images").insert({
    product_id: productId,
    url: blobUrl,
    color: "Red",
    display_order: 0,
  })
  if (imgErr) throw new Error(imgErr.message)

  const variantRows = NHSCA_HUB_GEAR_SIZES.map((size) => ({
    product_id: productId,
    color: "Red",
    size,
    sku: `${SKU_PREFIX}-RED-${size.replace(/\s+/g, "")}`,
    stock_quantity: 0,
  }))

  const { error: varErr } = await admin.from("product_variants").insert(variantRows)
  if (varErr) throw new Error(varErr.message)

  console.log(`\nDone — ${variantRows.length} variants at 0 stock (sold out).`)
  console.log(`https://app.ncwrestlingunited.com/store-app/product/${productId}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

/**
 * Re-upload all store singlet images with improved transparent PNG processing.
 *
 * Usage: npx tsx scripts/reprocess-store-singlet-images.ts
 */

import { existsSync, readFileSync } from "fs"
import { join, resolve } from "path"
import { createClient } from "@supabase/supabase-js"
import { uploadGearBytesToBlob } from "../lib/nhsca-gear-background-removal"
import { processStoreCatalogImage } from "../lib/store-product-image-process"

const root = resolve(__dirname, "..")

const SOURCE_BY_SLUG: Record<string, string> = {
  "ultimate-club-duals-2025-singlet": "public/images/store/ultimate-club-duals-2025-singlet-source.png",
  "nhsca-duals-2025-singlet": "public/images/store/nhsca-duals-2025-singlet-source.png",
  "womens-ultimate-club-duals-2025-singlet": "public/images/store/womens-ultimate-club-duals-2025-singlet-source.png",
  "womens-blue-ultimate-club-duals-2025-singlet":
    "public/images/store/womens-blue-ultimate-club-duals-2025-singlet-source.png",
}

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

async function loadSourceBuffer(
  slug: string,
  name: string,
  imageUrl: string | null,
): Promise<Buffer> {
  const rel = SOURCE_BY_SLUG[slug]
  if (rel) {
    const path = join(root, rel)
    if (existsSync(path)) return readFileSync(path)
  }
  const firstInFlightSource = join(root, "public/images/store/nc-united-singlet-product-source.jpg")
  if (name.toLowerCase().includes("first in flight") && existsSync(firstInFlightSource)) {
    return readFileSync(firstInFlightSource)
  }
  if (!imageUrl) throw new Error(`No source file or image_url for ${slug}`)
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`Failed to fetch ${imageUrl}`)
  return Buffer.from(await res.arrayBuffer())
}

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Missing Supabase credentials")
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Missing BLOB_READ_WRITE_TOKEN")

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: products, error } = await admin
    .from("products")
    .select("id, name, slug, image_url")
    .eq("show_in_public_store", true)

  if (error) throw new Error(error.message)

  const singlets = (products ?? []).filter((p) => {
    const slug = (p.slug ?? "").toLowerCase()
    const name = (p.name ?? "").toLowerCase()
    return slug.includes("singlet") || name.includes("singlet")
  })

  console.log(`Reprocessing ${singlets.length} singlet products…`)

  for (const product of singlets) {
    const slug = String(product.slug ?? "")
    const id = String(product.id)
    console.log(`\n→ ${product.name} (${slug || id})`)

    try {
      const raw = await loadSourceBuffer(slug, String(product.name ?? ""), product.image_url as string | null)
      const processed = await processStoreCatalogImage(raw)
      const blobUrl = await uploadGearBytesToBlob(
        `store/products/${slug || id}-${Date.now()}.png`,
        processed,
        "image/png",
      )

      await admin.from("products").update({ image_url: blobUrl }).eq("id", id)
      await admin.from("product_images").delete().eq("product_id", id)
      await admin.from("product_images").insert({
        product_id: id,
        url: blobUrl,
        display_order: 0,
      })

      console.log("  ✓", blobUrl)
    } catch (e) {
      console.warn("  ✗", e instanceof Error ? e.message : e)
    }
  }

  console.log("\nDone.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

/**
 * Re-upload all public store product images with transparent PNG catalog processing.
 * Skips NHSCA 2026 gear (already processed) and placeholders.
 *
 * Usage:
 *   npm run store:reprocess-catalog
 *   npm run store:reprocess-catalog -- --dry-run
 */

import { existsSync, readFileSync } from "fs"
import { join, resolve } from "path"
import { createClient } from "@supabase/supabase-js"
import { uploadGearBytesToBlob } from "../lib/nhsca-gear-background-removal"
import { processStoreCatalogImage } from "../lib/store-product-image-process"

const root = resolve(__dirname, "..")
const dryRun = process.argv.includes("--dry-run")

/** Already transparent catalog assets — do not reprocess. */
function isCatalogReadyUrl(url: string | null | undefined): boolean {
  if (!url) return true
  if (url.includes("placeholder.svg")) return true
  if (url.includes("nhsca-duals-2026-gear/")) return true
  return false
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

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`)
  return Buffer.from(await res.arrayBuffer())
}

async function reprocessUrl(
  admin: ReturnType<typeof createClient>,
  productId: string,
  productSlug: string,
  label: string,
  url: string,
): Promise<string | null> {
  if (isCatalogReadyUrl(url)) {
    console.log(`  skip (catalog-ready): ${label}`)
    return url
  }

  if (dryRun) {
    console.log(`  [dry-run] would reprocess: ${label}`)
    return url
  }

  const raw = await fetchImageBuffer(url)
  const processed = await processStoreCatalogImage(raw)
  const blobUrl = await uploadGearBytesToBlob(
    `store/products/${productSlug || productId}-${Date.now()}.png`,
    processed,
    "image/png",
  )
  console.log(`  ✓ ${label}`)
  console.log(`    ${blobUrl}`)
  return blobUrl
}

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Missing Supabase credentials")
  if (!dryRun && !process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Missing BLOB_READ_WRITE_TOKEN")
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: products, error } = await admin
    .from("products")
    .select("id, name, slug, image_url")
    .eq("show_in_public_store", true)
    .order("display_order", { ascending: true })

  if (error) throw new Error(error.message)

  console.log(dryRun ? "DRY RUN — no writes\n" : `Reprocessing ${products?.length ?? 0} public store products…`)

  for (const product of products ?? []) {
    const id = String(product.id)
    const slug = String(product.slug ?? id)
    const name = String(product.name ?? slug)
    console.log(`\n→ ${name} (${slug})`)

    const { data: images, error: imgErr } = await admin
      .from("product_images")
      .select("id, url, display_order, color")
      .eq("product_id", id)
      .order("display_order", { ascending: true })

    if (imgErr) throw new Error(imgErr.message)

    let primaryUrl = product.image_url as string | null

    if (images && images.length > 0) {
      for (const img of images) {
        const src = String(img.url ?? "")
        if (!src) continue
        const next = await reprocessUrl(admin, id, slug, `image #${img.display_order ?? 0}`, src)
        if (next && next !== src) {
          await admin.from("product_images").update({ url: next }).eq("id", img.id)
          if ((img.display_order ?? 0) === 0 || src === primaryUrl) primaryUrl = next
        }
      }
    } else if (primaryUrl) {
      primaryUrl = await reprocessUrl(admin, id, slug, "primary image_url", primaryUrl)
    }

    if (!dryRun && primaryUrl && primaryUrl !== product.image_url) {
      await admin.from("products").update({ image_url: primaryUrl }).eq("id", id)
    }
  }

  console.log("\nDone.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

/**
 * Upsert NC United 2026 gear (singlet, long sleeve, shorts, tee) into the public store.
 *
 * Requires .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL  (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   npm run store:seed-2026-gear              # upsert all four products
 *   npm run store:seed-2026-gear -- --dry-run   # print actions only
 *
 * Safe to re-run — matches products by slug and refreshes images + variants.
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createClient } from "@supabase/supabase-js"
import {
  NC_UNITED_2026_DEPRECATED_STORE_SLUG_PREFIXES,
  NC_UNITED_2026_DEPRECATED_STORE_SLUGS,
  NC_UNITED_2026_STORE_GEAR,
  type NcUnitedStoreGearProduct,
} from "../lib/nc-united-2026-store-gear"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")

function loadEnvFile(rel: string) {
  const p = path.join(root, rel)
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
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

const dryRun = process.argv.includes("--dry-run")

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_OVERRIDE
  if (!url || !key) {
    console.error(`
Missing Supabase credentials.

Add to Recruit-NC-main/.env.local:
  NEXT_PUBLIC_SUPABASE_URL=https://....supabase.co
  SUPABASE_SERVICE_ROLE_KEY=eyJ...

Or: vercel env pull .env.local

Then: npm run store:seed-2026-gear
`)
    process.exit(1)
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function variantSku(prefix: string, color: string, size: string): string {
  const c = color.replace(/\s+/g, "").slice(0, 6).toUpperCase()
  const s = size.replace(/\s+/g, "").toUpperCase()
  return `${prefix}-${c}-${s}`
}

function buildVariants(def: NcUnitedStoreGearProduct) {
  const rows: Array<{ color: string; size: string; sku: string; stock_quantity: number }> = []
  for (const color of def.colors) {
    for (const size of def.sizes) {
      rows.push({
        color,
        size,
        sku: variantSku(def.skuPrefix, color, size),
        stock_quantity: def.defaultStockPerVariant,
      })
    }
  }
  return rows
}

async function upsertGearProduct(
  supabase: ReturnType<typeof createClient>,
  def: NcUnitedStoreGearProduct,
) {
  const primaryImage = def.images[0]?.url ?? null
  const variantCount = def.colors.length * def.sizes.length

  console.log(`\n→ ${def.name} (${def.slug}) — $${def.price} · ${variantCount} variants`)

  if (dryRun) {
    console.log("  [dry-run] would upsert product, images, variants")
    def.images.forEach((img) => console.log(`    image: ${img.url}${img.color ? ` (${img.color})` : ""}`))
    return
  }

  const { data: existing, error: lookupError } = await supabase
    .from("products")
    .select("id")
    .eq("slug", def.slug)
    .maybeSingle()

  if (lookupError) throw new Error(`Lookup ${def.slug}: ${lookupError.message}`)

  const productRow = {
    name: def.name,
    description: def.description,
    category: def.category,
    price: def.price,
    in_stock: true,
    featured: def.featured,
    image_url: primaryImage,
    display_order: def.displayOrder,
    show_in_public_store: true,
    slug: def.slug,
  }

  let productId: string

  if (existing?.id != null) {
    productId = String(existing.id)
    const { error: updateError } = await supabase.from("products").update(productRow).eq("id", productId)
    if (updateError) throw new Error(`Update ${def.slug}: ${updateError.message}`)
    console.log(`  updated product id=${productId}`)
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from("products")
      .insert(productRow)
      .select("id")
      .single()
    if (insertError || !inserted) {
      throw new Error(`Insert ${def.slug}: ${insertError?.message ?? "no row returned"}`)
    }
    productId = String(inserted.id)
    console.log(`  created product id=${productId}`)
  }

  const { error: delImgError } = await supabase.from("product_images").delete().eq("product_id", productId)
  if (delImgError) throw new Error(`Delete images ${def.slug}: ${delImgError.message}`)

  const { error: delVarError } = await supabase.from("product_variants").delete().eq("product_id", productId)
  if (delVarError) throw new Error(`Delete variants ${def.slug}: ${delVarError.message}`)

  const imageRows = def.images.map((img) => ({
    product_id: productId,
    url: img.url,
    color: img.color ?? null,
    display_order: img.displayOrder,
  }))

  const { error: imgError } = await supabase.from("product_images").insert(imageRows)
  if (imgError) throw new Error(`Insert images ${def.slug}: ${imgError.message}`)
  console.log(`  ${imageRows.length} images`)

  const variantRows = buildVariants(def).map((v) => ({
    product_id: productId,
    ...v,
  }))

  const { error: varError } = await supabase.from("product_variants").insert(variantRows)
  if (varError) throw new Error(`Insert variants ${def.slug}: ${varError.message}`)
  console.log(`  ${variantRows.length} variants (stock ${def.defaultStockPerVariant} each)`)
}

async function retireDeprecatedProducts(supabase: ReturnType<typeof createClient>) {
  const retiredIds = new Set<string>()

  async function retireRow(id: string, name: string, label: string) {
    if (retiredIds.has(id)) return
    const { error: updateError } = await supabase
      .from("products")
      .update({ in_stock: false, show_in_public_store: false, featured: false })
      .eq("id", id)

    if (updateError) throw new Error(`Retire ${label}: ${updateError.message}`)
    retiredIds.add(id)
    console.log(`\n→ Retired deprecated product: ${name} (${label})`)
  }

  for (const slug of NC_UNITED_2026_DEPRECATED_STORE_SLUGS) {
    const { data, error } = await supabase.from("products").select("id, name").eq("slug", slug).maybeSingle()
    if (error) throw new Error(`Retire lookup ${slug}: ${error.message}`)
    if (!data?.id) continue
    await retireRow(String(data.id), String(data.name ?? slug), slug)
  }

  for (const prefix of NC_UNITED_2026_DEPRECATED_STORE_SLUG_PREFIXES) {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, slug")
      .like("slug", `${prefix}%`)
      .eq("show_in_public_store", true)

    if (error) throw new Error(`Retire prefix lookup ${prefix}: ${error.message}`)
    for (const row of data ?? []) {
      if (!row?.id) continue
      await retireRow(String(row.id), String(row.name ?? prefix), String(row.slug ?? prefix))
    }
  }
}

async function main() {
  console.log(dryRun ? "DRY RUN — no database writes\n" : "Seeding NC United 2026 store gear…")

  for (const def of NC_UNITED_2026_STORE_GEAR) {
    for (const img of def.images) {
      if (img.url.startsWith("/images/")) {
        const filePath = path.join(root, "public", img.url.replace(/^\//, ""))
        if (!fs.existsSync(filePath)) {
          console.warn(`Warning: missing local fallback public${img.url}`)
        }
      }
    }
  }

  const supabase = dryRun ? null : supabaseAdmin()

  for (const def of NC_UNITED_2026_STORE_GEAR) {
    await upsertGearProduct(supabase as ReturnType<typeof createClient>, def)
  }

  if (!dryRun && supabase) {
    await retireDeprecatedProducts(supabase)
  } else if (dryRun) {
    for (const slug of NC_UNITED_2026_DEPRECATED_STORE_SLUGS) {
      console.log(`\n→ [dry-run] would retire deprecated slug: ${slug}`)
    }
  }

  console.log(dryRun ? "\nDry run complete." : "\nDone. Check /store for the new products.")
}

main().catch((err) => {
  console.error("[RecruitNC] seed-nc-united-2026-gear-store:", err)
  process.exit(1)
})

/**
 * Re-list First In Flight + Patriot singlets on the public store.
 *
 * Usage: npx tsx scripts/restore-store-singlets.ts
 */

import { existsSync, readFileSync } from "fs"
import { join, resolve } from "path"
import { createClient } from "@supabase/supabase-js"
import { NC_UNITED_STORE_SINGLET_SLUGS_PUBLIC } from "../lib/nc-united-2026-store-gear"

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

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Missing Supabase credentials")

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  for (const slug of NC_UNITED_STORE_SINGLET_SLUGS_PUBLIC) {
    const { data, error } = await admin.from("products").select("id, name").eq("slug", slug).maybeSingle()
    if (error) throw new Error(error.message)
    if (!data?.id) {
      console.warn(`Not found: ${slug}`)
      continue
    }

    const updates: Record<string, unknown> = {
      show_in_public_store: true,
      in_stock: true,
    }

    const { error: updateError } = await admin.from("products").update(updates).eq("id", data.id)
    if (updateError) throw new Error(updateError.message)
    console.log(`✓ ${updates.name ?? data.name} (${slug})`)
  }

  console.log("\nDone. Check /store-app")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

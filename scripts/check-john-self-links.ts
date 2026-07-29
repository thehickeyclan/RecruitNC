/** Who is linked to self.john@gmail.com wallet? */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { createAdminClient } from "../lib/supabase/admin"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
for (const rel of [".env.local", ".env"]) {
  const p = path.join(root, rel)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq <= 0) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (!process.env[k]) process.env[k] = v.replace(/\r$/, "").trim()
  }
}

const EMAIL = "self.john@gmail.com"

async function main() {
  const admin = createAdminClient()
  let user: { id: string; email?: string } | undefined
  for (let page = 1; page <= 5; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    user = data.users.find((u) => u.email?.toLowerCase() === EMAIL)
    if (user || data.users.length < 1000) break
  }
  if (!user) {
    console.log("No auth user for", EMAIL)
    return
  }
  console.log("User:", user.id, user.email)

  const { data: prof } = await admin
    .from("user_profiles")
    .select("user_id, email, full_name, athlete_id, profile_type")
    .eq("user_id", user.id)
    .maybeSingle()
  console.log("Profile:", prof)

  const { data: links } = await admin
    .from("parent_athlete_links")
    .select("id, athlete_id, created_at, athletes(id, name, graduationyear)")
    .eq("user_id", user.id)
  console.log("\nparent_athlete_links:")
  for (const l of links ?? []) {
    console.log(" ", l)
  }

  if (prof?.athlete_id) {
    const { data: primary } = await admin.from("athletes").select("id, name").eq("id", prof.athlete_id).maybeSingle()
    console.log("\nprofile primary athlete:", primary)
  }
}

main().catch(console.error)

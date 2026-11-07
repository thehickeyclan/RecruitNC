#!/usr/bin/env npx tsx
/**
 * Give, take away or check the Business admin grant.
 *
 *   npx tsx scripts/grant-business-access.ts --email rhett@example.com
 *   npx tsx scripts/grant-business-access.ts --email rhett@example.com --revoke
 *   npx tsx scripts/grant-business-access.ts --list
 *
 * The grant is `app_metadata.business_access`, which only the service role can write, so nobody
 * can give it to themselves. It opens the pages in BUSINESS_PAGES (lib/business/access.ts) and
 * nothing else; the rest of admin stays shut, including every page added later.
 *
 * It is NOT `is_admin`. Never set that for a sales or social account: it opens all ~250 admin
 * pages, contacts and the athlete editors among them.
 *
 * The account must exist first - have them sign up at the normal address, then run this.
 */
import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"

for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}

const admin = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`)
  return i > -1 ? process.argv[i + 1] : undefined
}

/**
 * Say what actually went wrong.
 *
 * Supabase's errors do not stringify: `JSON.stringify(err)` on an AuthError gives "{}", so this
 * script once failed with the words "Failed: {}" while the project was returning 522 to every
 * call. Twenty wasted minutes. A 5xx from the platform is a different problem from a bad key or a
 * missing account, and the message has to say which.
 */
function explain(err: unknown): string {
  const e = err as { name?: string; status?: number; message?: string } | null
  const status = e?.status
  const name = e?.name ?? "Error"
  const message = e?.message && e.message !== "{}" ? e.message : ""
  if (status && status >= 500) {
    return `${name} ${status}: Supabase did not answer. The project is unreachable or overloaded - check its dashboard, then run this again. Nothing was changed.`
  }
  if (status === 401 || status === 403) {
    return `${name} ${status}: refused. SUPABASE_SERVICE_ROLE_KEY is missing or wrong in .env.local.`
  }
  return [name, status, message].filter(Boolean).join(" ") || "an error with no message"
}

async function everyUser() {
  const out: Array<{ id: string; email: string | null; app_metadata: Record<string, unknown> }> = []
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(explain(error))
    for (const u of data.users ?? []) {
      out.push({ id: u.id, email: u.email ?? null, app_metadata: (u.app_metadata ?? {}) as Record<string, unknown> })
    }
    if (!data.users || data.users.length < 1000) break
  }
  return out
}

async function main() {
  const users = await everyUser()

  if (process.argv.includes("--list")) {
    const held = users.filter((u) => u.app_metadata.business_access === true)
    console.log(held.length ? `${held.length} account(s) hold the business grant:` : "Nobody holds the business grant.")
    for (const u of held) console.log(" ", u.email ?? u.id)
    return
  }

  const email = (arg("email") ?? "").trim().toLowerCase()
  if (!email) {
    console.error("Usage: --email someone@example.com [--revoke] | --list")
    process.exit(1)
  }

  const user = users.find((u) => (u.email ?? "").toLowerCase() === email)
  if (!user) {
    console.error(`No account for ${email}. Have them sign up first, then run this again.`)
    process.exit(1)
  }

  const revoke = process.argv.includes("--revoke")
  const next = { ...user.app_metadata }
  if (revoke) delete next.business_access
  else next.business_access = true

  const { error } = await admin.auth.admin.updateUserById(user.id, { app_metadata: next })
  if (error) {
    console.error("Failed:", explain(error))
    process.exit(1)
  }

  const { data: profile } = await admin.from("user_profiles").select("is_admin, role").eq("user_id", user.id).maybeSingle()
  console.log(`${revoke ? "Took away" : "Gave"} the business grant: ${email}`)
  if (profile?.is_admin === true || profile?.role === "admin") {
    console.log("Note: this account is also a full admin, so it already opened everything. The grant changes nothing for it.")
  } else if (!revoke) {
    console.log("They open /admin/business and the pages on its list. The rest of admin stays shut.")
    console.log("They need to sign out and back in for it to take effect.")
  }
}

main().catch((e) => {
  console.error("Failed:", e instanceof Error ? e.message : explain(e))
  process.exit(1)
})

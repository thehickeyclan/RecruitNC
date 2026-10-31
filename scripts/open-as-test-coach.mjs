/**
 * Opens NC United signed in as the internal test coach, in a private Chrome window, to see what a
 * college coach sees - including the hand-over to RecruitWrestlers.com (Matt, 29 Oct 2026). Mints a
 * one-time sign-in; nothing is printed. Your own session is untouched.
 *
 *   node scripts/open-as-test-coach.mjs [path]      (default /my-recruits)
 */
import { readFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { createClient } from "@supabase/supabase-js"

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "")
}
const next = process.argv[2] && process.argv[2].startsWith("/") ? process.argv[2] : "/my-recruits"
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: "testcoach.thehickeyclan@gmail.com" })
if (error || !data?.properties?.hashed_token) {
  console.error("Could not create the sign-in:", error?.message ?? "no token")
  process.exit(1)
}
const url = `https://app.ncwrestlingunited.com/auth/callback?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=magiclink&next=${encodeURIComponent(next)}`
execFileSync("open", ["-na", "Google Chrome", "--args", "--incognito", url])
console.log(`Opened a private Chrome window as the test coach (${next}).`)

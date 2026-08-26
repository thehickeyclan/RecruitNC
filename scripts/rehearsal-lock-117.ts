/**
 * Rehearsal: lock the 117 draw so the pool submit path can be exercised once before
 * 11 September. Paired with scripts/rehearsal-cleanup.ts, which undoes it.
 */
import { createClient } from "@supabase/supabase-js"
import fs from "node:fs"
import { lockBracketDraw, getLockedDraw } from "../lib/toc/bracket-service"

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")] }),
)

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})

async function main() {
  const result = await lockBracketDraw(admin, 117)
  if ("error" in result) {
    console.log("LOCK FAILED:", result.error)
    process.exit(1)
  }
  const locked = await getLockedDraw(admin, 117)
  console.log("locked 117:", locked ? `${locked.participants.length} wrestlers, ${locked.bouts.length} bouts` : "not readable")
  const champ = locked?.bouts.find((b) => /championship/i.test(b.roundLabel))
  console.log("championship bout:", champ?.boutNumber)
  console.log("seeds:", locked?.participants.map((p) => `${p.seed}:${p.name}`).join(", "))
}

void main()

/**
 * After scripts/sql/college-recruiting-needs.sql is run: the needs table end to end, on prod, with
 * the real code (lib/recruiting/needs-server.ts). Posts as the internal test coach, an internal
 * account whose needs never reach a family; checks families do not see it, re-confirms, clears,
 * and deletes it again.
 *
 *   npx tsx scripts/verify-recruiting-needs.ts
 */
import { createRequire } from "module"
import fs from "fs"

const req = createRequire(import.meta.url)
const soPath = req.resolve("server-only")
;(req as unknown as { cache: Record<string, unknown> }).cache[soPath] = { id: soPath, filename: soPath, loaded: true, exports: {}, children: [], paths: [] }
const nextCache = req("next/cache") as { unstable_cache?: (fn: unknown) => unknown }
nextCache.unstable_cache = (fn) => fn
for (const line of fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8").split("\n") : []) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!.replace(/^"|"$/g, "")
}

const TEST_COACH = "testcoach.thehickeyclan@gmail.com"

async function main() {
  const { createClient } = await import("@supabase/supabase-js")
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { loadProgramNeeds, saveNeeds, updateNeed, liveNeedsFor } = await import("../lib/recruiting/needs-server")
  const { isInternalAccount } = await import("../lib/internal-accounts")

  const read = await admin.from("college_recruiting_needs").select("id").limit(1)
  if (read.error) throw new Error(`table: ${read.error.message}`)
  console.log("table: exists")
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const leak = await anon.from("college_recruiting_needs").select("id").limit(1)
  console.log("anon read refused:", leak.error ? `yes (${leak.error.message})` : `NO - returned ${leak.data?.length} rows`)

  const { data: coach } = await admin.from("user_profiles").select("user_id, role, verified_coach, verification_status").ilike("email", TEST_COACH).maybeSingle()
  if (!coach) throw new Error(`no ${TEST_COACH}`)
  if (!isInternalAccount(TEST_COACH)) throw new Error("test coach is not internal: a test need could reach families. Stopping.")
  const key = { schoolId: null, userId: String(coach.user_id) }

  const saved = await saveNeeds(admin, { ...key, programName: "Campbell University", mapSchoolId: "campbell-university", site: "ncu" }, {
    gender: "Male", weights: [149], classYears: [2027, 2028], minGpa: null, maxMiles: null, resultsLevel: "any",
  })
  console.log("posted:", saved.map((n) => `${n.weight} ${n.classYears}`))
  const again = await saveNeeds(admin, { ...key, programName: "Campbell University", mapSchoolId: "campbell-university", site: "ncu" }, {
    gender: "Male", weights: [149], classYears: [2028], minGpa: 3, maxMiles: null, resultsLevel: "state_placer",
  })
  console.log("re-post updates, not duplicates:", again[0]!.id === saved[0]!.id, (await loadProgramNeeds(admin, key)).needs.length === 1)
  const families = await liveNeedsFor(admin, { gender: "Male", classYear: 2028, weights: [149] })
  console.log("hidden from families (internal poster):", !families.some((f) => f.needId === saved[0]!.id))
  console.log("confirm:", Boolean(await updateNeed(admin, key, saved[0]!.id, "confirm")))
  console.log("clear:", Boolean(await updateNeed(admin, key, saved[0]!.id, "clear")), (await loadProgramNeeds(admin, key)).needs.length === 0)
  await admin.from("college_recruiting_needs").delete().eq("posted_by", key.userId)
  console.log("cleaned up")
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1) })

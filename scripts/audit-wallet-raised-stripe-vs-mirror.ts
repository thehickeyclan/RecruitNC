/**
 * Why a family's "Raised" can shrink after they've already spent against it.
 *
 * The wallet is Stripe-first: `getAthleteFundraisingWalletSnapshot` sums the Stripe Checkout list
 * (`loadCorrectedStripeDonationsForWalletLifetime`) and only falls back to the `spartan_donations`
 * mirror when Stripe is unavailable. That Stripe list is paginated with a hard page cap
 * (`RECRUITNC_STRIPE_WALLET_LIST_MAX_PAGES`, default 400 pages x 100 sessions). If the club's total
 * session count has grown past that cap, the OLDEST sessions fall off the end of the list — so Raised
 * silently drops for whoever's gifts are oldest, while Guild holds and reimbursements already taken
 * against the old, higher figure stay put. That reads as a family "over-drawing" when they never did.
 *
 * Run this WHERE STRIPE_SECRET_KEY IS SET (prod/staging env). It answers three things:
 *
 *   1. TRUNCATION — is the Stripe list cut off? Decisive test: compare the oldest session Stripe
 *      returned against the oldest paid row in the mirror. If Stripe's oldest is NEWER, gifts are
 *      being dropped off the end and every affected wallet is understating Raised.
 *   2. PER-ATHLETE DRIFT — Stripe Raised vs mirror Raised for each wallet, largest gap first.
 *   3. OVER-DRAWN — wallets where spend exceeds Raised under each source, so you can see whether a
 *      family stops being over-drawn once the mirror (which has no page cap) is used instead.
 *
 *   npx tsx scripts/audit-wallet-raised-stripe-vs-mirror.ts            # wallets with activity
 *   npx tsx scripts/audit-wallet-raised-stripe-vs-mirror.ts --all      # every athlete with a code
 *   npx tsx scripts/audit-wallet-raised-stripe-vs-mirror.ts --csv      # machine-readable
 *
 * Read-only — this writes nothing.
 */

import fs from "fs"
import path from "path"
import { createRequire } from "module"
import { fileURLToPath } from "url"

const req = createRequire(import.meta.url)
// `react.cache` and Next's `unstable_cache` only exist inside a Next request; stub them so the same
// libs the app uses can run in a plain node script.
const reactMod = req("react") as { cache?: <T>(fn: T) => T }
if (typeof reactMod.cache !== "function") reactMod.cache = (fn) => fn
const nextCache = req("next/cache") as { unstable_cache?: (fn: unknown) => unknown }
nextCache.unstable_cache = (fn) => fn

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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    if (!process.env[key]) process.env[key] = val.replace(/\r$/, "").trim()
  }
}
/**
 * `--env <file>` first, so a pulled production env (which has STRIPE_SECRET_KEY) wins over `.env.local`.
 * loadEnvFile never overwrites an already-set key, so order here is precedence.
 */
const envFlagIdx = process.argv.indexOf("--env")
if (envFlagIdx !== -1) {
  const rel = process.argv[envFlagIdx + 1]
  if (!rel) {
    console.error("--env needs a file path, e.g. --env .env.production.local")
    process.exit(1)
  }
  if (!fs.existsSync(path.join(root, rel)) && !fs.existsSync(rel)) {
    console.error(`--env file not found: ${rel}`)
    process.exit(1)
  }
  loadEnvFile(rel)
}
loadEnvFile(".env.local")
loadEnvFile(".env")

const usd = (c: number) => `$${(c / 100).toFixed(2)}`
const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s.padEnd(n))

async function main() {
  const all = process.argv.includes("--all")
  const csv = process.argv.includes("--csv")

  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    console.error("STRIPE_SECRET_KEY is not set — this audit only means something where Stripe is reachable.")
    console.error("Run it in the environment the app actually serves from.")
    process.exit(1)
  }

  const { createAdminClient } = await import("../lib/supabase/admin")
  const { getFundraisingAthleteEntries } = await import("../lib/spartan-fundraising-code")
  const { ledgerCodesForFundraisingWallet } = await import("../lib/fundraising/athlete-fundraising-profiles")
  const { getAthleteFundraisingWalletSnapshot, ATHLETE_PUBLIC_GIFTS_NO_ROW_CAP } = await import(
    "../lib/fundraising/athlete-public-stats"
  )
  const { loadCorrectedStripeDonationsForWalletLifetime } = await import(
    "../lib/fundraising/stripe-transparency-pipeline"
  )
  const { fetchGuildReservedCentsForAthleteIds } = await import("../lib/guild-credit-allocations")
  const { fetchReimbursementPaidCentsByAthleteIdAllTime } = await import("../lib/athlete-reimbursement-net")
  const admin = createAdminClient()

  // ---------------------------------------------------------------- 1. truncation
  console.log("Loading the Stripe Checkout list the wallet uses… (this is the slow part)\n")
  const stripeRows = await loadCorrectedStripeDonationsForWalletLifetime(null)
  if (stripeRows == null) {
    console.error("Stripe list came back null — the wallet is silently running on the mirror in this env.")
    process.exit(1)
  }

  const maxPages = Number(process.env.RECRUITNC_STRIPE_WALLET_LIST_MAX_PAGES) || 400
  const pageCapRows = maxPages * 100
  const stripeOldest = stripeRows.reduce<string | null>(
    (min, r) => (min == null || r.createdIso < min ? r.createdIso : min),
    null,
  )

  const { data: oldestMirror } = await admin
    .from("spartan_donations")
    .select("created_at, athlete_code, amount_cents")
    .eq("status", "paid")
    .order("created_at", { ascending: true })
    .limit(1)
  const mirrorOldest = (oldestMirror ?? [])[0] as { created_at?: string } | undefined

  console.log("=".repeat(78))
  console.log("1. IS THE STRIPE LIST TRUNCATED?")
  console.log("=".repeat(78))
  console.log(`  sessions returned by Stripe : ${stripeRows.length}`)
  console.log(`  page cap                    : ${maxPages} pages = ${pageCapRows} sessions`)
  console.log(`  oldest session from Stripe  : ${stripeOldest ?? "—"}`)
  console.log(`  oldest paid row in mirror   : ${mirrorOldest?.created_at ?? "—"}`)

  const hitCap = stripeRows.length >= pageCapRows
  const dropsOldGifts =
    !!stripeOldest && !!mirrorOldest?.created_at && new Date(stripeOldest) > new Date(mirrorOldest.created_at)

  if (dropsOldGifts) {
    console.log("\n  >>> CONFIRMED: Stripe's oldest session is NEWER than the oldest gift in the mirror.")
    console.log("      Gifts older than the cutoff are dropping out of every wallet's Raised.")
    console.log(`      Raise RECRUITNC_STRIPE_WALLET_LIST_MAX_PAGES (currently ${maxPages}) so the list reaches back further.`)
  } else if (hitCap) {
    console.log("\n  >>> WARNING: the list came back at or above the page cap, so it may be truncated.")
  } else {
    console.log("\n  >>> Not truncated: Stripe reaches back at least as far as the mirror.")
    console.log("      If wallets still disagree below, the cause is attribution, not pagination.")
  }

  // ---------------------------------------------------------------- which wallets
  const ids = new Set<string>()
  if (all) {
    for (const e of await getFundraisingAthleteEntries(admin)) {
      if (!e.id.startsWith("spartan-fundraising:")) ids.add(e.id)
    }
  } else {
    for (const t of ["guild_credit_allocations", "parent_athlete_links"] as const) {
      const { data } = await admin.from(t).select("athlete_id")
      for (const r of data ?? []) {
        const x = (r as { athlete_id?: string }).athlete_id
        if (x) ids.add(x)
      }
    }
    const { data: exp } = await admin.from("athlete_expense_requests").select("athlete_id").eq("status", "paid")
    for (const r of exp ?? []) {
      const x = (r as { athlete_id?: string }).athlete_id
      if (x) ids.add(x)
    }
  }
  const athleteIds = [...ids]

  const entries = await getFundraisingAthleteEntries(admin)
  const { data: nameRows } = await admin.from("athletes").select("id, name").in("id", athleteIds)
  const nameById = new Map((nameRows ?? []).map((r) => [String((r as { id: string }).id), String((r as { name?: string }).name ?? "—")]))
  const { data: profRows } = await admin
    .from("athlete_fundraising_profiles")
    .select("id, created_at, updated_at, athlete_id, slug, bio, photo_url, is_active, campaign_goal_cents, total_raised_cents, primary_fundraising_code, checkout_live")
    .in("athlete_id", athleteIds)
    .eq("is_active", true)
  const profByAthlete = new Map<string, unknown>()
  for (const p of profRows ?? []) profByAthlete.set(String((p as { athlete_id: string }).athlete_id), p)

  const guild = await fetchGuildReservedCentsForAthleteIds(admin, athleteIds)
  const reimb = await fetchReimbursementPaidCentsByAthleteIdAllTime(admin)

  // ---------------------------------------------------------------- 2 & 3. per athlete
  type Row = {
    name: string
    athleteId: string
    codes: string
    stripeRaised: number
    mirrorRaised: number
    spent: number
  }
  const rows: Row[] = []

  for (const id of athleteIds) {
    const profile = (profByAthlete.get(id) ?? null) as never
    const pinned = [
      (profByAthlete.get(id) as { primary_fundraising_code?: string | null } | undefined)?.primary_fundraising_code ?? "",
    ].filter(Boolean) as string[]
    const led = ledgerCodesForFundraisingWallet(profile, entries, id, pinned)
    if (led.ledgerCodes.length === 0) continue

    const opts = { mirrorFundraisingSlugs: led.mirrorFundraisingSlugs }
    // Same call the wallet makes: Stripe rows preloaded.
    const viaStripe = await getAthleteFundraisingWalletSnapshot(led.ledgerCodes, ATHLETE_PUBLIC_GIFTS_NO_ROW_CAP, {
      ...opts,
      preloadedStripeLifetimeRows: stripeRows,
    })
    // Passing null for the Stripe rows forces the mirror branch — no page cap there.
    const viaMirror = await getAthleteFundraisingWalletSnapshot(led.ledgerCodes, ATHLETE_PUBLIC_GIFTS_NO_ROW_CAP, {
      ...opts,
      preloadedStripeLifetimeRows: null,
    })

    rows.push({
      name: nameById.get(id) ?? "—",
      athleteId: id,
      codes: led.ledgerCodes.join(" "),
      stripeRaised: viaStripe?.stats.raisedCents ?? 0,
      mirrorRaised: viaMirror?.stats.raisedCents ?? 0,
      spent: (guild.get(id) ?? 0) + (reimb.get(id) ?? 0),
    })
  }

  if (csv) {
    console.log("\nname,athlete_id,codes,stripe_raised_cents,mirror_raised_cents,diff_cents,spent_cents,overdrawn_stripe_cents,overdrawn_mirror_cents")
    for (const r of rows) {
      console.log(
        [r.name, r.athleteId, `"${r.codes}"`, r.stripeRaised, r.mirrorRaised, r.stripeRaised - r.mirrorRaised, r.spent,
          Math.max(0, r.spent - r.stripeRaised), Math.max(0, r.spent - r.mirrorRaised)].join(","),
      )
    }
    return
  }

  const drift = rows.filter((r) => r.stripeRaised !== r.mirrorRaised)
    .sort((a, b) => Math.abs(b.stripeRaised - b.mirrorRaised) - Math.abs(a.stripeRaised - a.mirrorRaised))

  console.log(`\n${"=".repeat(78)}`)
  console.log("2. WHERE STRIPE AND THE MIRROR DISAGREE ON RAISED")
  console.log("=".repeat(78))
  if (drift.length === 0) {
    console.log("  None — both sources agree on every wallet checked.")
  } else {
    console.log(`  ${pad("athlete", 22)}${"stripe".padStart(11)}${"mirror".padStart(11)}${"diff".padStart(11)}   codes`)
    for (const r of drift) {
      const d = r.stripeRaised - r.mirrorRaised
      console.log(`  ${pad(r.name, 22)}${usd(r.stripeRaised).padStart(11)}${usd(r.mirrorRaised).padStart(11)}${(d > 0 ? "+" : "") + usd(d).padStart(10)}   ${r.codes}`)
    }
    console.log(`\n  ${drift.length} of ${rows.length} wallets disagree. A negative diff = Stripe is missing gifts the mirror has.`)
  }

  const over = rows.filter((r) => r.spent > r.stripeRaised || r.spent > r.mirrorRaised)
    .sort((a, b) => (b.spent - b.stripeRaised) - (a.spent - a.stripeRaised))

  console.log(`\n${"=".repeat(78)}`)
  console.log("3. WALLETS WHERE SPEND EXCEEDS RAISED")
  console.log("=".repeat(78))
  if (over.length === 0) {
    console.log("  None — every wallet's spend is covered under both sources.")
  } else {
    console.log(`  ${pad("athlete", 22)}${"spent".padStart(11)}${"vs stripe".padStart(12)}${"vs mirror".padStart(12)}`)
    for (const r of over) {
      const os = Math.max(0, r.spent - r.stripeRaised)
      const om = Math.max(0, r.spent - r.mirrorRaised)
      console.log(`  ${pad(r.name, 22)}${usd(r.spent).padStart(11)}${(os > 0 ? "-" + usd(os) : "ok").padStart(12)}${(om > 0 ? "-" + usd(om) : "ok").padStart(12)}`)
    }
    const fixedByMirror = over.filter((r) => r.spent > r.stripeRaised && r.spent <= r.mirrorRaised).length
    if (fixedByMirror > 0) {
      console.log(`\n  >>> ${fixedByMirror} wallet(s) are over-drawn against Stripe but FINE against the mirror.`)
      console.log("      Those families did not overspend — the Stripe list is missing their gifts.")
    }
  }
  console.log("")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

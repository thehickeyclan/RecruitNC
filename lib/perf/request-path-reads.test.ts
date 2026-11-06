/**
 * Exhaustive paging belongs in a script, not in a request.
 *
 * Written 6 November 2026, after a performance review found `/api/athletes/[id]/matches` reading
 * the whole `matches` table on nearly every profile view - a count(*) plus one page per thousand
 * rows, uncached, to answer a question about one wrestler. It was not rare: the profile falls back
 * to that route whenever `matches-direct` returns no seasons, and the table held 5,588 rows for
 * 24,776 profiles, so most views took the fallback and paid seven queries to find nothing.
 *
 * That is the shape that starves a connection pool, and releasing more profiles makes it worse,
 * not better. A script may read a whole table; a request handler answers for one wrestler, one
 * page or one coach, and its cost must not grow with the size of the platform.
 *
 * The test is deliberately crude - it reads source text, like the recruiting-blue stylesheet test
 * next door - because the thing worth catching is crude: a `for (;;)` or `while (hasMore)` loop
 * around a `.range()` in a file that serves requests. ALLOWED is the list of files that do it
 * today and why. Adding to that list should feel like a decision, which is the whole point.
 */
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = path.resolve(__dirname, "..", "..")

/** Files that page exhaustively in a request path today, each with the reason it is tolerable. */
const ALLOWED: Record<string, string> = {
  // Admin screens and admin APIs: a handful of staff, not a public surface.
  "app/admin": "admin screens - staff only, not public traffic",
  "app/api/admin": "admin APIs - staff only, not public traffic",
  // Client components that page OUR OWN API rather than the database.
  "app/prospects/all/prospects-all-client.tsx": "pages /api/prospects, which is limit-capped at 500",
  // Known debts, measured 6 Nov 2026. Each is a real risk, tracked, not pretended away.
  "app/schools/page.tsx":
    "DEBT: a \"use client\" page querying PostgREST with the anon key, ~25-30k rows per visitor, " +
    "public and uncached. The largest standing pool risk on the platform - needs a server " +
    "component with revalidate, or a precomputed snapshot like the placer index.",
  "app/nhsca/archive/page.tsx": "DEBT: public archive page, pages a results table client-side",
  "app/nchsaa/[year]/year-results-client.tsx": "DEBT: one season's results, bounded by year",
  "app/api/ai/chat/route.ts": "DEBT: Data Dawg's own retrieval; bounded per question, worth a look",
  "lib/profile-backfill.ts": "a backfill, invoked deliberately rather than per request",
  "lib/admin-messaging-recipients.ts": "builds an admin send list",
  // Found by this test on the day it was written; each one scopes its reads with .eq/.in, so the
  // paging is bounded by a state, a class, a year or an athlete rather than by table size.
  "lib/prospects-directory.ts": "fetchProspectDirectoryAll pages one state and class year, and now throws rather than truncating",
  "lib/state-placers.ts": "scoped by state and season",
  "lib/rankings/recruitnc-ranking-engine.ts": "scoped by state, class and gender when it builds a board",
  "lib/data-dawg-agent-v2/tournament-results-by-year.ts": "scoped by event and year for one answer",
  "lib/fundraising/hub-data.ts": "scoped to one fundraising hub",
  "lib/admin-digital-wallet-ledger.ts": "admin ledger - staff only",
  "lib/admin-fundraising-athlete-matrix.ts": "admin matrix - staff only",
  "lib/spartan-fundraising-code.ts": "archived Spartan fundraising; scoped by code",
}

const PAGING = /for \(;;\)|while \(hasMore\)|while \(true\)/
const RANGED = /\.range\(/

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue
      walk(rel, out)
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(rel)
    }
  }
  return out
}

const allowed = (rel: string) => Object.keys(ALLOWED).some((k) => rel === k || rel.startsWith(`${k}/`))

describe("request paths do not read whole tables", () => {
  const offenders = walk("app")
    .concat(walk("lib"))
    .filter((rel) => {
      if (allowed(rel)) return false
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8")
      return PAGING.test(src) && RANGED.test(src)
    })

  it("finds no new exhaustive paging outside the allowed list", () => {
    expect(offenders, `page in a script, or add the file to ALLOWED with a reason:\n${offenders.join("\n")}`).toEqual([])
  })

  it("keeps the matches route scoped to one wrestler", () => {
    const src = fs.readFileSync(path.join(ROOT, "app/api/athletes/[id]/matches/route.ts"), "utf8")
    // Every read of `matches` here must be narrowed - by the athlete, or by surname for the dozen
    // rows that carry no athlete_id. An unscoped select is what this whole file is about.
    for (const call of src.split('.from("matches")').slice(1)) {
      const statement = call.split("\n\n")[0]
      expect(
        /\.eq\("athlete_id"|\.ilike\("last_name"/.test(statement),
        `an unscoped read of "matches" crept back in:\n${statement.slice(0, 200)}`,
      ).toBe(true)
    }
  })

  it("documents why every allowed file is allowed", () => {
    for (const [file, reason] of Object.entries(ALLOWED)) {
      expect(reason.trim().length, `${file} needs a reason`).toBeGreaterThan(20)
    }
  })
})

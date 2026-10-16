/**
 * The post-tournament report for a college coach's starred wrestlers (lib/coach-event-report.ts).
 *
 * Dry run by default: writes the email as an HTML preview (and the computed report beside it as
 * JSON) and sends nothing. Read-only against the database either way.
 *
 *   npx tsx --env-file=.env.local scripts/coach-event-report.ts --event journeymen-fall-classic-2026 \
 *     --coach coach@school.edu --out /tmp/report.html
 *   npx tsx --env-file=.env.local scripts/coach-event-report.ts --event super32-2025 \
 *     --athletes <id>,<id> --out /tmp/report.html
 *
 * An event not in REPORT_EVENTS (Super 32 2026, once imported) is named by what was imported:
 *   --event-key super32-2026 --source-file <file.csv>[,<file.csv>] --event-name "2026 Super 32"
 *   [--event-date 2026-10-24] [--format single-bracket|tiered]
 *
 * Sending is a separate, explicit step: add --send with --coach. It only ever sends to a college
 * coach (classifyViewer), never to an address that unsubscribed, and only notable losses the
 * profile would show that coach.
 *
 * Other options: --athletes-file <ids.txt> (comma or newline separated), --no-profile-check (skip the profile cross-check, faster), --concurrency N.
 */
import fs from "fs"
import path from "path"
import { createRequire } from "module"
import { createClient } from "@supabase/supabase-js"

// Some lib modules import "server-only", which throws outside a React server render. Pre-seed the
// module cache so the script runs the real code paths (as scripts/verify-toc-public-field.ts does).
const req = createRequire(import.meta.url)
const soPath = req.resolve("server-only")
;(req as unknown as { cache: Record<string, unknown> }).cache[soPath] = {
  id: soPath,
  filename: soPath,
  loaded: true,
  exports: {},
  children: [],
  paths: [],
}

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1]!.startsWith("--") ? process.argv[i + 1]! : null
}
const flag = (name: string) => process.argv.includes(`--${name}`)

async function main() {
  const started = Date.now()
  // Profiles read results through result_athlete_links in production; read them the same way.
  if (process.env.RESULT_LINKS_READ == null) process.env.RESULT_LINKS_READ = "1"

  const report = await import("../lib/coach-event-report")
  const load = await import("../lib/coach-event-report-load")
  const { loadSignificantOpponentIndex } = await import("../lib/significant-opponent-index")
  const { classifyViewer, maySeeNotableLosses } = await import("../lib/viewer-role")
  const { buildAdminBlastEmailHtml } = await import("../lib/admin-blast-email-html")

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  // The event: a known key, or named by its import.
  let event = report.REPORT_EVENTS[arg("event") ?? ""] ?? null
  if (!event && arg("event-key")) {
    const files = (arg("source-file") ?? "").split(",").map((s) => s.trim()).filter(Boolean)
    if (!files.length) throw new Error("--event-key needs --source-file: an event is identified by its import, never its name")
    event = {
      key: arg("event-key")!,
      name: arg("event-name") ?? arg("event-key")!,
      date: arg("event-date") ?? "",
      format: arg("format") === "tiered" ? "tiered" : "single-bracket",
      sources: [{ eventKey: arg("event-key")!, sourceFiles: files, placementsCount: true }],
    }
  }
  if (!event) throw new Error(`Unknown event. Known: ${Object.keys(report.REPORT_EVENTS).join(", ")}; or pass --event-key and --source-file`)

  const out = arg("out")
  if (!out) throw new Error("--out <file.html> is required")
  const send = flag("send")

  // Who it is for.
  const coachEmail = arg("coach")
  const coach = coachEmail ? await load.loadCoachByEmail(admin, coachEmail) : null
  if (coachEmail && !coach) throw new Error(`No user_profiles row for ${coachEmail}`)
  const viewer = coach ? classifyViewer(coach) : null
  if (send && (!coach || !viewer?.isCollegeCoach)) {
    throw new Error(`--send refused: ${coachEmail ?? "no --coach"} is not a college coach (role ${viewer?.role ?? "none"})`)
  }
  // Notable losses are coach-only: shown exactly when the profile would show them to this person.
  // A preview with no coach is for staff, who see them.
  const lossesVisible = coach ? maySeeNotableLosses(coach) : true

  const listed = arg("athletes-file") ? fs.readFileSync(arg("athletes-file")!, "utf8") : (arg("athletes") ?? "")
  let athleteIds = [...new Set(listed.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean))]
  if (!athleteIds.length && coach) athleteIds = await load.loadStarredAthleteIds(admin, coach.userId)
  if (!athleteIds.length) throw new Error("No athletes: pass --athletes or a --coach with starred wrestlers")

  console.log(`Event ${event.key} (${event.sources.map((s) => `${s.eventKey}:${s.sourceFiles.join("+")}`).join(", ")})`)
  if (coach) console.log(`Coach ${coach.email} - role ${viewer!.role}, college coach ${viewer!.isCollegeCoach}, notable losses ${lossesVisible}`)
  console.log(`${athleteIds.length} athletes`)

  const [field, index, loaded] = await Promise.all([
    load.loadEventField(admin, event),
    loadSignificantOpponentIndex(admin),
    load.loadReportAthletes(admin, event, athleteIds, {
      profileCheck: !flag("no-profile-check"),
      concurrency: Number(arg("concurrency")) || 8,
    }),
  ])
  if (field.length === 0) throw new Error(`No bouts on file for ${event.key} at those source files`)
  if (loaded.missing.length) console.warn(`No athlete row for: ${loaded.missing.join(", ")}`)

  const reports = report.buildEventReport({ event, athletes: loaded.athletes, field, index, lossesVisible })

  // What the profile shows beside what the brackets say.
  const byId = new Map(loaded.athletes.map((a) => [a.id, a]))
  console.log("")
  for (const r of reports) {
    const a = byId.get(r.athleteId)!
    // "4th All-American", "6", "DNP": the number is the place; no number is no place.
    const shown = a.profilePlacement ?? "-"
    const shownPlace = Number(/^(\d+)/.exec(shown)?.[1] ?? NaN) || (/champ/i.test(shown) ? 1 : null)
    const disagree =
      shownPlace !== r.place || (r.competed && a.profileRecord != null && a.profileRecord !== `${r.record.wins}-${r.record.losses}`)
    console.log(
      [
        r.name.padEnd(24),
        r.competed ? "competed" : "DNC     ",
        `place ${r.placement ?? "-"}`.padEnd(16),
        `${r.record.wins}-${r.record.losses}`.padEnd(6),
        `wt ${r.weight ?? "-"}`.padEnd(10),
        `sig ${r.significantWins.length} loss ${r.notableLosses.length}`.padEnd(14),
        `profile ${shown}${a.profileRecord ? ` (${a.profileRecord})` : ""}`,
        disagree ? "  << differs from profile" : "",
        r.unverifiedBouts ? `  !! ${r.unverifiedBouts} linked bouts not on the profile: held back` : "",
        r.opponentSideOnly ? `  !! ${r.opponentSideOnly} bouts only on the opponent's row: record may be short` : "",
        r.placementNote ? `  [${r.placementNote}]` : "",
      ].join(" "),
    )
  }

  const email = report.renderCoachEventReportEmail({ event, coachName: coach?.name ?? null, reports })
  const footer = "RecruitNC · computed from the brackets we hold"
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true })
  fs.writeFileSync(out, buildAdminBlastEmailHtml(email.subject, email.bodyHtml, report.PROFILE_BASE_URL, "recruitnc", footer))
  fs.writeFileSync(out.replace(/\.html?$/i, "") + ".json", JSON.stringify({ event, coach: coach?.email ?? null, reports }, null, 2))
  console.log(`\nSubject: ${email.subject}\nPreview: ${path.resolve(out)}\nTook ${((Date.now() - started) / 1000).toFixed(1)}s`)

  if (!send) {
    console.log("Dry run: nothing sent.")
    return
  }
  const { filterUnsubscribed, unsubscribeFooterHtml, unsubscribeHeaders, unsubscribeUrl } = await import("../lib/email-unsubscribe")
  const { sendAdminBlastEmail } = await import("../lib/email")
  const { allowed } = await filterUnsubscribed(admin, [coach!.email])
  if (!allowed.length) {
    console.log(`${coach!.email} has unsubscribed; not sent.`)
    return
  }
  const unsub = unsubscribeUrl(report.PROFILE_BASE_URL, coach!.email)
  const result = await sendAdminBlastEmail(coach!.email, email.subject, email.bodyHtml + unsubscribeFooterHtml(unsub), "recruitnc", {
    footer,
    headers: unsubscribeHeaders(unsub),
  })
  console.log(result.success ? `Sent to ${coach!.email} (${result.resendMessageId ?? "no id"})` : `Send failed: ${result.error}`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})

/**
 * "Your Super 32 report is ready" to every signed-up men's college coach (Matt, 26 Oct 2026),
 * personalised with the wrestlers their staff starred (lib/coach-welcome-email.ts
 * renderCoachReportReadyEmail). Women's programs are left out: their report is separate.
 *
 * Dry run by default: writes every coach's email as HTML to --out <dir> and a summary list, and sends
 * nothing. Sending is explicit and only after Matt approves the previews:
 *
 *   npx tsx --env-file=.env.local scripts/coach-report-ready-email.ts --out /tmp/report-ready
 *   npx tsx --env-file=.env.local scripts/coach-report-ready-email.ts --out /tmp/report-ready --send
 *   ... --only coach@school.edu   (one coach, for a test send to yourself use --to you@x.com)
 *
 * Skips: unverified accounts, women's programs, unsubscribed addresses, anyone already sent (logged in
 * <out>/sent.json, so a re-run never doubles up).
 */
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
const req = createRequire(import.meta.url)
const so = req.resolve("server-only")
;(req as unknown as { cache: Record<string, unknown> }).cache[so] = { id: so, filename: so, loaded: true, exports: {}, children: [], paths: [] }
import { createClient } from "@supabase/supabase-js"

const argv = process.argv.slice(2)
const arg = (k: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined }
const flag = (k: string) => argv.includes(`--${k}`)

async function main() {
  const { classifyViewer } = await import("../lib/viewer-role")
  const { COACH_REPORTS, loadCoachReportFile, resolveCoachReportViewer } = await import("../lib/coach-reports")
  const { renderCoachReportReadyEmail, renderCoachReportReadyLetter, coachReportReadyText } = await import("../lib/coach-welcome-email")
  // --letter sends the plain letter instead of the designed email (see renderCoachReportReadyLetter).
  const asLetter = flag("letter")
  const { latestSnapshot } = await import("../lib/super32-live/snapshot")
  const { coachProgramOf } = await import("../lib/recruiting/coach-program")

  const out = arg("out")
  if (!out) throw new Error("--out <dir> is required")
  fs.mkdirSync(out, { recursive: true })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

  const def = COACH_REPORTS.find((d) => d.slug === "super32-2026-mens")!
  const file = loadCoachReportFile(def)
  const snap = await latestSnapshot(admin as never, def.eventKey, true)
  const entrant = new Map((snap?.data.entrants ?? []).filter((e) => e.athleteId).map((e) => [e.athleteId!, e]))
  const mens = file.reports.filter((r) => r.competed && entrant.get(r.athleteId)?.gender !== "girls" && !/^f/i.test(r.gender ?? ""))
  const ord = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`
  const lineFor = (r: (typeof mens)[number]) => {
    const e = entrant.get(r.athleteId)
    const seeds = (e?.bouts ?? []).filter((b) => b.win && b.opponentSeed && !/for/i.test(b.winType)).map((b) => b.opponentSeed!).sort((a, b) => a - b)
    const place = r.place ?? e?.placement ?? null
    return [
      r.weight ? `${r.weight} lbs` : null,
      r.school,
      `${r.record.wins}-${r.record.losses}`,
      place ? `${ord(place)} place, All-American` : null,
      seeds.length ? `beat the ${seeds.map((s) => `#${s}`).join(", ")} seed${seeds.length > 1 ? "s" : ""}` : null,
    ].filter(Boolean).join(" · ")
  }

  const { data: profiles } = await admin.from("user_profiles").select("user_id, email, full_name, first_name, last_name, role, profile_type, verified_coach, verification_status, is_admin").eq("verified_coach", true)
  const coaches = (profiles ?? []).filter((p) => classifyViewer(p as never).isCollegeCoach && p.email && !p.is_admin)
  const only = arg("only")?.toLowerCase()

  const { filterUnsubscribed, unsubscribeHeaders, unsubscribeUrl } = await import("../lib/email-unsubscribe")
  const { allowed } = await filterUnsubscribed(admin as never, coaches.map((c) => String(c.email)))
  const allowedSet = new Set(allowed.map((e) => e.toLowerCase()))
  const sentPath = path.join(out, "sent.json")
  const sent: Record<string, string> = fs.existsSync(sentPath) ? JSON.parse(fs.readFileSync(sentPath, "utf8")) : {}

  const rows: string[] = ["email,program,coach_program,recruits,subject,status"]
  const list: Array<{ email: string; subject: string; html: string; text: string; unsub: string }> = []
  let womens = 0
  for (const c of coaches) {
    const email = String(c.email).toLowerCase()
    if (only && email !== only) continue
    const prog = await admin.auth.admin.getUserById(c.user_id).then((r) => coachProgramOf(r.data?.user), () => null)
    if (prog === "womens") { womens++; continue }
    const viewer = await resolveCoachReportViewer(admin as never, c.user_id)
    if (viewer.access !== "ok") continue
    const recruits = mens.filter((r) => viewer.starred.has(r.athleteId)).map((r) => ({ name: r.name, line: lineFor(r) }))
    const name = (c.full_name as string | null) || [c.first_name, c.last_name].filter(Boolean).join(" ") || null
    // A test send (--to) carries the tester's own unsubscribe link, never the coach's.
    const testTo = arg("to")?.split(",")[0]?.trim()
    const unsub = unsubscribeUrl("https://app.ncwrestlingunited.com", testTo ?? email)
    const input = { coachName: name, coachEmail: email, program: viewer.program, programLogo: viewer.programLogo, wrestlers: mens.length, recruits, unsubscribeUrl: unsub }
    const mail = asLetter ? renderCoachReportReadyLetter(input) : { ...renderCoachReportReadyEmail(input), text: coachReportReadyText(input) }
    const status = !allowedSet.has(email) ? "unsubscribed" : sent[email] ? "already sent" : "to send"
    fs.writeFileSync(path.join(out, `${email.replace(/[^a-z0-9@._-]/g, "_")}.html`), mail.html)
    rows.push([email, `"${viewer.program ?? ""}"`, prog ?? "none", recruits.length, `"${mail.subject.replace(/"/g, "'")}"`, status].join(","))
    if (status === "to send") list.push({ email, subject: mail.subject, html: mail.html, text: mail.text, unsub })
  }
  fs.writeFileSync(path.join(out, "list.csv"), rows.join("\n"))
  const withStars = rows.slice(1).filter((r) => Number(r.split(",")[3]) > 0).length
  console.log(`Coaches: ${rows.length - 1} men's/both/unset (${womens} women's left out) · ${withStars} with starred recruits · to send: ${list.length}`)
  console.log(`Previews: ${path.resolve(out)}`)

  if (!flag("send")) { console.log("Dry run: nothing sent."); return }
  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)
  const to = arg("to")
  // A test goes to each tester separately, as each coach would receive it.
  const recipients = (m: { email: string }) => (to ? to.split(",").map((t) => t.trim()) : [m.email])
  // --batch N --pause S: N coaches, then a pause of S seconds, so the send is spread out.
  const batch = Number(arg("batch")) || 0
  const pause = (Number(arg("pause")) || 180) * 1000
  let done = 0
  for (const m of list) {
    if (batch && done > 0 && done % batch === 0) {
      console.log(`batch done (${done} sent); pausing ${pause / 1000}s`)
      await new Promise((r) => setTimeout(r, pause))
    }
    done++
    for (const rcpt of recipients(m)) {
      const unsubFor = to ? unsubscribeUrl("https://app.ncwrestlingunited.com", rcpt) : m.unsub
      const res = await resend.emails.send({
        // The letter goes out as Matt alone, as the Oct 17 invite letter did (it landed in Primary).
        from: asLetter ? "Matt Hickey <info@ncwrestlingunited.com>" : "Matt Hickey · RecruitNC <info@ncwrestlingunited.com>",
        to: [rcpt],
        replyTo: "info@ncwrestlingunited.com",
        subject: m.subject,
        html: m.html.split(m.unsub).join(unsubFor),
        text: m.text.split(m.unsub).join(unsubFor),
        headers: unsubscribeHeaders(unsubFor),
      })
      if (res.error) { console.log(`FAILED ${rcpt}: ${res.error.message}`); continue }
      console.log(`sent ${to ? `test (${m.email}'s email) to ` : ""}${rcpt}`)
      await new Promise((r) => setTimeout(r, 600))
    }
    if (!to) { sent[m.email] = new Date().toISOString(); fs.writeFileSync(sentPath, JSON.stringify(sent, null, 1)) }
  }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })

/**
 * Invitation to college coaches who have not signed up (lib/coach-welcome-email.ts, renderCoachInviteEmail).
 *
 *   npx tsx --env-file=.env.local scripts/coach-invite-email.ts                     dry run: list + preview
 *   ... --test-to you@example.com                                                  one copy to that address
 *   ... --send [--limit 150]                                                       the next N on the list
 *
 * Recipients: the college coach directory (toc_college_coaches), one per email, valid addresses only,
 * not already a user, not opted out, not unsubscribed, not already invited. Sends are logged to
 * ranking-snapshots/coach-invite-sent.json and never repeated, so a batch can be resumed.
 */
import fs from "fs"
import { createRequire } from "module"
import { createClient } from "@supabase/supabase-js"

const req = createRequire(import.meta.url)
req.cache[req.resolve("server-only")] = { exports: {} } as never

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : undefined }
const flag = (n: string) => process.argv.includes(`--${n}`)
const LOG = "ranking-snapshots/coach-invite-sent.json"
const PREVIEW = arg("out") ?? "ranking-snapshots/coach-invite-preview.html"
const REPLY_TO = arg("reply-to") ?? "info@ncwrestlingunited.com"
const INTERNAL = /ncwrestlingunited|thehickeyclan|testcoach|@example\.com$|^test@/i

async function main() {
  const { renderCoachInviteEmail, renderCoachInviteLetter } = await import("../lib/coach-welcome-email")
  // --letter: the plain personal letter (lands in the inbox); otherwise the designed email.
  const asLetter = flag("letter")
  const { filterUnsubscribed, unsubscribeHeaders, unsubscribeUrl } = await import("../lib/email-unsubscribe")
  const { programLogo } = await import("../lib/coach-program-logo")
  const { mapSchoolIdFor } = await import("../lib/college-programs/load")
  const programData = (await import("../lib/college-programs/programs-2026-27.json")).default as { schools: Array<{ id: string; name: string; programs: Array<{ division: string }> }> }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

  // Platform totals, counted the way the welcome email counts them.
  const { data: signed } = await admin
    .from("user_profiles")
    .select("email, institution, school_id, verified_coach, verification_status, is_admin")
    .in("role", ["college_coach", "college-coach"])
  const onPlatform = (signed ?? []).filter((c) => c.email && !INTERNAL.test(c.email) && c.is_admin !== true && c.verified_coach === true && c.verification_status !== "rejected")
  const { data: sch } = await admin.from("schools").select("id, name").in("id", [...new Set(onPlatform.map((c) => c.school_id).filter(Boolean))])
  const progName = (c: (typeof onPlatform)[number]) => String(sch?.find((s) => s.id === c.school_id)?.name ?? c.institution ?? "")
  const key = (n: string) => n.replace(/\s*\(.*?\)\s*/g, " ").replace(/^the\s+/i, "").replace(/university of /i, "").replace(/ university| college/gi, "").trim().toLowerCase()
  const programs = new Set(onPlatform.map((c) => key(progName(c))).filter(Boolean)).size
  const norm = (x: string) => x.toLowerCase().replace(/\(.*?\)/g, "").replace(/&/g, "and").replace(/\b(the|university|college|of|at)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim()
  const KNOWN_LEVEL: Record<string, string> = { "slippery rock university": "NCAA Division II" }
  const levelOf = new Map<string, string>()
  for (const c of onPlatform) {
    const name = progName(c)
    const id = mapSchoolIdFor(name)
    const hit = programData.schools.find((x) => x.id === id) ?? programData.schools.find((x) => norm(x.name) === norm(name))
    const level = hit?.programs[0]?.division ?? KNOWN_LEVEL[name.trim().toLowerCase()]
    if (level) levelOf.set(hit?.id ?? name.toLowerCase(), level)
  }
  const n = (d: string) => [...levelOf.values()].filter((v) => v === d).length
  const divisions: Array<[string, number]> = [["DI", n("NCAA Division I")], ["DII", n("NCAA Division II")], ["DIII", n("NCAA Division III")], ["NAIA", n("NAIA")], ["NJCAA", n("NJCAA")]]

  // Who to invite.
  const users: Array<{ email: string | null }> = []
  for (let f = 0; ; f += 1000) {
    const { data } = await admin.from("user_profiles").select("email").range(f, f + 999)
    users.push(...((data ?? []) as never[])); if (!data || data.length < 1000) break
  }
  const isUser = new Set(users.map((u) => String(u.email ?? "").toLowerCase().trim()))
  // --from-csv: a staff list (email,name,program,division,title), e.g. Matt's men's coaches sheet of 17 Oct 2026.
  // Otherwise the college coach directory table.
  const csvPath = arg("from-csv")
  const parseCsv = (text: string) => {
    const [head, ...lines] = text.trim().split(/\r?\n/)
    const cols = head!.split(",")
    return lines.map((line) => {
      const cells: string[] = []; let cur = ""; let q = false
      for (const ch of line) { if (ch === '"') q = !q; else if (ch === "," && !q) { cells.push(cur); cur = "" } else cur += ch }
      cells.push(cur)
      return Object.fromEntries(cols.map((c, i) => [c, cells[i] ?? ""]))
    })
  }
  const dir = csvPath
    ? parseCsv(fs.readFileSync(csvPath, "utf8")).map((r) => ({ coach_name: r.name, college_program: r.program, email: r.email, division: r.division, title: r.title, opted_out: false }))
    : (await admin.from("toc_college_coaches").select("coach_name, college_program, email, division, title, opted_out").limit(5000)).data
  const seen = new Set<string>()
  const candidates = (dir ?? []).filter((r) => {
    const e = String(r.email ?? "").toLowerCase().trim()
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e) || INTERNAL.test(e) || seen.has(e) || isUser.has(e) || r.opted_out) return false
    seen.add(e)
    return true
  })
  const { allowed } = await filterUnsubscribed(admin, candidates.map((c) => String(c.email).toLowerCase().trim()))
  const ok = new Set(allowed.map((e: string) => e.toLowerCase()))
  const sent: Record<string, string> = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, "utf8")) : {}
  const list = candidates.filter((c) => ok.has(String(c.email).toLowerCase().trim()) && !sent[String(c.email).toLowerCase().trim()])

  const logoFor = async (program: string | null) => (program ? ((await programLogo({ name: program, logo_url: null }).catch(() => ({ url: null }))).url ?? null) : null)
  const render = async (c: (typeof list)[number] | null, unsub: string | null): Promise<{ subject: string; html: string; text?: string }> =>
    (asLetter ? renderCoachInviteLetter : renderCoachInviteEmail)({
      coachName: c?.coach_name ?? null,
      coachEmail: c?.email ?? null,
      program: c?.college_program ?? null,
      programLogo: await logoFor(c?.college_program ?? null),
      coaches: onPlatform.length,
      programs,
      divisions,
      unsubscribeUrl: unsub,
      senderPhone: arg("phone") ?? "(631) 662-5409",
    })

  console.log(`On the platform: ${onPlatform.length} coaches, ${programs} programs (${divisions.map(([d, k]) => `${k} ${d}`).join(" · ")})`)
  console.log(`${csvPath ? `List ${csvPath}` : "Directory"}: ${dir?.length ?? 0} rows | invitable: ${candidates.length} | unsubscribed: ${candidates.length - ok.size} | already invited: ${Object.keys(sent).length} | to send: ${list.length}`)
  const sample = list.find((c) => /asu\.edu$/i.test(String(c.email))) ?? list[0] ?? null
  fs.writeFileSync(PREVIEW, (await render(sample, null)).html)
  fs.writeFileSync(PREVIEW.replace(/\.html$/, "-list.csv"), "email,name,program,division,title\n" + list.map((c) => `${c.email},"${c.coach_name ?? ""}","${c.college_program ?? ""}","${c.division ?? ""}","${c.title ?? ""}"`).join("\n"))
  console.log(`Preview (${sample?.email ?? "generic"}): ${PREVIEW}`)

  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)
  const send = async (to: string, c: (typeof list)[number] | null) => {
    const unsub = unsubscribeUrl("https://app.ncwrestlingunited.com", to)
    const email = await render(c, unsub)
    return resend.emails.send({ from: asLetter ? "Matt Hickey <info@ncwrestlingunited.com>" : "Matt Hickey · RecruitNC <info@ncwrestlingunited.com>", to: [to], replyTo: REPLY_TO, subject: email.subject, html: email.html, ...(email.text ? { text: email.text } : {}), headers: unsubscribeHeaders(unsub) })
  }
  const testTo = arg("test-to")
  if (testTo) { const r = await send(testTo, sample); console.log(r.error ? `Test failed: ${r.error.message}` : `Test sent to ${testTo}`); return }
  if (!flag("send")) { console.log("Dry run: nothing sent."); return }
  const limit = Number(arg("limit")) || list.length
  for (const c of list.slice(0, limit)) {
    const to = String(c.email).trim()
    const r = await send(to, c)
    if (r.error) { console.log(`FAILED ${to}: ${r.error.message}`); continue }
    sent[to.toLowerCase()] = new Date().toISOString()
    fs.writeFileSync(LOG, JSON.stringify(sent, null, 1))
    console.log(`sent ${to}`)
    await new Promise((res) => setTimeout(res, 700))
  }
  console.log(`Done: ${Object.keys(sent).length} invited in total.`)
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })

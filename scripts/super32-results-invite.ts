/**
 * "Super 32 results for North Carolina are in" to college coaches who are NOT on the platform
 * (lib/coach-welcome-email.ts renderSuper32ResultsInviteLetter; Matt, 26 Oct 2026).
 *
 * Audience: men's coaches only (Matt): --from-csv, the men's rows of college-wrestling-staff-2026.xlsx
 * (email,name,program,division,title; the workbook's Program column says Men's or Women's), one per
 * address. Left off: anyone with an account,
 * opted out, unsubscribed, on --exclude (coaches who replied to Matt), or already sent this email
 * (its own log, so it can resume). Dry run by default.
 *
 *   npx tsx --env-file=.env.local scripts/super32-results-invite.ts --exclude <file> [--to a@x,b@y] [--send --batch 50 --pause 180]
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
const SNAP = arg("snapshots") ?? "ranking-snapshots"
// --womens: the women's letter (girls recap) to the women's staff list, with its own send log.
const WOMENS = flag("womens")
const LOG = path.join(SNAP, WOMENS ? "super32-womens-invite-sent.json" : "super32-results-invite-sent.json")
const INTERNAL = /ncwrestlingunited|thehickeyclan|recruitwrestlers|wrestlingguild|testcoach|@example\.com$|^test@/i

async function main() {
  const emails = await import("../lib/coach-welcome-email")
  const renderSuper32ResultsInviteLetter = WOMENS ? emails.renderSuper32WomensInviteLetter : emails.renderSuper32ResultsInviteLetter
  const { filterUnsubscribed, unsubscribeHeaders, unsubscribeUrl } = await import("../lib/email-unsubscribe")
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

  // Coaches and programs on the platform, as the invite counts them.
  const { data: signed } = await admin.from("user_profiles").select("email, institution, school_id, verified_coach, verification_status, is_admin").in("role", ["college_coach", "college-coach"])
  const onPlatform = (signed ?? []).filter((c) => c.email && !INTERNAL.test(c.email) && c.is_admin !== true && c.verified_coach === true && c.verification_status !== "rejected")
  const { data: sch } = await admin.from("schools").select("id, name").in("id", [...new Set(onPlatform.map((c) => c.school_id).filter(Boolean))])
  const key = (n: string) => n.replace(/\s*\(.*?\)\s*/g, " ").replace(/^the\s+/i, "").replace(/university of /i, "").replace(/ university| college/gi, "").trim().toLowerCase()
  const programs = new Set(onPlatform.map((c) => key(String(sch?.find((s) => s.id === c.school_id)?.name ?? c.institution ?? ""))).filter(Boolean)).size

  // Everyone with an account, any role.
  const users = new Set<string>()
  for (let f = 0; ; f += 1000) {
    const { data } = await admin.from("user_profiles").select("email").order("user_id").range(f, f + 999)
    for (const u of data ?? []) if (u.email) users.add(String(u.email).toLowerCase().trim())
    if (!data || data.length < 1000) break
  }
  const exclude = new Set(arg("exclude") ? fs.readFileSync(arg("exclude")!, "utf8").split(/\r?\n/).map((l) => l.trim().toLowerCase()).filter((l) => l && !l.startsWith("#")) : [])

  const csvPath = arg("from-csv")
  if (!csvPath) throw new Error("--from-csv <staff csv> is required (men's list, or women's with --womens)")
  const [head, ...lines] = fs.readFileSync(csvPath, "utf8").trim().split(/\r?\n/)
  const cols = head!.split(",")
  const people = new Map<string, { email: string; name: string | null; optedOut: boolean }>()
  for (const line of lines) {
    const cells: string[] = []; let cur = ""; let q = false
    for (const ch of line) { if (ch === '"') q = !q; else if (ch === "," && !q) { cells.push(cur); cur = "" } else cur += ch }
    cells.push(cur)
    const r = Object.fromEntries(cols.map((c, k) => [c, cells[k] ?? ""]))
    const e = String(r.email ?? "").toLowerCase().trim()
    if (e && !people.has(e)) people.set(e, { email: e, name: r.name || null, optedOut: false })
  }
  // Anyone opted out in the coach directory stays out.
  const { data: dir } = await admin.from("toc_college_coaches").select("email, opted_out").eq("opted_out", true)
  for (const r of dir ?? []) { const p = people.get(String(r.email ?? "").toLowerCase().trim()); if (p) p.optedOut = true }
  const why: Record<string, number> = {}
  const count = (k: string) => { why[k] = (why[k] ?? 0) + 1; return false }
  // Never a second Super 32 email to someone who got the men's one.
  if (WOMENS) {
    const mensLog = path.join(SNAP, "super32-results-invite-sent.json")
    const mensSent: Record<string, string> = fs.existsSync(mensLog) ? JSON.parse(fs.readFileSync(mensLog, "utf8")) : {}
    for (const e of Object.keys(mensSent)) if (people.delete(e)) count("got the men's email")
  }
  const candidates = [...people.values()].filter((p) =>
    !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(p.email) ? count("invalid") : INTERNAL.test(p.email) ? count("internal") : users.has(p.email) ? count("has an account") : exclude.has(p.email) ? count("replied (excluded)") : p.optedOut ? count("opted out") : true)
  const { allowed } = await filterUnsubscribed(admin as never, candidates.map((c) => c.email))
  const ok = new Set(allowed.map((e) => e.toLowerCase()))
  const sent: Record<string, string> = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, "utf8")) : {}
  const list = candidates.filter((c) => (ok.has(c.email) || count("unsubscribed")) && (!sent[c.email] || count("already sent")))

  console.log(`On the platform: ${onPlatform.length} coaches, ${programs} programs`)
  console.log(`Audience: ${people.size} ${WOMENS ? "women's" : "men's"} staff addresses | left off: ${Object.entries(why).map(([k, n]) => `${n} ${k}`).join(", ")} | to send: ${list.length}`)
  const missingExcluded = [...exclude].filter((e) => !people.has(e))
  if (missingExcluded.length) console.log(`(excluded addresses not in the audience anyway: ${missingExcluded.length})`)
  fs.writeFileSync(path.join(SNAP, WOMENS ? "super32-womens-invite-list.csv" : "super32-results-invite-list.csv"), "email,name\n" + list.map((c) => `${c.email},"${c.name ?? ""}"`).join("\n"))
  const sample = list.find((c) => c.name && c.name.split(" ").length > 1) ?? list[0]!
  const preview = renderSuper32ResultsInviteLetter({ coachName: sample.name, coachEmail: sample.email, coaches: onPlatform.length, programs, unsubscribeUrl: null })
  const previewFile = WOMENS ? "super32-womens-invite-preview.html" : "super32-results-invite-preview.html"
  fs.writeFileSync(path.join(SNAP, previewFile), preview.html)
  console.log(`Subject: ${preview.subject}\nPreview: ${path.resolve(SNAP, previewFile)}`)

  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)
  const sendOne = async (to: string, c: (typeof list)[number]) => {
    const unsub = unsubscribeUrl("https://app.ncwrestlingunited.com", to)
    const m = renderSuper32ResultsInviteLetter({ coachName: c.name, coachEmail: c.email, coaches: onPlatform.length, programs, unsubscribeUrl: unsub })
    return resend.emails.send({ from: "Matt Hickey <info@ncwrestlingunited.com>", to: [to], replyTo: "info@ncwrestlingunited.com", subject: m.subject, html: m.html, text: m.text, headers: unsubscribeHeaders(unsub) })
  }
  const testTo = arg("to")
  if (testTo) {
    for (const t of testTo.split(",").map((s) => s.trim())) { const r = await sendOne(t, sample); console.log(r.error ? `FAILED ${t}: ${r.error.message}` : `test sent to ${t}`) }
    return
  }
  if (!flag("send")) { console.log("Dry run: nothing sent."); return }
  const batch = Number(arg("batch")) || 0
  const pause = (Number(arg("pause")) || 180) * 1000
  let done = 0
  for (const c of list) {
    if (batch && done > 0 && done % batch === 0) { console.log(`batch done (${done}); pausing ${pause / 1000}s`); await new Promise((r) => setTimeout(r, pause)) }
    const r = await sendOne(c.email, c)
    done++
    if (r.error) { console.log(`FAILED ${c.email}: ${r.error.message}`); continue }
    sent[c.email] = new Date().toISOString()
    fs.writeFileSync(LOG, JSON.stringify(sent, null, 1))
    console.log(`sent ${c.email}`)
    await new Promise((r) => setTimeout(r, 600))
  }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })

/**
 * Welcome email to signed-up college coaches (lib/coach-welcome-email.ts).
 *
 *   npx tsx --env-file=.env.local scripts/coach-welcome-email.ts                 dry run: list + preview
 *   ... --test-to you@example.com                                              one copy to that address
 *   ... --send                                                                 every coach on the list
 *
 * Recipients: college coach accounts, approved, not internal, not unsubscribed. Sends are logged
 * to ranking-snapshots/coach-welcome-sent.json and never repeated.
 */
import fs from "fs"
import { createRequire } from "module"
import { createClient } from "@supabase/supabase-js"

const req = createRequire(import.meta.url)
req.cache[req.resolve("server-only")] = { exports: {} } as never

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : undefined }
const flag = (n: string) => process.argv.includes(`--${n}`)
const LOG = "ranking-snapshots/coach-welcome-sent.json"
const PREVIEW = arg("out") ?? "ranking-snapshots/coach-welcome-preview.html"
// No program names in the email (Matt, 17 Oct 2026).
const NAMED: string[] = []
const REPLY_TO = arg("reply-to") ?? "info@ncwrestlingunited.com"

async function main() {
  const { renderCoachWelcomeEmail } = await import("../lib/coach-welcome-email")
  const { filterUnsubscribed, unsubscribeHeaders, unsubscribeUrl } = await import("../lib/email-unsubscribe")
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

  const { data } = await admin
    .from("user_profiles")
    .select("user_id, email, full_name, first_name, last_name, institution, school_id, verified_coach, verification_status, is_admin")
    .in("role", ["college_coach", "college-coach"])
  const internal = /ncwrestlingunited|thehickeyclan|testcoach|@example\.com$/i
  const coaches = (data ?? []).filter((c) => c.email && !internal.test(c.email) && c.is_admin !== true && c.verified_coach === true && c.verification_status !== "rejected")
  const schoolIds = [...new Set(coaches.map((c) => c.school_id).filter(Boolean))]
  const { data: schools } = await admin.from("schools").select("id, name, logo_url").in("id", schoolIds)
  const school = (id: string | null) => schools?.find((s) => s.id === id)
  const programKey = (c: (typeof coaches)[number]) =>
    String(school(c.school_id)?.name ?? c.institution ?? "").replace(/\s*\(.*?\)\s*/g, " ").replace(/^the\s+/i, "").replace(/university of /i, "").replace(/ university| college/gi, "").trim().toLowerCase()
  const programs = new Set(coaches.map(programKey).filter(Boolean)).size

  const { allowed } = await filterUnsubscribed(admin, coaches.map((c) => c.email!))
  const sendable = new Set(allowed.map((e: string) => e.toLowerCase()))
  const sent: Record<string, string> = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, "utf8")) : {}
  const list = coaches.filter((c) => sendable.has(c.email!.toLowerCase()) && !sent[c.email!.toLowerCase()])

  const render = (c: (typeof coaches)[number] | null, unsub: string | null) =>
    renderCoachWelcomeEmail({
      coachName: c ? (c.full_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || null) : null,
      program: c ? (school(c.school_id)?.name ?? c.institution ?? null) : null,
      programLogo: c ? (school(c.school_id)?.logo_url ?? null) : null,
      coaches: coaches.length,
      programs,
      namedPrograms: NAMED,
      unsubscribeUrl: unsub,
    })

  console.log(`Coaches: ${coaches.length} from ${programs} programs | unsubscribed: ${coaches.length - sendable.size} | already sent: ${Object.keys(sent).length} | to send: ${list.length}`)
  const sample = list.find((c) => /unc\.edu$/i.test(c.email!)) ?? list[0] ?? null
  fs.writeFileSync(PREVIEW, render(sample, null).html)
  fs.writeFileSync(PREVIEW.replace(/\.html$/, "-list.csv"), "email,name,program\n" + list.map((c) => `${c.email},"${c.full_name ?? ""}","${school(c.school_id)?.name ?? c.institution ?? ""}"`).join("\n"))
  console.log(`Preview (${sample?.email ?? "generic"}): ${PREVIEW}`)

  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)
  const send = async (to: string, c: (typeof coaches)[number] | null) => {
    const unsub = unsubscribeUrl("https://app.ncwrestlingunited.com", to)
    const email = render(c, unsub)
    return resend.emails.send({ from: "Matt Hickey · RecruitNC <info@ncwrestlingunited.com>", to: [to], replyTo: REPLY_TO, subject: email.subject, html: email.html, headers: unsubscribeHeaders(unsub) })
  }

  const testTo = arg("test-to")
  if (testTo) {
    const r = await send(testTo, sample)
    console.log(r.error ? `Test failed: ${r.error.message}` : `Test sent to ${testTo}`)
    return
  }
  if (!flag("send")) { console.log("Dry run: nothing sent."); return }
  for (const c of list) {
    const r = await send(c.email!, c)
    if (r.error) { console.log(`FAILED ${c.email}: ${r.error.message}`); continue }
    sent[c.email!.toLowerCase()] = new Date().toISOString()
    fs.writeFileSync(LOG, JSON.stringify(sent, null, 1))
    console.log(`sent ${c.email}`)
    await new Promise((res) => setTimeout(res, 600))
  }
  console.log(`Done: ${Object.keys(sent).length} sent in total.`)
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })

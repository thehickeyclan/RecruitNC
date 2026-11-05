/**
 * "Georgia, Tennessee, South Carolina and Virginia are open" to every signed-up college coach, men's
 * and women's (Matt, 5 Nov 2026). A letter from Matt, the format that reaches the inbox: no images or
 * buttons, a text twin, and no questions or reply prompts (coach emails ask nothing). Counts are
 * read at send time: current classes (2027-2030) per state.
 *
 * Dry run by default: writes every coach's email as HTML to --out <dir> and a list, and sends
 * nothing. Sending is explicit and only after Matt approves the preview:
 *
 *   npx tsx --env-file=.env.local scripts/coach-states-live-email.ts --out /tmp/states-live
 *   ... --to you@x.com --send          (a test: the first coach's email, to you)
 *   ... --send --batch 25 --pause 180  (everyone, spread out)
 *
 * Skips: admins, unsubscribed addresses, anyone already sent (logged in <out>/sent.json).
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

const SITE = "https://www.recruitwrestlers.com"
const BRAND = "RecruitWrestlers"
// Largest first; SC is the only one of the four with rankings published.
const STATES = [
  { code: "GA", name: "Georgia" },
  { code: "SC", name: "South Carolina", ranked: true },
  { code: "VA", name: "Virginia" },
  { code: "TN", name: "Tennessee" },
]
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

type Counts = Record<string, number>

function renderLetter(coach: string, counts: Counts, unsubscribeUrl: string) {
  const total = STATES.reduce((n, s) => n + (counts[s.code] ?? 0), 0)
  const subject = "Georgia, Tennessee, South Carolina and Virginia are open"
  const paras = [
    `${coach},`,
    `Four more states are open to college coaches on ${BRAND}: Georgia, Tennessee, South Carolina and Virginia. That's ${total.toLocaleString("en-US")} more wrestlers in the classes of 2027 to 2030, alongside North Carolina.`,
  ]
  const items = STATES.map((s) => ({
    text: `${s.name}: ${(counts[s.code] ?? 0).toLocaleString("en-US")} wrestlers${s.ranked ? ", with state rankings" : ""}`,
    href: `${SITE}/prospects/all?state=${s.code}`,
  }))
  const after = [
    `Every profile starts from the wrestler's state tournament results. Families are claiming them now and adding academics, contact information and the rest of their season.`,
    `Star anyone to add them to My Recruits. New claims from every state show up under Recently Claimed.`,
    `Rankings for Georgia, Tennessee and Virginia will follow.`,
  ]
  const sig = ["Matt Hickey", BRAND, "Cell 631.662.5409"]
  const p = (t: string) => `<p style="margin:0 0 14px;">${esc(t)}</p>`
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:560px;margin:0 auto;padding:24px 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:#1f2937;">
${paras.map(p).join("\n")}
<ul style="margin:0 0 14px;padding-left:20px;">${items.map((i) => `<li style="margin:0 0 4px;"><a href="${i.href}" style="color:#1d4ed8;">${esc(i.text)}</a></li>`).join("")}</ul>
${after.map(p).join("\n")}
<p style="margin:18px 0 0;">${sig.map(esc).join("<br>")}</p>
<p style="margin:28px 0 0;font-size:12px;color:#9ca3af;"><a href="${esc(unsubscribeUrl)}" style="color:#9ca3af;">Unsubscribe</a></p>
</div></body></html>`
  const text = [...paras, items.map((i) => `- ${i.text}: ${i.href}`).join("\n"), ...after, sig.join("\n"), `Unsubscribe: ${unsubscribeUrl}`].join("\n\n")
  return { subject, html, text }
}

async function main() {
  const { classifyViewer } = await import("../lib/viewer-role")
  const { coachSalutation } = await import("../lib/coach-welcome-email")
  const { filterUnsubscribed, unsubscribeHeaders, unsubscribeUrl } = await import("../lib/email-unsubscribe")

  const out = arg("out")
  if (!out) throw new Error("--out <dir> is required")
  fs.mkdirSync(out, { recursive: true })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

  const counts: Counts = {}
  for (const s of STATES) {
    const { count, error } = await admin.from("athletes").select("id", { count: "exact", head: true }).eq("state", s.code).gte("graduationyear", 2027).lte("graduationyear", 2030)
    if (error) throw new Error(`count ${s.code}: ${error.message}`)
    counts[s.code] = count ?? 0
  }
  console.log("Counts:", counts)

  const { data: profiles, error } = await admin.from("user_profiles").select("user_id, email, full_name, first_name, last_name, role, profile_type, verified_coach, verification_status, is_admin").eq("verified_coach", true)
  if (error) throw new Error(error.message)
  const coaches = (profiles ?? []).filter((p) => classifyViewer(p as never).isCollegeCoach && p.email && !p.is_admin)
  const { allowed } = await filterUnsubscribed(admin as never, coaches.map((c) => String(c.email)))
  const allowedSet = new Set(allowed.map((e) => e.toLowerCase()))
  const sentPath = path.join(out, "sent.json")
  const sent: Record<string, string> = fs.existsSync(sentPath) ? JSON.parse(fs.readFileSync(sentPath, "utf8")) : {}

  const to = arg("to")
  const rows: string[] = ["email,status"]
  const list: Array<{ email: string; coach: string }> = []
  for (const c of coaches) {
    const email = String(c.email).toLowerCase()
    const name = (c.full_name as string | null) || [c.first_name, c.last_name].filter(Boolean).join(" ") || null
    const coach = coachSalutation(name, email)
    const status = !allowedSet.has(email) ? "unsubscribed" : sent[email] ? "already sent" : "to send"
    const mail = renderLetter(coach, counts, unsubscribeUrl("https://app.ncwrestlingunited.com", email))
    fs.writeFileSync(path.join(out, `${email.replace(/[^a-z0-9@._-]/g, "_")}.html`), mail.html)
    rows.push(`${email},${status}`)
    if (status === "to send") list.push({ email, coach })
  }
  fs.writeFileSync(path.join(out, "list.csv"), rows.join("\n"))
  console.log(`Coaches: ${coaches.length} · to send: ${list.length}`)
  console.log(`Previews: ${path.resolve(out)}`)

  if (!flag("send")) { console.log("Dry run: nothing sent."); return }
  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)
  // A test sends the first coach's email to each tester, with the tester's own unsubscribe link.
  const queue = to ? list.slice(0, 1) : list
  const batch = Number(arg("batch")) || 0
  const pause = (Number(arg("pause")) || 180) * 1000
  let done = 0
  for (const m of queue) {
    if (batch && done > 0 && done % batch === 0) {
      console.log(`batch done (${done} sent); pausing ${pause / 1000}s`)
      await new Promise((r) => setTimeout(r, pause))
    }
    done++
    for (const rcpt of to ? to.split(",").map((t) => t.trim()) : [m.email]) {
      const unsub = unsubscribeUrl("https://app.ncwrestlingunited.com", rcpt)
      const mail = renderLetter(m.coach, counts, unsub)
      const res = await resend.emails.send({
        // As Matt alone, like the letters that landed in Primary; RecruitWrestlers has no verified sending domain yet.
        from: "Matt Hickey <info@ncwrestlingunited.com>",
        to: [rcpt],
        replyTo: "info@ncwrestlingunited.com",
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        headers: unsubscribeHeaders(unsub),
      })
      if (res.error) { console.log(`FAILED ${rcpt}: ${res.error.message}`); continue }
      console.log(`sent ${to ? `test (${m.email}'s email) to ` : ""}${rcpt}`)
      await new Promise((r) => setTimeout(r, 600))
    }
    if (!to) { sent[m.email] = new Date().toISOString(); fs.writeFileSync(sentPath, JSON.stringify(sent, null, 1)) }
  }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })

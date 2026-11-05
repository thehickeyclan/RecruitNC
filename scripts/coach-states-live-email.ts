/**
 * "Georgia, Tennessee, South Carolina and Virginia are open" to every signed-up college coach, men's
 * and women's (Matt, 5 Nov 2026). A letter from Matt, the format that reaches the inbox: no images or
 * buttons, a text twin, and no questions or reply prompts (coach emails ask nothing). Each state is
 * listed by its All-Americans, state champions and state placers (Matt, 5 Nov 2026), counted at send
 * time over current classes (2027-2030) with the directory's Honors filter rules, so each number
 * matches what the coach sees on that state's page.
 *
 * Two versions (Matt, 5 Nov 2026), one subject:
 *   --audience members (default)  coaches with an account: a short note
 *   --audience invite --list <csv> D2, D3, NAIA and NJCAA staff without an account (the CSV Matt
 *                                  approved: email,name,...): the full letter with the sign-up link.
 *                                  Anyone who has an account or unsubscribed by send time is dropped.
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
const FOR_COACHES = `${SITE}/for-coaches`
const SIGNUP = `${SITE}/auth/signup?type=college-coach`
// Matt's line (5 Nov 2026), with "wrestling" so the coach knows what it is before opening it.
const SUBJECT = "Revolutionizing High School Wrestling Recruiting"
type Audience = "members" | "invite"
// Largest first; SC is the only one of the four with rankings published.
const STATES = [
  { code: "GA", name: "Georgia" },
  { code: "SC", name: "South Carolina", ranked: true },
  { code: "VA", name: "Virginia" },
  { code: "TN", name: "Tennessee" },
]
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

type Honors = { aa: number; champs: number; placers: number }
type Counts = Record<string, Honors>

/** Families who claimed; programs and coaches on the platform. */
type Momentum = { families: number; lastWeek: number; programs: number; coaches: number }

function renderLetter(audience: Audience, coach: string, counts: Counts, momentum: Momentum, unsubscribeUrl: string) {
  const subject = SUBJECT
  const paras = [
    `${coach},`,
    `Four more states are open to college coaches on ${BRAND}: Georgia, Tennessee, South Carolina and Virginia, alongside North Carolina. In the classes of 2027 to 2030:`,
  ]
  const n = (v: number, one: string, many: string) => `${v.toLocaleString("en-US")} ${v === 1 ? one : many}`
  const items = STATES.map((s) => ({
    text: `${s.name}: ${[n(counts[s.code].aa, "All-American", "All-Americans"), n(counts[s.code].champs, "state champion", "state champions"), n(counts[s.code].placers, "state placer", "state placers")].join(", ")}${s.ranked ? ", plus state rankings" : ""}`,
    // An invited coach has no account: the link signs him up and lands him on that state's wrestlers
    // (the coach sign-up signs in at once and follows returnTo). A member goes straight there.
    href: audience === "invite"
      ? `${SIGNUP}&returnTo=${encodeURIComponent(`/prospects/all?state=${s.code}`)}`
      : `${SITE}/prospects/all?state=${s.code}`,
  }))
  // Matt, 5 Nov 2026: programs exact, coaches "more than" a round ten.
  const programs = `${momentum.programs} college programs and more than ${Math.floor(momentum.coaches / 10) * 10} coaches are already on ${BRAND}`
  const families = `More than ${(Math.floor(momentum.families / 50) * 50).toLocaleString("en-US")} families have claimed their wrestler's profile, ${momentum.lastWeek} of them in the past week`
  const sig = ["Matt Hickey", BRAND, "Cell 631.662.5409"]
  const p = (t: string) => `<p style="margin:0 0 14px;">${esc(t)}</p>`
  const ul = (lis: string[]) => `<ul style="margin:0 0 14px;padding-left:20px;">${lis.map((li) => `<li style="margin:0 0 6px;">${li}</li>`).join("")}</ul>`
  const page = (body: string) => `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:560px;margin:0 auto;padding:24px 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:#1f2937;">
${body}
<p style="margin:18px 0 0;">${sig.map(esc).join("<br>")}</p>
<p style="margin:28px 0 0;font-size:12px;color:#9ca3af;"><a href="${esc(unsubscribeUrl)}" style="color:#9ca3af;">Unsubscribe</a></p>
</div></body></html>`
  const stateList = ul(items.map((i) => `<a href="${i.href}" style="color:#1d4ed8;">${esc(i.text)}</a>`))
  const stateText = items.map((i) => `- ${i.text}: ${i.href}`).join("\n")

  if (audience === "members") {
    // Coaches already on the platform know the tools: the news and the momentum only.
    const after = [`Rankings for Georgia, Tennessee and Virginia will follow. ${programs}. ${families}. New claims from every state show up under Recently Claimed.`]
    return {
      subject,
      html: page(`${paras.map(p).join("\n")}\n${stateList}\n${after.map(p).join("\n")}`),
      text: [...paras, stateText, ...after, sig.join("\n"), `Unsubscribe: ${unsubscribeUrl}`].join("\n\n"),
    }
  }

  const mid = [
    `Rankings for Georgia, Tennessee and Virginia will follow.`,
    // Matt, 5 Nov 2026. "More than" a round fifty, so the claim stays true as the count moves.
    `Our goal is to revolutionize high school recruiting for college programs and families. ${programs}. ${families}, and they're adding academics, contact information and the rest of their season.`,
    `What you get on every wrestler, free for college coaching staff:`,
  ]
  // The value list (Matt, 5 Nov 2026: "we need somewhere that we list our value proposition"). Each line is a feature coaches have today.
  const value = [
    ["Strength of competition", "every win and loss with the opponent's credentials, so you see who he beat, not just his record"],
    ["Scouting reports", "significant wins, notable losses, star rating, academics and contact information"],
    ["Alerts", "when a recruit commits elsewhere, places at a tournament, marks interest in your program or is competing this weekend"],
    ["Messages", "write to any wrestler, even when there is no cell number on file. Parents are on every conversation, and if the family hasn't joined yet, your message waits on the profile and you're told when they claim it"],
    ["My Recruits", "one board for your whole staff, plus Compare and Recently Claimed"],
  ] as const
  const signup = `Create your coach account here: ${SIGNUP.replace(/^https:\/\//, "")}. Access is instant.`
  const tail = [`The full list is at ${FOR_COACHES.replace(/^https:\/\//, "")}.`]
  const html = page(`${paras.map(p).join("\n")}
${stateList}
${mid.map(p).join("\n")}
${ul(value.map(([k, v]) => `<strong>${esc(k)}:</strong> ${esc(v)}`))}
<p style="margin:0 0 14px;">Create your coach account here: <a href="${SIGNUP}" style="color:#1d4ed8;">${esc(SIGNUP.replace(/^https:\/\//, ""))}</a>. Access is instant.</p>
<p style="margin:0 0 14px;">The full list is at <a href="${FOR_COACHES}" style="color:#1d4ed8;">${esc(FOR_COACHES.replace(/^https:\/\//, ""))}</a>.</p>`)
  const text = [...paras, stateText, ...mid, value.map(([k, v]) => `- ${k}: ${v}`).join("\n"), signup, ...tail, sig.join("\n"), `Unsubscribe: ${unsubscribeUrl}`].join("\n\n")
  return { subject, html, text }
}

async function main() {
  const { classifyViewer } = await import("../lib/viewer-role")
  const { coachSalutation } = await import("../lib/coach-welcome-email")
  const { loadAchievements, isAllAmerican } = await import("../lib/prospect-achievements")
  const { filterUnsubscribed, unsubscribeHeaders, unsubscribeUrl } = await import("../lib/email-unsubscribe")

  const out = arg("out")
  if (!out) throw new Error("--out <dir> is required")
  fs.mkdirSync(out, { recursive: true })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

  const counts: Counts = {}
  for (const s of STATES) {
    const athletes: Array<{ id: string; name: string | null }> = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin.from("athletes").select("id, name").eq("state", s.code).gte("graduationyear", 2027).lte("graduationyear", 2030).order("id").range(from, from + 999)
      if (error) throw new Error(`athletes ${s.code}: ${error.message}`)
      athletes.push(...(data ?? []))
      if (!data || data.length < 1000) break
    }
    const facts = await loadAchievements(admin as never, athletes)
    const h: Honors = { aa: 0, champs: 0, placers: 0 }
    for (const a of athletes) {
      const f = facts.get(a.id) ?? {}
      const place = Number(f.bestStatePlace)
      // The directory's Honors filter (app/prospects/all/prospects-all-client.tsx): a champion is also a placer.
      if (isAllAmerican(f)) h.aa++
      if (place === 1) h.champs++
      if (place >= 1 && place <= 6) h.placers++
    }
    counts[s.code] = h
  }
  console.log("Counts:", counts)

  // Families: wrestlers whose profile a family has claimed, by any of the three records a claim leaves.
  const claimedAt = new Map<string, string>()
  const note = (id: string | null, at: string | null) => {
    if (!id) return
    const prev = claimedAt.get(id)
    if (prev === undefined || (at && (!prev || at < prev))) claimedAt.set(id, at ?? prev ?? "")
  }
  for (const [table, idCol, atCol, claimedOnly] of [
    ["parent_athlete_links", "athlete_id", "created_at", false],
    ["profile_claim_consents", "athlete_id", "created_at", false],
    ["athletes", "id", "claimed_at", true],
  ] as const) {
    for (let from = 0; ; from += 1000) {
      let q = admin.from(table).select(`${idCol}, ${atCol}`).order(idCol).range(from, from + 999)
      if (claimedOnly) q = q.not("claimed_by_user_id", "is", null)
      const { data, error: e } = await q
      if (e) throw new Error(`${table}: ${e.message}`)
      for (const r of (data ?? []) as Array<Record<string, string | null>>) note(r[idCol], r[atCol])
      if (!data || data.length < 1000) break
    }
  }
  const weekAgo = new Date(Date.now() - 7 * 86400e3).toISOString()
  const { data: profiles, error } = await admin.from("user_profiles").select("user_id, email, full_name, first_name, last_name, role, profile_type, verified_coach, verification_status, is_admin, institution, school_id").eq("verified_coach", true)
  if (error) throw new Error(error.message)
  const coaches = (profiles ?? []).filter((p) => classifyViewer(p as never).isCollegeCoach && p.email && !p.is_admin && p.verification_status !== "rejected")

  // Programs, one per school however its coaches spelled it (scripts/coach-invite-email.ts counts the same way).
  const { data: sch } = await admin.from("schools").select("id, name").in("id", [...new Set(coaches.map((c) => c.school_id).filter(Boolean))] as string[])
  const progKey = (c: (typeof coaches)[number]) =>
    String(sch?.find((x) => x.id === c.school_id)?.name ?? c.institution ?? "").replace(/\s*\(.*?\)\s*/g, " ").replace(/^the\s+/i, "").replace(/university of /i, "").replace(/ university| college/gi, "").trim().toLowerCase()
  const momentum: Momentum = {
    families: claimedAt.size,
    lastWeek: [...claimedAt.values()].filter((at) => at && at >= weekAgo).length,
    programs: new Set(coaches.map(progKey).filter(Boolean)).size,
    coaches: coaches.length,
  }
  console.log("Momentum:", momentum)
  const audience: Audience = arg("audience") === "invite" ? "invite" : "members"
  // Who gets it: coaches with an account, or the approved invite CSV (email,name,... one per row).
  let recipients: Array<{ email: string; name: string | null }>
  if (audience === "invite") {
    const listPath = arg("list")
    if (!listPath) throw new Error("--audience invite needs --list <csv>")
    const [head, ...lines] = fs.readFileSync(listPath, "utf8").trim().split(/\r?\n/)
    const cols = head!.split(",")
    const cell = (line: string) => { const cells: string[] = []; let cur = ""; let q = false
      for (const ch of line) { if (ch === '"') q = !q; else if (ch === "," && !q) { cells.push(cur); cur = "" } else cur += ch }
      cells.push(cur); return Object.fromEntries(cols.map((c, i) => [c, (cells[i] ?? "").trim()])) as Record<string, string> }
    // Signed up since the list was approved: they get the members' note instead, never an invite.
    const users = new Set<string>()
    for (let from = 0; ; from += 1000) {
      const { data } = await admin.from("user_profiles").select("email").order("user_id").range(from, from + 999)
      for (const u of data ?? []) users.add(String(u.email ?? "").toLowerCase().trim())
      if (!data || data.length < 1000) break
    }
    const seen = new Set<string>()
    recipients = lines.map(cell).map((r) => ({ email: String(r.email).toLowerCase().trim(), name: r.name || null }))
      .filter((r) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(r.email) && !users.has(r.email) && !seen.has(r.email) && seen.add(r.email))
  } else {
    recipients = coaches.map((c) => ({
      email: String(c.email).toLowerCase(),
      name: (c.full_name as string | null) || [c.first_name, c.last_name].filter(Boolean).join(" ") || null,
    }))
  }
  const { allowed } = await filterUnsubscribed(admin as never, recipients.map((r) => r.email))
  const allowedSet = new Set(allowed.map((e) => e.toLowerCase()))
  const sentPath = path.join(out, "sent.json")
  const sent: Record<string, string> = fs.existsSync(sentPath) ? JSON.parse(fs.readFileSync(sentPath, "utf8")) : {}

  const to = arg("to")
  const rows: string[] = ["email,status"]
  const list: Array<{ email: string; coach: string }> = []
  for (const r of recipients) {
    const coach = coachSalutation(r.name, r.email)
    const status = !allowedSet.has(r.email) ? "unsubscribed" : sent[r.email] ? "already sent" : "to send"
    const mail = renderLetter(audience, coach, counts, momentum, unsubscribeUrl("https://app.ncwrestlingunited.com", r.email))
    fs.writeFileSync(path.join(out, `${r.email.replace(/[^a-z0-9@._-]/g, "_")}.html`), mail.html)
    rows.push(`${r.email},${status}`)
    if (status === "to send") list.push({ email: r.email, coach })
  }
  fs.writeFileSync(path.join(out, "list.csv"), rows.join("\n"))
  console.log(`${audience}: ${recipients.length} recipients · to send: ${list.length}`)
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
      const mail = renderLetter(audience, m.coach, counts, momentum, unsub)
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

/**
 * Both Super 32 recaps to everyone on NC United except college coaches (lib/super32-recaps-email.ts).
 * Audience: every account with an email (not college coaches, not admins, not internal/test) plus the
 * TOC/news email subscribers, one per address, minus unsubscribes and anyone already sent (own log).
 * Dry run by default; --to a@x,b@y for tests; --send --batch 100 --pause 120 for the real send.
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
const LOG = path.join(SNAP, "super32-recaps-broadcast-sent.json")
const INTERNAL = /ncwrestlingunited|recruitwrestlers|wrestlingguild|testcoach|@example\.com$|^test@|@test\./i

async function main() {
  const { renderSuper32RecapsEmail } = await import("../lib/super32-recaps-email")
  const { filterUnsubscribed, unsubscribeHeaders, unsubscribeUrl } = await import("../lib/email-unsubscribe")
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const people = new Map<string, string | null>()
  const why: Record<string, number> = {}
  const skip = (k: string) => { why[k] = (why[k] ?? 0) + 1 }
  for (let f = 0; ; f += 1000) {
    const { data } = await admin.from("user_profiles").select("email, role, is_admin, first_name, full_name").order("user_id").range(f, f + 999)
    for (const u of data ?? []) {
      const e = String(u.email ?? "").toLowerCase().trim()
      if (!e) continue
      if (/college/.test(String(u.role ?? ""))) { skip("college coach"); continue }
      if (u.is_admin || u.role === "admin") { skip("admin"); continue }
      if (!people.has(e)) people.set(e, (u.first_name as string | null) || String(u.full_name ?? "").split(/\s+/)[0] || null)
    }
    if (!data || data.length < 1000) break
  }
  const accounts = people.size
  const { data: subs } = await admin.from("toc_email_subscribers").select("email").limit(10000)
  for (const s of subs ?? []) { const e = String(s.email ?? "").toLowerCase().trim(); if (e && !people.has(e)) people.set(e, null) }
  const candidates = [...people.entries()].filter(([e]) => (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e) && !INTERNAL.test(e)) || (skip("internal/invalid"), false))
  const { allowed } = await filterUnsubscribed(admin as never, candidates.map(([e]) => e))
  const ok = new Set(allowed.map((e) => e.toLowerCase()))
  const sent: Record<string, string> = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG, "utf8")) : {}
  const list = candidates.filter(([e]) => (ok.has(e) || (skip("unsubscribed"), false)) && (!sent[e] || (skip("already sent"), false)))
  console.log(`Accounts ${accounts} + subscribers ${people.size - accounts} | left off: ${Object.entries(why).map(([k, n]) => `${n} ${k}`).join(", ")} | to send: ${list.length}`)
  const preview = renderSuper32RecapsEmail({ firstName: list[0]?.[1] ?? null, unsubscribeUrl: null })
  fs.writeFileSync(path.join(SNAP, "super32-recaps-broadcast-preview.html"), preview.html)
  console.log(`Subject: ${preview.subject}\nPreview: ${path.resolve(SNAP, "super32-recaps-broadcast-preview.html")}`)

  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)
  const one = async (to: string, first: string | null) => {
    const unsub = unsubscribeUrl("https://app.ncwrestlingunited.com", to)
    const m = renderSuper32RecapsEmail({ firstName: first, unsubscribeUrl: unsub })
    return resend.emails.send({ from: "Matt Hickey <info@ncwrestlingunited.com>", to: [to], replyTo: "info@ncwrestlingunited.com", subject: m.subject, html: m.html, text: m.text, headers: unsubscribeHeaders(unsub) })
  }
  if (arg("to")) { for (const t of arg("to")!.split(",")) { const r = await one(t.trim(), null); console.log(r.error ? `FAILED ${t}: ${r.error.message}` : `test sent to ${t}`) } return }
  if (!flag("send")) { console.log("Dry run: nothing sent."); return }
  const batch = Number(arg("batch")) || 100
  const pause = (Number(arg("pause")) || 120) * 1000
  let done = 0
  for (const [e, first] of list) {
    if (done > 0 && done % batch === 0) { console.log(`batch done (${done}); pausing`); await new Promise((r) => setTimeout(r, pause)) }
    const r = await one(e, first); done++
    if (r.error) { console.log(`FAILED ${e}: ${r.error.message}`); continue }
    sent[e] = new Date().toISOString(); fs.writeFileSync(LOG, JSON.stringify(sent, null, 1))
    console.log(`sent ${e}`)
    await new Promise((r) => setTimeout(r, 550))
  }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })

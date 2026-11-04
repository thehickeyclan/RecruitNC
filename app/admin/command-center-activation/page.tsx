/**
 * Command Center activation (Matt, 2 Nov 2026): every family's first Command Center visit, and
 * whether it did something that moves recruiting within 7 days (lib/recruiting/cc-activation.ts).
 * Target: half of them. Admins and college coaches are left out. Admins only.
 */
import { redirect } from "next/navigation"

import { ACTION_LABEL, ACTIVATION_DAYS, ACTIVATION_TARGET, activationOf, activationRate, type ActivationFamily, type CommandCenterAction } from "@/lib/recruiting/cc-activation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const metadata = { title: "Command Center activation | Admin" }

type Admin = ReturnType<typeof createAdminClient>
const SITE_LABEL: Record<string, string> = { rw: "RecruitWrestlers", ncu: "NC United", app: "iPhone app" }

/** Every row of a query, a thousand at a time, in id order so pages never overlap. */
async function all<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; from < 200_000; from += 1000) {
    const { data, error } = await page(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

async function loadFamilies(admin: Admin): Promise<Array<ActivationFamily & { name: string }>> {
  type View = { user_id: string | null; created_at: string; event_data: { site?: string } | null }
  const views = await all<View>((a, b) =>
    admin.from("user_analytics").select("id, user_id, created_at, event_data").eq("event_type", "page_view").like("page_url", "/my-recruiting%").order("id").range(a, b),
  )
  const first = new Map<string, { at: string; site: string | null }>()
  for (const v of views) {
    if (!v.user_id) continue
    const f = first.get(v.user_id)
    if (!f || v.created_at < f.at) first.set(v.user_id, { at: v.created_at, site: v.event_data?.site ?? null })
  }
  const ids = [...first.keys()]
  if (!ids.length) return []

  const chunks = <T,>(xs: T[], n = 200) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n))
  const [profiles, list, visits, messages, events] = await Promise.all([
    Promise.all(chunks(ids).map((c) => admin.from("user_profiles").select("user_id, email, full_name, role, is_admin, verified_coach").in("user_id", c))).then((rs) => rs.flatMap((r) => r.data ?? [])),
    Promise.all(chunks(ids).map((c) => admin.from("college_list_items").select("user_id, created_at, coach_emailed_at, questionnaire_done_at").in("user_id", c))).then((rs) => rs.flatMap((r) => r.data ?? [])),
    Promise.all(chunks(ids).map((c) => admin.from("recruiting_visits").select("user_id, created_at").in("user_id", c))).then((rs) => rs.flatMap((r) => r.data ?? [])),
    Promise.all(chunks(ids).map((c) => admin.from("coach_messages").select("sender_user_id, sender_role, created_at").in("sender_user_id", c).neq("sender_role", "coach"))).then((rs) => rs.flatMap((r) => r.data ?? [])),
    Promise.all(chunks(ids).map((c) => admin.from("user_analytics").select("user_id, created_at, event_data").eq("event_type", "command_center_action").in("user_id", c))).then((rs) => rs.flatMap((r) => r.data ?? [])),
  ])

  const staff = new Set(profiles.filter((p) => p.is_admin === true || p.role === "admin" || p.role === "coach" || p.role === "college_coach" || p.verified_coach === true).map((p) => String(p.user_id)))
  const nameOf = new Map(profiles.map((p) => [String(p.user_id), String(p.full_name || p.email || p.user_id)]))
  const acts = new Map<string, Array<{ action: CommandCenterAction; at: string }>>()
  const push = (userId: unknown, action: CommandCenterAction, at: unknown) => {
    if (typeof at !== "string" || !at) return
    const k = String(userId)
    acts.set(k, [...(acts.get(k) ?? []), { action, at }])
  }
  for (const r of list) {
    push(r.user_id, "school_saved", r.created_at)
    push(r.user_id, "coach_emailed", r.coach_emailed_at)
    push(r.user_id, "interest_form", r.questionnaire_done_at)
  }
  for (const r of visits) push(r.user_id, "visit_added", r.created_at)
  for (const r of messages) push(r.sender_user_id, "coach_message", r.created_at)
  for (const r of events) push(r.user_id, (r.event_data as { action?: CommandCenterAction } | null)?.action ?? "school_saved", r.created_at)

  return ids
    .filter((id) => !staff.has(id))
    .map((id) => ({ userId: id, name: nameOf.get(id) ?? id, firstVisit: first.get(id)!.at, site: first.get(id)!.site, actions: acts.get(id) ?? [] }))
}

const pct = (r: number | null) => (r == null ? "–" : `${Math.round(r * 100)}%`)
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })

export default async function CommandCenterActivationPage() {
  const { data: auth } = await (await createClient()).auth.getUser()
  if (!auth.user) redirect("/auth/signin?returnTo=%2Fadmin%2Fcommand-center-activation")
  const admin = createAdminClient()
  const { data: me } = await admin.from("user_profiles").select("is_admin, role").eq("user_id", auth.user.id).maybeSingle()
  if (!(me?.is_admin === true || me?.role === "admin")) redirect("/")

  const now = new Date().toISOString()
  const families = await loadFamilies(admin)
  const rows = families.map((f) => ({ ...activationOf(f, now), name: f.name })).sort((a, b) => b.firstVisit.localeCompare(a.firstVisit))
  const total = activationRate(rows)
  const sites = ["ncu", "rw", "untagged"].map((k) => ({ k, ...activationRate(rows.filter((r) => (r.site ?? "untagged") === k)) })).filter((s) => s.decided + s.open > 0)
  const card = "rounded-xl border border-white/10 bg-[#0d1d36] p-5"
  const onTarget = total.rate != null && total.rate >= ACTIVATION_TARGET

  return (
    <div className="admin-dark-page min-h-screen bg-[#060f1f] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-black">Command Center activation</h1>
        <p className="mt-1 text-sm text-white/55">
          A family is activated when, within {ACTIVATION_DAYS} days of its first Command Center visit, it saves a school, marks a coach emailed, submits an interest form, adds a visit or
          messages a coach. Target {pct(ACTIVATION_TARGET)}. Admins and coaches left out.
        </p>

        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { n: String(rows.length), label: "Families who opened it" },
            { n: pct(total.rate), label: `Activated (target ${pct(ACTIVATION_TARGET)})`, tone: total.rate == null ? "" : onTarget ? "text-emerald-300" : "text-rose-300" },
            { n: `${total.activated} of ${total.decided}`, label: `Activated, ${ACTIVATION_DAYS} days over` },
            { n: String(total.open), label: `Still in their first ${ACTIVATION_DAYS} days` },
          ].map((t) => (
            <li key={t.label} className={card}>
              <p className={`text-3xl font-black tabular-nums ${t.tone ?? ""}`}>{t.n}</p>
              <p className="text-xs text-white/60">{t.label}</p>
            </li>
          ))}
        </ul>

        <section className={`mt-6 ${card}`}>
          <h2 className="text-lg font-bold">By site of first visit</h2>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {sites.map((s) => (
                <tr key={s.k} className="border-t border-white/10">
                  <td className={`py-2 pr-4 ${s.k === "rw" ? "text-[#A3E635]" : s.k === "ncu" ? "text-[#D3B574]" : "text-white/60"}`}>{SITE_LABEL[s.k] ?? "Not tagged (before 1 Nov)"}</td>
                  <td className="py-2 pr-4 text-right font-black tabular-nums">{pct(s.rate)}</td>
                  <td className="py-2 text-right text-white/55 tabular-nums">
                    {s.activated} of {s.decided}
                    {s.open ? ` · ${s.open} open` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={`mt-6 ${card}`}>
          <h2 className="text-lg font-bold">Families</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-white/50">
                  <th className="py-2 pr-4 font-semibold">Family</th>
                  <th className="py-2 pr-4 font-semibold">First visit</th>
                  <th className="py-2 pr-4 font-semibold">Site</th>
                  <th className="py-2 pr-4 font-semibold">Activated</th>
                  <th className="py-2 font-semibold">First action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.userId} className="border-t border-white/10">
                    <td className="py-2 pr-4">{r.name}</td>
                    <td className="py-2 pr-4 text-white/70">{day(r.firstVisit)}</td>
                    <td className="py-2 pr-4 text-white/70">{r.site ? (SITE_LABEL[r.site] ?? r.site) : "–"}</td>
                    <td className={`py-2 pr-4 font-bold ${r.state === "yes" ? "text-emerald-300" : r.state === "no" ? "text-rose-300" : "text-white/60"}`}>
                      {r.state === "yes" ? "Yes" : r.state === "no" ? "No" : "Not yet"}
                    </td>
                    <td className="py-2 text-white/70">
                      {r.first ? `${ACTION_LABEL[r.first.action]} · day ${Math.floor((Date.parse(r.first.at) - Date.parse(r.firstVisit)) / 864e5) + 1}` : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

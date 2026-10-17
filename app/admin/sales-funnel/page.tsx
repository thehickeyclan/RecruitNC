/**
 * The sales funnel for the family plans (17 Oct 2026): who reads the sales pages, who taps a locked
 * college-card action on the map, who starts a checkout, and who ends up subscribed. Counted from
 * user_analytics (page views and funnel events) and recruitnc_subscriptions. Admins only.
 */
import { redirect } from "next/navigation"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const metadata = { title: "Sales funnel | Admin" }

const PAGES = ["/command-center", "/plans", "/rankings", "/blue"] as const

type Row = { event_type: string; page_url: string | null; created_at: string; event_data: { source?: string | null } | null }

async function loadEvents(admin: ReturnType<typeof createAdminClient>, since: string): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error } = await admin
      .from("user_analytics")
      .select("event_type, page_url, created_at, event_data")
      .gte("created_at", since)
      .or(`and(event_type.eq.page_view,page_url.in.(${PAGES.join(",")})),event_type.in.(checkout_started,upsell_click)`)
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...((data ?? []) as Row[]))
    if (!data || data.length < 1000) break
  }
  return rows
}

export default async function SalesFunnelPage() {
  const { data: auth } = await (await createClient()).auth.getUser()
  if (!auth.user) redirect("/auth/signin?returnTo=%2Fadmin%2Fsales-funnel")
  const admin = createAdminClient()
  const { data: me } = await admin.from("user_profiles").select("is_admin, role").eq("user_id", auth.user.id).maybeSingle()
  if (!(me?.is_admin === true || me?.role === "admin")) redirect("/")

  const now = Date.now()
  const since30 = new Date(now - 30 * 864e5).toISOString()
  const since7 = new Date(now - 7 * 864e5).toISOString()
  const [events, subs] = await Promise.all([
    loadEvents(admin, since30).catch(() => [] as Row[]),
    admin.from("recruitnc_subscriptions").select("plan, status, created_at").gte("created_at", since30).then((r) => r.data ?? []),
  ])
  const inWindow = (since: string) => events.filter((e) => e.created_at >= since)
  const count = (rows: Row[], f: (r: Row) => boolean) => rows.filter(f).length
  const windows = [
    { label: "Last 7 days", since: since7 },
    { label: "Last 30 days", since: since30 },
  ]
  const bySource = (rows: Row[], type: string) => {
    const m = new Map<string, number>()
    for (const r of rows.filter((x) => x.event_type === type)) {
      const k = r.event_data?.source ?? "unknown"
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }
  const card = "rounded-xl border border-white/10 bg-[#0d1d36] p-5"

  return (
    <div className="min-h-screen bg-[#060f1f] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-black">Sales funnel</h1>
        <p className="mt-1 text-sm text-white/55">Family plans: sales-page views, map Subscribe taps, checkouts started, subscriptions. Bots are excluded at the source.</p>

        {windows.map((w) => {
          const rows = inWindow(w.since)
          const newSubs = subs.filter((s) => String(s.created_at) >= w.since)
          return (
            <section key={w.label} className="mt-8">
              <h2 className="text-lg font-bold">{w.label}</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                {PAGES.map((p) => (
                  <div key={p} className={card}>
                    <p className="text-3xl font-black">{count(rows, (r) => r.event_type === "page_view" && r.page_url === p)}</p>
                    <p className="text-xs text-white/55">views of {p}</p>
                  </div>
                ))}
                <div className={card}>
                  <p className="text-3xl font-black">{count(rows, (r) => r.event_type === "upsell_click")}</p>
                  <p className="text-xs text-white/55">map Subscribe taps</p>
                </div>
                <div className={card}>
                  <p className="text-3xl font-black">{count(rows, (r) => r.event_type === "checkout_started")}</p>
                  <p className="text-xs text-white/55">checkouts started</p>
                </div>
                <div className={card}>
                  <p className="text-3xl font-black">{newSubs.filter((s) => (s as { plan?: string }).plan === "command_center").length}</p>
                  <p className="text-xs text-white/55">new Command Center subscriptions</p>
                </div>
                <div className={card}>
                  <p className="text-3xl font-black">{newSubs.filter((s) => (s as { plan?: string }).plan !== "command_center").length}</p>
                  <p className="text-xs text-white/55">new Rankings subscriptions</p>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {[
                  ["Checkouts by plan", bySource(rows, "checkout_started")],
                  ["Map Subscribe taps by action", bySource(rows, "upsell_click")],
                ].map(([title, list]) => (
                  <div key={title as string} className={card}>
                    <p className="text-sm font-bold">{title as string}</p>
                    {(list as Array<[string, number]>).length ? (
                      <ul className="mt-2 space-y-1 text-sm text-white/75">
                        {(list as Array<[string, number]>).map(([k, n]) => (
                          <li key={k} className="flex justify-between gap-4">
                            <span>{k}</span>
                            <span className="font-semibold text-white">{n}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-white/45">None yet.</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )
        })}
        <p className="mt-8 text-xs text-white/40">Blue joins are counted on the Blue admin pages, not here.</p>
      </div>
    </div>
  )
}

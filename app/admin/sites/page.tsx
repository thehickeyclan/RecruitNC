/**
 * RecruitWrestlers vs NC United (Matt, 1 Nov 2026: "we need to keep track of RW vs NCU"). New
 * accounts by sign-up brand; claims, signed-in visitors, sign-ins and checkouts by the site the
 * event came from (event_data.site, stamped from 1 Nov 2026). Signed-out visitors are only in
 * Vercel Analytics, one project per site. Admins only.
 */
import { redirect } from "next/navigation"

import { SITE_KEYS, splitBySite, startOfTodayEastern, type SiteAccount, type SiteEvent, type SiteKey } from "@/lib/site-split"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const metadata = { title: "RW vs NC United | Admin" }

const EVENTS = ["page_view", "profile_claimed", "signin_completed", "checkout_started"]

const SITE_LABEL: Record<SiteKey, string> = { rw: "RecruitWrestlers", ncu: "NC United", app: "iPhone app", untagged: "Not tagged" }

const ROWS: Array<{ key: "accounts" | "claims" | "visitors" | "pageViews" | "signIns" | "checkouts"; label: string }> = [
  { key: "accounts", label: "New accounts" },
  { key: "claims", label: "Profiles claimed" },
  { key: "visitors", label: "Signed-in visitors" },
  { key: "pageViews", label: "Signed-in page views" },
  { key: "signIns", label: "Sign-ins" },
  { key: "checkouts", label: "Checkouts started" },
]

async function loadEvents(admin: ReturnType<typeof createAdminClient>, since: string): Promise<SiteEvent[]> {
  const rows: SiteEvent[] = []
  for (let from = 0; from < 100_000; from += 1000) {
    const { data, error } = await admin
      .from("user_analytics")
      .select("id, user_id, event_type, created_at, event_data")
      .gte("created_at", since)
      .in("event_type", EVENTS)
      .order("id")
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    rows.push(...((data ?? []) as SiteEvent[]))
    if (!data || data.length < 1000) break
  }
  return rows
}

async function loadAccounts(admin: ReturnType<typeof createAdminClient>, since: string): Promise<SiteAccount[]> {
  const out: SiteAccount[] = []
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(error.message)
    for (const u of data.users) {
      if (u.created_at >= since) out.push({ created_at: u.created_at, signup_brand: (u.user_metadata?.signup_brand as string | undefined) ?? null })
    }
    if (data.users.length < 1000) break
  }
  return out
}

export default async function SitesPage() {
  const { data: auth } = await (await createClient()).auth.getUser()
  if (!auth.user) redirect("/auth/signin?returnTo=%2Fadmin%2Fsites")
  const admin = createAdminClient()
  const { data: me } = await admin.from("user_profiles").select("is_admin, role").eq("user_id", auth.user.id).maybeSingle()
  if (!(me?.is_admin === true || me?.role === "admin")) redirect("/")

  const now = Date.now()
  const windows = [
    { label: "Today", since: startOfTodayEastern() },
    { label: "Last 7 days", since: new Date(now - 7 * 864e5).toISOString() },
    { label: "Last 30 days", since: new Date(now - 30 * 864e5).toISOString() },
  ]
  const earliest = windows[2].since
  const [events, accounts] = await Promise.all([loadEvents(admin, earliest), loadAccounts(admin, earliest)])
  const card = "rounded-xl border border-white/10 bg-[#0d1d36] p-5"

  return (
    <div className="admin-dark-page min-h-screen bg-[#060f1f] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-black">RecruitWrestlers vs NC United</h1>
        <p className="mt-1 text-sm text-white/55">
          Same accounts, two sites. Events are tagged by site from 1 Nov 2026; older ones show as Not tagged. Signed-out visitors are in Vercel Analytics, one project per site.
        </p>

        {windows.map((w) => {
          const split = splitBySite(events, accounts, w.since)
          const shown = SITE_KEYS.filter((k) => k !== "untagged" && k !== "app" ? true : ROWS.some((r) => split[k][r.key] > 0))
          return (
            <section key={w.label} className={`mt-8 ${card}`}>
              <h2 className="text-lg font-bold">{w.label}</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-white/50">
                      <th className="py-2 pr-4 font-semibold"> </th>
                      {shown.map((k) => (
                        <th key={k} className={`py-2 pr-4 text-right font-semibold ${k === "rw" ? "text-[#A3E635]" : k === "ncu" ? "text-[#D3B574]" : ""}`}>
                          {SITE_LABEL[k]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map((r) => (
                      <tr key={r.key} className="border-t border-white/10">
                        <td className="py-2 pr-4 text-white/75">{r.label}</td>
                        {shown.map((k) => (
                          <td key={k} className="py-2 pr-4 text-right text-lg font-black tabular-nums">
                            {split[k][r.key]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

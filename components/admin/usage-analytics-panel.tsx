"use client"

import { useEffect, useState } from "react"
import { SECTION_LABELS, WINDOW_LABELS, type SectionKey, type WindowKey } from "@/lib/admin/usage-analytics"

type Totals = { views: number; people: number }
type Usage = {
  totalEvents: number
  windows: Record<WindowKey, Totals>
  months: {
    thisMonth: Totals & { label: string }
    lastMonth: Totals & { label: string }
    viewChangePct: number | null
  }
  sections: { section: SectionKey; label: string; views: number; people: number; topPaths: { path: string; views: number }[] }[]
  powerUsers: { userId: string; name: string; email: string | null; views: number; activeDays: number; lastSeen: string; topSection: SectionKey }[]
}

const WINDOW_ORDER: WindowKey[] = ["today", "week", "month", "quarter", "year", "all"]

function monthName(label: string): string {
  const [year, month] = label.split("-").map(Number)
  return new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" })
}

/**
 * How the site is being used, under the user list.
 *
 * Admin traffic is broken out rather than folded in. Six people account for a quarter of all
 * views, and letting that sit inside the section totals would have made the tournament look a
 * third more popular than it is.
 */
export function UsageAnalyticsPanel() {
  const [usage, setUsage] = useState<Usage | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/analytics/usage", { cache: "no-store", credentials: "include" })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error ?? "Could not load usage.")
        setUsage(data)
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load usage."))
  }, [])

  if (error) return <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
  if (!usage) return <p className="mt-6 text-sm text-gray-500">Loading usage…</p>

  const { months } = usage
  const up = months.viewChangePct !== null && months.viewChangePct >= 0

  return (
    <section className="mt-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">How the site is being used</h2>
        <p className="mt-1 text-sm text-gray-500">
          Signed-in page views. {usage.totalEvents.toLocaleString()} recorded.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {WINDOW_ORDER.map((key) => (
          <div key={key} className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{WINDOW_LABELS[key]}</p>
            <p className="mt-1 text-2xl font-bold leading-none text-gray-900">
              {usage.windows[key].views.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-gray-500">{usage.windows[key].people.toLocaleString()} people</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">This month against last</h3>
        <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <p className="text-3xl font-bold leading-none text-gray-900">{months.thisMonth.views.toLocaleString()}</p>
            <p className="mt-1 text-sm text-gray-600">
              {monthName(months.thisMonth.label)} · {months.thisMonth.people} people
            </p>
          </div>
          <div>
            <p className="text-2xl font-semibold leading-none text-gray-400">{months.lastMonth.views.toLocaleString()}</p>
            <p className="mt-1 text-sm text-gray-500">
              {monthName(months.lastMonth.label)} · {months.lastMonth.people} people
            </p>
          </div>
          {months.viewChangePct !== null ? (
            <span
              className={`rounded-full px-3 py-1 text-sm font-bold ${up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
            >
              {up ? "+" : ""}
              {months.viewChangePct}%
            </span>
          ) : (
            <span className="text-sm text-gray-500">No comparison — last month had none.</span>
          )}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          The current month is still running, so it is only a like-for-like comparison at month end.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Where people go</h3>
          <ul className="mt-3 flex flex-col gap-3">
            {usage.sections.map((section) => (
              <li key={section.section}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-gray-900">
                    {section.label}
                    {section.section === "admin" ? (
                      <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-500">
                        your team
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-sm text-gray-600">
                    {section.views.toLocaleString()} · {section.people} people
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-gray-500">
                  {section.topPaths.map((p) => p.path).join("  ·  ")}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Most engaged</h3>
          <p className="mt-1 text-xs text-gray-500">
            Ranked by days active, not clicks — somebody here every week matters more than one long session.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {usage.powerUsers.map((user) => (
              <li key={user.userId} className="flex items-baseline justify-between gap-3 border-b border-gray-100 pb-2 last:border-0">
                <div className="min-w-0">
                  <span className="font-semibold text-gray-900">{user.name}</span>
                  <span className="block truncate text-xs text-gray-500">
                    mostly {SECTION_LABELS[user.topSection]}
                  </span>
                </div>
                <span className="shrink-0 text-sm text-gray-600">
                  {user.activeDays}d · {user.views.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

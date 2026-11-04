/**
 * The Business home (Matt, 4 November 2026): where he and Rhett run RecruitWrestlers.
 *
 * Six weekly charts - profiles created, profiles claimed, profile edits, college views, college
 * stars and logins - filtered by brand, state and gender, plus the way into the other business
 * dashboards. Open to full admins and to accounts holding the business grant
 * (lib/business/access.ts), which is the only thing Rhett has.
 *
 * Counts only. No family name, phone, email or address appears on any page a business grant
 * opens, by instruction (Matt, 4 November 2026). If you add a tile here, keep it that way.
 */
import Link from "next/link"
import { redirect } from "next/navigation"

import { BusinessChart } from "@/components/admin/business-chart"
import { businessData } from "@/lib/business/cache"
import { requireBusinessViewer } from "@/lib/business/require-business-viewer"
import {
  METRICS,
  type Filters,
  type Gender,
  type SiteKey,
  series,
  statesPresent,
} from "@/lib/business/metrics"
import { RECRUITING_BRAND } from "@/lib/recruiting/brand"

export const dynamic = "force-dynamic"
export const maxDuration = 60
export const metadata = { title: "Business | Admin" }

const PAGE = "/admin/business"
const card = "rounded-xl border border-white/10 bg-[#0d1d36] p-5"

const SITES: Array<{ key: SiteKey | "all"; label: string }> = [
  { key: "all", label: "Both brands" },
  { key: "rw", label: "RecruitWrestlers" },
  { key: "ncu", label: "NC United" },
  { key: "app", label: "iPhone app" },
  { key: "untagged", label: "Not tagged" },
]

const WINDOWS: Array<{ key: string; label: string; weeks: number | null }> = [
  { key: "12", label: "12 weeks", weeks: 12 },
  { key: "26", label: "6 months", weeks: 26 },
  { key: "52", label: "12 months", weeks: 52 },
  { key: "all", label: "All time", weeks: null },
]

const LINKS: Array<{ href: string; title: string; what: string }> = [
  { href: "/admin/sites", title: "RecruitWrestlers vs NC United", what: "Accounts, claims, sign-ins and checkouts by brand" },
  { href: "/admin/funnel", title: "Family funnel", what: "Profile to claimed to Insider to Command Center, by state and class" },
  { href: "/admin/coach-usage", title: "College coach usage", what: "Coach adoption week by week, and what they did" },
  { href: "/admin/college-interest", title: "College interest", what: "Which programs are looking at which wrestlers" },
  { href: "/admin/card-analytics", title: "Card analytics", what: "Which wrestlers are getting viewed" },
  { href: "/admin/rankings/board", title: "Rankings board", what: "The boards college coaches recruit from" },
]

/** Admin-only, because it prints a row per family headed by the parent's name or email. */
const ADMIN_LINKS: Array<{ href: string; title: string; what: string }> = [
  { href: "/admin/command-center-activation", title: "Command Center activation", what: "Whether a family's first visit led to anything · admins only" },
]

export default async function BusinessPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const auth = await requireBusinessViewer(PAGE)
  if (!auth.ok) redirect(auth.status === 401 ? `/auth/signin?returnTo=${encodeURIComponent(PAGE)}` : "/")

  const sp = await searchParams
  const data = await businessData()
  const states = statesPresent(data.dims)

  const site = (SITES.find((s) => s.key === sp.site)?.key ?? "all") as SiteKey | "all"
  const state = sp.state && states.includes(sp.state.toUpperCase()) ? sp.state.toUpperCase() : "all"
  const gender: Gender | "all" = sp.gender === "Male" || sp.gender === "Female" ? sp.gender : "all"
  const win = WINDOWS.find((w) => w.key === sp.window) ?? WINDOWS[1]
  const filters: Filters = { state, gender, site }

  const today = new Date().toISOString().slice(0, 10)
  const from = win.weeks
    ? new Date(Date.now() - win.weeks * 7 * 86_400_000).toISOString().slice(0, 10)
    : "2025-04-01"
  const window = { from, to: today }

  const lines = METRICS.map((m) => series(m, data.events[m], data.dims, filters, window))

  const href = (patch: Partial<Record<"site" | "state" | "gender" | "window", string>>) => {
    const next = { site: sp.site, state: sp.state, gender: sp.gender, window: sp.window, ...patch }
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(next)) if (v && v !== "all") q.set(k, v)
    return `${PAGE}${q.size ? `?${q}` : ""}`
  }
  const chip = (on: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold ${on ? "bg-[#A3E635] text-[#060f1f]" : "bg-white/10 text-white/75 hover:bg-white/15"}`

  const stateName = (code: string) => RECRUITING_BRAND.states.find((s) => s.code === code)?.name ?? code
  const read = new Date(data.readAt).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" })

  return (
    <div className="admin-dark-page min-h-screen bg-[#060f1f] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-black">Business</h1>
        <p className="mt-1 text-sm text-white/55">
          RecruitWrestlers and NC United together, or either on its own. Read {read} Eastern, and held for five minutes.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {SITES.map((s) => (
            <Link key={s.key} href={href({ site: s.key })} className={chip(site === s.key)}>
              {s.label}
            </Link>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Link href={href({ state: "all" })} className={chip(state === "all")}>
            All states
          </Link>
          {states.map((s) => (
            <Link key={s} href={href({ state: s })} className={chip(state === s)} title={stateName(s)}>
              {s}
            </Link>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {([
            ["all", "Boys and girls"],
            ["Male", "Boys"],
            ["Female", "Girls"],
          ] as const).map(([k, label]) => (
            <Link key={k} href={href({ gender: k })} className={chip(gender === k)}>
              {label}
            </Link>
          ))}
          <span className="mx-1 text-white/25">|</span>
          {WINDOWS.map((w) => (
            <Link key={w.key} href={href({ window: w.key })} className={chip(win.key === w.key)}>
              {w.label}
            </Link>
          ))}
        </div>

        {state !== "all" ? (
          <p className="mt-4 text-sm text-white/55">
            {stateName(state)} only.{" "}
            <Link href={`/admin/business/state/${state}`} className="font-semibold text-[#A3E635] hover:underline">
              Open the {state} page
            </Link>
            , which is the one with the presenting slide.
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {lines.map((s) => (
            <BusinessChart key={s.metric} series={s} />
          ))}
        </div>

        <h2 className="mt-10 text-xl font-black">The rest of the business</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`${card} block transition hover:border-[#A3E635]/50`}>
              <p className="font-semibold">{l.title}</p>
              <p className="mt-1 text-sm text-white/55">{l.what}</p>
            </Link>
          ))}
          <Link href="/admin/business/deck" className={`${card} block transition hover:border-[#A3E635]/50`}>
            <p className="font-semibold">The family deck</p>
            <p className="mt-1 text-sm text-white/55">Present it, or download the PDF</p>
          </Link>
          {auth.isAdmin
            ? ADMIN_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className={`${card} block transition hover:border-[#A3E635]/50`}>
                  <p className="font-semibold">{l.title}</p>
                  <p className="mt-1 text-sm text-white/55">{l.what}</p>
                </Link>
              ))
            : null}
        </div>

        {auth.isAdmin ? (
          <p className="mt-8 text-xs text-white/35">
            You are here as a full admin.{" "}
            <Link href="/admin" className="underline hover:text-white/60">
              All of admin
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  )
}

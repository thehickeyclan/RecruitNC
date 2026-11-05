/**
 * The family funnel (Matt, 2 Nov 2026): profile → claimed → recruiting-ready → Insider → Command
 * Center → five colleges saved, for North Carolina and South Carolina's current classes, by
 * state, class and traffic source. Read before deciding what to build or market next.
 * Admins, and the business grant (lib/business/access.ts).
 */
import Link from "next/link"
import { redirect } from "next/navigation"

import { hasBusinessGrant } from "@/lib/business/access"

import { applyFilters, awareness, coachActivity, completion, launchClock, stages, sources, transitions, type Filters } from "@/lib/funnel/compute"
import { CHECKPOINT_DAYS, STATE_LAUNCHES } from "@/lib/funnel/launches"
import { loadFunnel } from "@/lib/funnel/load"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60
export const metadata = { title: "Family funnel | Admin" }

const pct = (n: number, of: number | null | undefined) => (of ? `${Math.round((n / of) * 1000) / 10}%` : "–")
const card = "rounded-xl border border-white/10 bg-[#0d1d36] p-5"
const th = "py-2 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-white/50"
const td = "border-t border-white/10 py-2 pr-4 tabular-nums"

export default async function FunnelPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { data: auth } = await (await createClient()).auth.getUser()
  if (!auth.user) redirect("/auth/signin?returnTo=%2Fadmin%2Ffunnel")
  const admin = createAdminClient()
  const { data: me } = await admin.from("user_profiles").select("is_admin, role").eq("user_id", auth.user.id).maybeSingle()
  // Full admins, and the business grant (lib/business/access.ts), which is all Rhett holds.
  if (!(me?.is_admin === true || me?.role === "admin") && !hasBusinessGrant(auth.user.app_metadata)) redirect("/")

  const sp = await searchParams
  const now = new Date()
  const { rows: all, windowStart, checkoutsByPage } = await loadFunnel(admin, now)
  const filters: Filters = {
    state: sp.state === "NC" || sp.state === "SC" ? sp.state : "all",
    classYear: sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : "all",
    source: sp.source || "all",
  }
  const rows = applyFilters(all, filters)
  const st = stages(rows)
  const comp = completion(rows)
  const trans = transitions(rows, now)
  const aware = awareness(applyFilters(all, { ...filters, state: "all", source: "all" }), windowStart)
  const coach = coachActivity(rows)
  const launches = STATE_LAUNCHES.map((l) => launchClock(applyFilters(all, { ...filters, state: "all", source: "all" }), l, now, CHECKPOINT_DAYS))
  const src = sources(applyFilters(all, { ...filters, source: "all" }))
  const years = [...new Set(all.map((a) => a.classYear))].sort()
  const sourceOptions = [...new Set(all.filter((a) => a.claimedAt).map((a) => a.source))].sort()
  const href = (patch: Partial<Record<"state" | "year" | "source", string>>) => {
    const q = new URLSearchParams()
    const next = { state: sp.state, year: sp.year, source: sp.source, ...patch }
    for (const [k, v] of Object.entries(next)) if (v && v !== "all") q.set(k, v)
    return `/admin/funnel${q.size ? `?${q}` : ""}`
  }
  const chip = (on: boolean) => `rounded-full px-3 py-1 text-xs font-semibold ${on ? "bg-[#A3E635] text-[#060f1f]" : "bg-white/10 text-white/75 hover:bg-white/15"}`
  const readyStage = st.find((s) => s.key === "ready")!
  const blue = rows.filter((a) => a.blue && a.claimedAt).length

  return (
    <div className="admin-dark-page min-h-screen bg-[#060f1f] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-black">Family funnel</h1>
        <p className="mt-1 text-sm text-white/55">
          NC and SC, classes {years[0]}–{years[years.length - 1]}. Staff and test accounts are left out. Sources are tracked from 2 Nov 2026; earlier claims show as &ldquo;before tracking&rdquo;.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {(["all", "NC", "SC"] as const).map((s) => (
            <Link key={s} href={href({ state: s })} className={chip(filters.state === s)}>
              {s === "all" ? "Both states" : s}
            </Link>
          ))}
          <span className="mx-1 text-white/25">|</span>
          {(["all", ...years.map(String)] as const).map((y) => (
            <Link key={y} href={href({ year: y })} className={chip(String(filters.classYear) === y)}>
              {y === "all" ? "All classes" : y}
            </Link>
          ))}
          <span className="mx-1 text-white/25">|</span>
          {["all", ...sourceOptions].map((s) => (
            <Link key={s} href={href({ source: s })} className={chip(filters.source === s)}>
              {s === "all" ? "All sources" : s}
            </Link>
          ))}
        </div>

        <section className={`mt-6 ${card}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Claimed profiles that are recruiting-ready</p>
          <p className="mt-1 text-5xl font-black text-[#A3E635]">{pct(readyStage.count, readyStage.of)}</p>
          <p className="mt-1 text-sm text-white/60">
            {readyStage.count} of {readyStage.of} claimed have a GPA, a cell (athlete or parent) and an intended major.
          </p>
        </section>

        {launches.map((l) => (
          <section key={l.state} className={`mt-6 ${card}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold">{l.state} launch · Day {l.day}</h2>
              <p className="text-xs text-white/50">Announced {new Date(`${l.announced}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
            </div>
            <p className="text-sm text-white/55">
              In launch validation: judge it at Day 7, 30 and 60 against other new states, not against NC&rsquo;s totals. {l.profiles.toLocaleString()} profiles waiting to be claimed.
            </p>
            <div className="mt-3 rounded-lg bg-white/5 p-3">
              <p className="text-xs text-white/55">
                Target: {l.target.claimsLow}–{l.target.claimsHigh} claims by Day {l.target.byDay}
              </p>
              <p className="mt-1 text-2xl font-black tabular-nums">
                {l.target.soFar} <span className="text-sm font-semibold text-white/50">claimed since launch</span>
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[#A3E635]" style={{ width: `${Math.min(100, (l.target.soFar / l.target.claimsLow) * 100)}%` }} />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {l.checkpoints.map((c) => (
                <div key={c.day} className="rounded-lg bg-white/5 p-3">
                  <p className="text-xs text-white/55">Day {c.day}</p>
                  {c.claims == null ? (
                    <p className="mt-1 text-sm text-white/40">in {c.day - l.day} days</p>
                  ) : (
                    <>
                      <p className="mt-1 text-2xl font-black tabular-nums">{c.claims}</p>
                      <p className="text-xs text-white/50">claims · {c.ready} ready</p>
                    </>
                  )}
                </div>
              ))}
            </div>
            {l.claimedBefore > 0 && <p className="mt-2 text-xs text-white/40">{l.claimedBefore} claimed before the announcement, not counted.</p>}
          </section>
        ))}

        <section className={`mt-6 ${card}`}>
          <h2 className="text-lg font-bold">Stages</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-6">
            {st.map((s) => (
              <div key={s.key} className="rounded-lg bg-white/5 p-3">
                <p className="text-xs text-white/55">{s.label}</p>
                <p className="mt-1 text-2xl font-black tabular-nums">{s.count.toLocaleString()}</p>
                {s.of != null && <p className="text-xs text-white/50">{pct(s.count, s.of)} {s.ofLabel}</p>}
              </div>
            ))}
          </div>
          {blue > 0 && <p className="mt-3 text-xs text-white/50">{blue} claimed Blue families have Insider and Command Center through the club and are not counted as paid.</p>}
        </section>

        <section className={`mt-6 ${card}`}>
          <h2 className="text-lg font-bold">Profile completion</h2>
          <p className="text-sm text-white/55">Of {comp.claimed} claimed profiles.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr>
                  <th className={th}>Field</th>
                  <th className={`${th} text-right`}>Filled</th>
                  <th className={`${th} text-right`}>%</th>
                  <th className={`${th} text-right`}>Only this missing</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["GPA", comp.gpa, comp.onlyGpaMissing],
                    ["Cell (athlete or parent)", comp.cell, comp.onlyCellMissing],
                    ["Intended major", comp.major, comp.onlyMajorMissing],
                  ] as const
                ).map(([label, n, only]) => (
                  <tr key={label}>
                    <td className={td}>{label}</td>
                    <td className={`${td} text-right font-bold`}>{n}</td>
                    <td className={`${td} text-right`}>{pct(n, comp.claimed)}</td>
                    <td className={`${td} text-right`}>{only}</td>
                  </tr>
                ))}
                <tr>
                  <td className={td}>None of the three</td>
                  <td className={`${td} text-right font-bold`}>{comp.noneOfThree}</td>
                  <td className={`${td} text-right`}>{pct(comp.noneOfThree, comp.claimed)}</td>
                  <td className={td} />
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className={`mt-6 ${card}`}>
          <h2 className="text-lg font-bold">Time between stages</h2>
          <p className="text-sm text-white/55">Each window counts only those who entered at least that long ago. &ldquo;No time&rdquo; reached the stage before its time was recorded.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr>
                  <th className={th}>Step</th>
                  <th className={`${th} text-right`}>Entered</th>
                  <th className={`${th} text-right`}>Reached</th>
                  <th className={`${th} text-right`}>Within 1 day</th>
                  <th className={`${th} text-right`}>Within 7</th>
                  <th className={`${th} text-right`}>Within 30</th>
                  <th className={`${th} text-right`}>Median days</th>
                  <th className={`${th} text-right`}>No time</th>
                </tr>
              </thead>
              <tbody>
                {trans.map((t) => (
                  <tr key={t.label}>
                    <td className={td}>{t.label}</td>
                    <td className={`${td} text-right`}>{t.entered}</td>
                    <td className={`${td} text-right font-bold`}>{t.reached}</td>
                    {t.within.map((w) => (
                      <td key={w.days} className={`${td} text-right`} title={`${w.reached} of ${w.eligible}`}>
                        {pct(w.reached, w.eligible)} <span className="text-xs text-white/40">({w.reached}/{w.eligible})</span>
                      </td>
                    ))}
                    <td className={`${td} text-right`}>{t.medianDays == null ? "–" : t.medianDays.toFixed(1)}</td>
                    <td className={`${td} text-right text-white/50`}>{t.untimed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`mt-6 ${card}`}>
          <h2 className="text-lg font-bold">Views, claim starts and claims, by state</h2>
          <p className="text-sm text-white/55">Last 30 days. Views are by visitors and families, not coaches. NC is an established market; a new state&rsquo;s raw totals aren&rsquo;t comparable to it until it has been promoted for a while.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr>
                  <th className={th}>State</th>
                  <th className={`${th} text-right`}>Profiles</th>
                  <th className={`${th} text-right`}>Unclaimed</th>
                  <th className={`${th} text-right`}>Unclaimed viewed</th>
                  <th className={`${th} text-right`}>Views</th>
                  <th className={`${th} text-right`}>Claim starts</th>
                  <th className={`${th} text-right`}>Claims</th>
                </tr>
              </thead>
              <tbody>
                {aware.map((a) => (
                  <tr key={a.state}>
                    <td className={`${td} font-bold`}>{a.state}</td>
                    <td className={`${td} text-right`}>{a.profiles.toLocaleString()}</td>
                    <td className={`${td} text-right`}>{a.unclaimed.toLocaleString()}</td>
                    <td className={`${td} text-right`}>
                      {a.viewedUnclaimed} <span className="text-xs text-white/40">({pct(a.viewedUnclaimed, a.unclaimed)})</span>
                    </td>
                    <td className={`${td} text-right`}>{a.views.toLocaleString()}</td>
                    <td className={`${td} text-right`}>{a.claimStarts}</td>
                    <td className={`${td} text-right font-bold`}>{a.claims}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-white/40">Claim starts are recorded from 2 Nov 2026.</p>
        </section>

        <section className={`mt-6 ${card}`}>
          <h2 className="text-lg font-bold">College activity, apart from rankings</h2>
          <p className="text-sm text-white/55">Verified college coaches viewing or starring, by program, last 30 days.</p>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {(
              [
                ["Profiles with any program", coach.anyProgram30, coach.profiles],
                ["Profiles with 3+ programs", coach.threePrograms30, coach.profiles],
                ["Claimed with any program", coach.claimedAnyProgram30, coach.claimed],
                ["Insider after coach activity", coach.insiderAfterCoachActivity, coach.insider],
              ] as const
            ).map(([label, n, of]) => (
              <div key={label} className="rounded-lg bg-white/5 p-3">
                <p className="text-xs text-white/55">{label}</p>
                <p className="mt-1 text-2xl font-black tabular-nums">{n}</p>
                <p className="text-xs text-white/50">{pct(n, of)} of {of}</p>
              </div>
            ))}
          </div>
          <h3 className="mt-5 text-sm font-bold">Checkouts started, by page (last 30 days, all states)</h3>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {Object.entries(checkoutsByPage)
              .sort((x, y) => y[1] - x[1])
              .map(([page, n]) => (
                <span key={page} className="rounded-md bg-white/5 px-3 py-1">
                  {page} <b className="ml-1 tabular-nums">{n}</b>
                </span>
              ))}
            {Object.keys(checkoutsByPage).length === 0 && <span className="text-white/50">None.</span>}
          </div>
        </section>

        <section className={`mt-6 ${card}`}>
          <h2 className="text-lg font-bold">Traffic sources</h2>
          <p className="text-sm text-white/55">Where the claiming family first arrived from.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr>
                  <th className={th}>Source</th>
                  <th className={`${th} text-right`}>Claimed</th>
                  <th className={`${th} text-right`}>Ready</th>
                  <th className={`${th} text-right`}>Insider</th>
                </tr>
              </thead>
              <tbody>
                {src.map((s) => (
                  <tr key={s.source}>
                    <td className={td}>
                      <Link href={href({ source: s.source })} className="hover:underline">
                        {s.source}
                      </Link>
                    </td>
                    <td className={`${td} text-right font-bold`}>{s.claimed}</td>
                    <td className={`${td} text-right`}>
                      {s.ready} <span className="text-xs text-white/40">({pct(s.ready, s.claimed)})</span>
                    </td>
                    <td className={`${td} text-right`}>{s.insider}</td>
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

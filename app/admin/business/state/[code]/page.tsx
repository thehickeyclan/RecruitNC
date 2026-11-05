/**
 * One state, for the person about to present it (Matt, 4 November 2026).
 *
 * Profiles, claims, starred, viewed and the programs doing the viewing, boys and girls, with the
 * same six weekly charts narrowed to this state. The presenting slide is reached from here and
 * is live - it is never part of the deck's PDF, because a downloaded number outlives the week it
 * was true in.
 *
 * Counts only, like everything a business grant opens.
 */
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { BusinessChart } from "@/components/admin/business-chart"
import { businessData } from "@/lib/business/cache"
import { requireBusinessViewer } from "@/lib/business/require-business-viewer"
import { METRICS, type Gender, series, stateSummary, statesPresent } from "@/lib/business/metrics"
import { RECRUITING_BRAND } from "@/lib/recruiting/brand"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const card = "rounded-xl border border-white/10 bg-[#0d1d36] p-5"

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return { title: `${code.toUpperCase()} | Business` }
}

const pct = (n: number, of: number) => (of ? `${((n / of) * 100).toFixed(1)}%` : "–")

function Tile({ value, label, note }: { value: string | number; label: string; note?: string }) {
  return (
    <div className={card}>
      <p className="text-3xl font-black tabular-nums">{typeof value === "number" ? value.toLocaleString() : value}</p>
      <p className="mt-1 text-sm font-semibold text-white/70">{label}</p>
      {note ? <p className="mt-1 text-xs text-white/40">{note}</p> : null}
    </div>
  )
}

export default async function BusinessStatePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { code: raw } = await params
  const state = String(raw ?? "").toUpperCase()
  const page = `/admin/business/state/${state}`
  const auth = await requireBusinessViewer(page)
  if (!auth.ok) redirect(auth.status === 401 ? `/auth/signin?returnTo=${encodeURIComponent(page)}` : "/")

  const sp = await searchParams
  const data = await businessData()
  if (!statesPresent(data.dims).includes(state)) notFound()

  const gender: Gender | "all" = sp.gender === "Male" || sp.gender === "Female" ? sp.gender : "all"
  const s = stateSummary(state, gender, data.dims, data.events)
  const boys = stateSummary(state, "Male", data.dims, data.events)
  const girls = stateSummary(state, "Female", data.dims, data.events)

  const today = new Date().toISOString().slice(0, 10)
  const from = new Date(Date.now() - 26 * 7 * 86_400_000).toISOString().slice(0, 10)
  const filters = { state, gender, site: "all" as const }
  const lines = METRICS.map((m) => series(m, data.events[m], data.dims, filters, { from, to: today }))
  const ever = METRICS.map((m) => series(m, data.events[m], data.dims, filters, { from: "2015-01-01", to: "2100-01-01" }))

  const brand = RECRUITING_BRAND.states.find((x) => x.code === state)
  const name = brand?.name ?? state
  const href = (g: string) => `${page}${g === "all" ? "" : `?gender=${g}`}`
  const chip = (on: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold ${on ? "bg-[#A3E635] text-[#060f1f]" : "bg-white/10 text-white/75 hover:bg-white/15"}`

  // Nothing worth standing up and saying yet. Better to know here than in the room.
  const thin = s.claimed === 0 && s.viewed === 0

  return (
    <div className="admin-dark-page min-h-screen bg-[#060f1f] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin/business" className="text-sm font-bold text-[#A3E635] hover:underline">
          ← Business
        </Link>
        <h1 className="mt-3 text-3xl font-black">
          {name} <span className="text-white/35">{state}</span>
        </h1>
        <p className="mt-1 text-sm text-white/55">
          {brand?.live ? "Live to families and college coaches." : "Not live yet: the profiles are in, the state is not open."}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {([
            ["all", "Boys and girls"],
            ["Male", "Boys"],
            ["Female", "Girls"],
          ] as const).map(([k, label]) => (
            <Link key={k} href={href(k)} className={chip(gender === k)}>
              {label}
            </Link>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Tile value={s.profiles} label="Profiles" note={`${s.current.toLocaleString()} in a class a coach can still recruit`} />
          <Tile value={s.claimed} label="Claimed by a family" note={`${pct(s.claimed, s.profiles)} of profiles`} />
          <Tile value={s.viewed} label="Opened by a college coach" note={`${s.views.toLocaleString()} views in all`} />
          <Tile value={s.programs} label="Programs looking" note="Distinct college programs" />
          <Tile value={s.starred} label="Starred by a program" note="A star means the coach is following them" />
          <Tile value={`${boys.profiles.toLocaleString()} / ${girls.profiles.toLocaleString()}`} label="Boys / girls profiles" note={`${girls.claimed} girls' profiles claimed`} />
        </div>

        <div className={`${card} mt-4`}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">By class</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-white/40">
                <th className="py-1 pr-4 font-semibold">Class</th>
                <th className="py-1 pr-4 font-semibold">Profiles</th>
                <th className="py-1 pr-4 font-semibold">Claimed</th>
                <th className="py-1 font-semibold">Claim rate</th>
              </tr>
            </thead>
            <tbody>
              {s.byClass.map((r) => (
                <tr key={r.classYear} className="border-t border-white/10 tabular-nums">
                  <td className="py-2 pr-4 font-semibold">{r.classYear}</td>
                  <td className="py-2 pr-4">{r.profiles.toLocaleString()}</td>
                  <td className="py-2 pr-4">{r.claimed.toLocaleString()}</td>
                  <td className="py-2">{pct(r.claimed, r.profiles)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`${card} mt-4 border-[#A3E635]/40`}>
          <h2 className="font-semibold">The presenting slide</h2>
          {thin ? (
            <p className="mt-1 text-sm text-white/60">
              Not yet for {name}. No family has claimed a profile here and no college coach has opened one, so the slide would
              argue against you. Present the deck without it.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-white/55">
                These numbers as one slide, read live when you open it. It is never in the deck&rsquo;s PDF.
              </p>
              <Link
                href={`/admin/business/deck?state=${state}${gender === "all" ? "" : `&gender=${gender}`}`}
                className="mt-3 inline-block rounded-lg bg-[#A3E635] px-4 py-2 text-sm font-bold text-[#060f1f]"
              >
                Open the deck with {state} in it
              </Link>
            </>
          )}
        </div>

        <h2 className="mt-10 text-xl font-black">Last six months</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {lines.map((line, i) => (
            <BusinessChart key={line.metric} series={line} windowLabel="last 6 months" allTime={ever[i].total} />
          ))}
        </div>
      </div>
    </div>
  )
}

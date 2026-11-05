"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight, Star } from "lucide-react"

import { FitBadge } from "@/components/fit-badge"
import type { JustClaimedCard } from "@/lib/college-programs/just-claimed-for-coach"

/**
 * Recently claimed (Matt, 5 Nov 2026): families who claimed in the last 30 days, from any state.
 * The panel under the board shows four and opens in place; /recently-claimed has them all.
 */
const HONOR_TONE: Record<string, string> = {
  "all-american": "bg-purple-500/20 text-purple-200 ring-purple-400/40",
  "state-champion": "bg-amber-400/20 text-amber-200 ring-amber-400/40",
  "state-placer": "bg-sky-400/15 text-sky-200 ring-sky-400/30",
  "state-qualifier": "bg-white/10 text-white/70 ring-white/20",
}
const chip = (on: boolean) => `rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${on ? "bg-[#D3B574] text-[#0A1628] ring-transparent" : "text-white/70 ring-white/15 hover:ring-white/35"}`

// Calendar days in Eastern time: a claim at 3 pm yesterday is "yesterday", not "today" because 24 hours have not passed.
const day = (t: number) => Math.floor(Date.parse(new Date(t).toLocaleDateString("en-CA", { timeZone: "America/New_York" })) / 864e5)
function ago(iso: string) {
  const d = day(Date.now()) - day(Date.parse(iso))
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`
}

export function ClaimedTile({ w, fresh = false }: { w: JustClaimedCard; fresh?: boolean }) {
  return (
    <Link href={`/athletes/${w.id}`} className="flex h-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 hover:border-[#D3B574]/50 hover:bg-white/[0.06]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={w.photo || "/wrestler-silhouette.png"} alt="" className="h-14 w-14 shrink-0 rounded-full bg-[#13294B] object-cover" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate font-black text-white">{w.name}</span>
          {w.state ? <span className="rounded bg-[#D3B574]/20 px-1.5 py-0.5 text-[11px] font-black text-[#F3DCA4] ring-1 ring-[#D3B574]/40">{w.state}</span> : null}
          {w.classYear ? <span className="rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-black text-[#0A1628]">{w.classYear}</span> : null}
          {w.onBoard ? <Star className="h-3.5 w-3.5 fill-current text-[#D3B574]" aria-label="On your board" /> : null}
          {fresh ? <span className="rounded bg-[#CC0000] px-1.5 py-0.5 text-[10px] font-black uppercase text-white">New</span> : null}
        </span>
        <span className="block truncate text-xs text-white/55">{[w.weight ? `${w.weight} lbs` : null, w.highSchool].filter(Boolean).join(" · ")}</span>
        {w.honor ? <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-black ring-1 ${HONOR_TONE[w.honorLevel] ?? HONOR_TONE["state-qualifier"]}`}>{w.honor}</span> : null}
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-emerald-300">Claimed {ago(w.at)}</span>
          {/* No roster-need chip on a just-claimed card (Matt, 5 Nov 2026). */}
        </span>
        {w.fit ? <FitBadge flag={w.fit} className="mt-1" /> : null}
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-white/30" aria-hidden />
    </Link>
  )
}

const FIRST = 4

/** Under the board on My Recruits: four, then the rest in place, and the full page a tap away. */
export function RecentlyClaimedPanel({ wrestlers }: { wrestlers: JustClaimedCard[] }) {
  const [open, setOpen] = useState(false)
  if (!wrestlers.length) return null
  const shown = open ? wrestlers : wrestlers.slice(0, FIRST)
  return (
    <section className="mt-6 rounded-xl border border-[#D3B574]/40 bg-[#0f1c2e] p-4 sm:p-5" aria-labelledby="ch-claimed">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="ch-claimed" className="text-base font-black uppercase tracking-wide text-white">
          Recently claimed
        </h2>
        <Link href="/recently-claimed" className="inline-flex items-center gap-1 text-xs font-bold text-[#D3B574] hover:underline">
          See all →
        </Link>
      </div>
      <p className="text-xs text-white/45">These families joined in the last 30 days. You can message them now.</p>
      <ul className="mt-3 grid gap-2 lg:grid-cols-2">
        {shown.map((w) => (
          <li key={w.id}>
            <ClaimedTile w={w} />
          </li>
        ))}
      </ul>
      {wrestlers.length > FIRST ? (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-full border border-white/20 px-4 py-1.5 text-sm font-semibold text-white/80 hover:border-white/40 hover:text-white"
          >
            {open ? `Show the first ${FIRST}` : `Show all ${wrestlers.length}`}
          </button>
        </div>
      ) : null}
    </section>
  )
}

/** The full page: every claim in 30 days, by state, class and credential. */
export function RecentlyClaimedList({ wrestlers, seenAt, hasStandard }: { wrestlers: JustClaimedCard[]; seenAt: string | null; hasStandard: boolean }) {
  const [state, setState] = useState<string | null>(null)
  const [year, setYear] = useState<number | null>(null)
  const [honored, setHonored] = useState(false)
  const [fitOnly, setFitOnly] = useState(false)
  const states = useMemo(() => {
    const n = new Map<string, number>()
    for (const w of wrestlers) if (w.state) n.set(w.state, (n.get(w.state) ?? 0) + 1)
    return [...n].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [wrestlers])
  const years = useMemo(() => [...new Set(wrestlers.map((w) => w.classYear).filter((y): y is number => y != null))].sort(), [wrestlers])
  const shown = wrestlers.filter(
    (w) =>
      (!state || w.state === state) &&
      (!year || w.classYear === year) &&
      (!honored || w.honorLevel === "all-american" || w.honorLevel === "state-champion" || w.honorLevel === "state-placer") &&
      (!fitOnly || w.fit?.verdict === "meets"),
  )
  return (
    <div className="mx-auto max-w-5xl text-white">
      <h1 className="text-2xl font-black sm:text-3xl">Recently claimed</h1>
      <p className="mt-1 text-sm text-white/55">
        {wrestlers.length} famil{wrestlers.length === 1 ? "y" : "ies"} joined in the last 30 days. You can message them now.
      </p>
      {wrestlers.length ? (
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={chip(state == null)} onClick={() => setState(null)}>
              All states
            </button>
            {states.map(([code, n]) => (
              <button key={code} type="button" className={chip(state === code)} onClick={() => setState(code)}>
                {code} · {n}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={chip(year == null)} onClick={() => setYear(null)}>
              All classes
            </button>
            {years.map((y) => (
              <button key={y} type="button" className={chip(year === y)} onClick={() => setYear(y)}>
                {y}
              </button>
            ))}
            <span className="mx-1 h-5 w-px bg-white/15" aria-hidden />
            <button type="button" className={chip(honored)} onClick={() => setHonored(!honored)}>
              All-Americans and state placers
            </button>
            {hasStandard ? (
              <button type="button" className={chip(fitOnly)} onClick={() => setFitOnly(!fitOnly)}>
                Meets your Perfect Recruit
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {!wrestlers.length ? (
        <div className="mt-8 rounded-xl border border-white/10 bg-[#0f1c2e] p-8 text-center">
          <p className="font-bold">No new families this month</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-white/55">When a family claims a wrestler&apos;s profile, the wrestler appears here and on My Recruits.</p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          {shown.map((w) => (
            <li key={w.id}>
              <ClaimedTile w={w} fresh={!seenAt || w.at > seenAt} />
            </li>
          ))}
          {!shown.length ? <li className="text-sm text-white/55">No one matches these filters.</li> : null}
        </ul>
      )}
    </div>
  )
}

"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"

import {
  TOC_CONTACT_EMAIL,
  TOC_EVENT_DATES_RANGE,
  TOC_SCHEDULE,
  TOC_VENUE,
  TOC_VENUE_LOUNGES,
  TOC_WEIGH_IN,
} from "@/lib/toc/constants"

/**
 * The recruiting guide, laid out for a spiral binder.
 *
 * Twenty pages is the brief, so the page budget is fixed before anything else: a cover, a page
 * of logistics, one page per weight class, and three at the back. Everything a wrestler gets is
 * therefore about an eighth of a page — seed, who they are, a condensed credential line and at
 * most two significant wins. No match tables.
 *
 * Printed black on white. The screen version is only a proof: the Print button is the product.
 */

type GuideAthlete = {
  athleteId: string
  weightClass: number
  seed: number | null
  name: string
  gradYear: number | null
  highSchool: string | null
  club: string
  committedTo: string | null
  pills: { label: string; kind: "all-american" | "state-champion" | "state-placer" }[]
  credentials: string[]
  wins: string[]
  upNext: string[]
  gpa: string | null
  email: string | null
  phone: string | null
}

type BracketSide = { seed: number; name: string } | null

type GuideWeight = {
  weightClass: number
  locked: boolean
  firstRound: { boutNumber: number; top: BracketSide; bottom: BracketSide }[]
  athletes: GuideAthlete[]
}

type Guide = {
  ok: true
  generatedAt: string
  total: number
  weights: GuideWeight[]
  committed: GuideAthlete[]
  clubs: { name: string; count: number }[]
  index: { name: string; weightClass: number; seed: number | null }[]
}

function Rule({ label }: { label: string }) {
  return (
    <div className="mt-4 mb-2 flex items-center gap-2 border-b-2 border-black pb-1">
      <h2 className="text-[13pt] font-black uppercase tracking-wide">{label}</h2>
    </div>
  )
}

/** First-round pairings with blank advancement lines — a coach fills these in as bouts land. */
function BracketThumb({ weight }: { weight: GuideWeight }) {
  if (!weight.locked || weight.firstRound.length === 0) return null
  return (
    <div className="mb-3 border border-black/30 px-3 py-2">
      <div className="mb-1 text-[7.5pt] font-bold uppercase tracking-widest text-black/60">
        First round · winners bracket
      </div>
      <div className="grid grid-cols-4 gap-x-3">
        {weight.firstRound.map((bout) => (
          <div key={bout.boutNumber} className="text-[8pt] leading-tight">
            <div className="flex gap-1 border-b border-black/70 pb-0.5">
              <span className="w-3 font-bold tabular-nums">{bout.top?.seed ?? "—"}</span>
              <span className="truncate">{bout.top?.name ?? "—"}</span>
            </div>
            <div className="flex gap-1 pt-0.5">
              <span className="w-3 font-bold tabular-nums">{bout.bottom?.seed ?? "—"}</span>
              <span className="truncate">{bout.bottom?.name ?? "—"}</span>
            </div>
            <div className="mt-1 h-3 border-t border-dotted border-black/40" />
          </div>
        ))}
      </div>
    </div>
  )
}

function AthleteEntry({ athlete }: { athlete: GuideAthlete }) {
  const contact = [athlete.phone, athlete.email].filter(Boolean).join(" · ")
  return (
    /*
     * Tight by design. Eight entries, a bracket and a heading share one sheet, and the schedules
     * families keep sending push the busiest weights to the bottom of it: 133 reached 99% of the
     * page with Quincy's eight events and Sumners's four. Reclaiming a few points per entry keeps
     * every weight on one page without dropping anything anybody sent in.
     */
    <div className="break-inside-avoid border-b border-black/20 py-1">
      <div className="flex items-baseline gap-2">
        <span className="w-5 shrink-0 text-[12pt] font-black tabular-nums">{athlete.seed ?? "—"}</span>
        <span className="text-[11pt] font-bold">{athlete.name}</span>
        {athlete.gradYear ? <span className="text-[9pt] font-semibold">&rsquo;{String(athlete.gradYear).slice(-2)}</span> : null}
        <span className="truncate text-[9pt]">
          {athlete.highSchool} <span className="text-black/60">· {athlete.club}</span>
        </span>
        {athlete.committedTo ? (
          <span className="ml-auto shrink-0 border border-black px-1 text-[7.5pt] font-bold uppercase">
            {athlete.committedTo}
          </span>
        ) : null}
      </div>

      {athlete.pills.length > 0 ? (
        <div className="ml-7 mt-0.5 flex flex-wrap gap-1">
          {athlete.pills.map((pill) => (
            <span key={pill.kind} className={`pill pill-${pill.kind}`}>
              {pill.label}
            </span>
          ))}
        </div>
      ) : null}

      {athlete.credentials.length > 0 ? (
        <div className="ml-7 text-[8.5pt] leading-snug">{athlete.credentials.join("  |  ")}</div>
      ) : null}

      {athlete.wins.length > 0 ? (
        <div className="ml-7 text-[8.5pt] leading-snug">
          <span className="font-semibold">Wins over:</span> {athlete.wins.join(", ")}
        </div>
      ) : null}

      {/* Where to see them next — the line a coach acts on after the weekend. */}
      {athlete.upNext.length > 0 ? (
        <div className="ml-7 text-[8.5pt] leading-snug">
          <span className="font-semibold">Up next:</span> {athlete.upNext.join(" · ")}
        </div>
      ) : null}

      {contact || athlete.gpa ? (
        <div className="ml-7 text-[8pt] leading-snug text-black/70">
          {contact}
          {contact && athlete.gpa ? " · " : ""}
          {athlete.gpa ? `GPA ${athlete.gpa}` : ""}
        </div>
      ) : null}
    </div>
  )
}

export default function TocRecruitingGuidePage() {
  const [guide, setGuide] = useState<Guide | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/toc/recruiting-guide", { credentials: "include", cache: "no-store" })
      const payload = await response.json()
      if (!payload.ok) throw new Error(payload.error || "Could not build the guide.")
      setGuide(payload)
      setError("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build the guide.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="min-h-screen bg-white text-black">
      <style>{`
        @page { size: letter portrait; margin: 0.5in; }
        /*
         * Without this the pills print as empty outlines: browsers drop background colour on
         * paper by default, which is the one thing a colour pill cannot survive.
         */
        .pill {
          display: inline-block;
          border-radius: 9999px;
          padding: 0 6px;
          font-size: 7.5pt;
          font-weight: 800;
          line-height: 1.5;
          letter-spacing: 0.02em;
          border: 1px solid;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        /* Each pill also differs in weight and border, so it still reads on a mono printer. */
        .pill-all-american { background: #B31B1B; border-color: #8d1515; color: #fff; }
        .pill-state-champion { background: #D3B574; border-color: #a8904f; color: #13294B; }
        .pill-state-placer { background: #E8EDF4; border-color: #13294B; color: #13294B; }
      `}</style>

      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <span className="text-sm text-gray-600">
            TOC Recruiting Guide{guide ? ` · ${guide.total} wrestlers` : ""}
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!guide}
            className="rounded bg-[#13294B] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Print
          </button>
        </div>
      </div>

      {loading ? <p className="p-10 text-center text-gray-500 print:hidden">Building the guide…</p> : null}
      {error ? <p className="p-10 text-center text-red-600 print:hidden">{error}</p> : null}

      {guide ? (
        <div className="mx-auto max-w-4xl px-6 py-6 print:max-w-none print:p-0">
          {/* Cover */}
          <section className="flex min-h-[9in] flex-col items-center justify-center text-center print:break-after-page">
            <Image src="/images/toc/toc-logo.png" alt="Tournament of Champions" width={340} height={340} priority />
            <h1 className="mt-6 text-[26pt] font-black uppercase leading-none tracking-tight">Recruiting Guide</h1>
            <p className="mt-2 text-[13pt] font-semibold">{TOC_EVENT_DATES_RANGE}</p>
            <p className="mt-1 text-[11pt]">
              {TOC_VENUE.name} · {TOC_VENUE.address}
            </p>
            <p className="mt-8 max-w-md text-[9pt] leading-snug text-black/70">
              Prepared for credentialed college coaching staff. Contains contact details for minors:
              not for redistribution. Wrestlers in the classes of 2029 and later are listed without
              contact details by policy — reach them through their club or {TOC_CONTACT_EMAIL}.
            </p>
          </section>

          {/* Logistics */}
          <section className="print:break-after-page">
            <Rule label="For visiting coaches" />
            <p className="text-[9.5pt] leading-snug">{TOC_VENUE_LOUNGES.lead}</p>
            <p className="mt-1 text-[9.5pt] leading-snug">{TOC_VENUE_LOUNGES.description}</p>

            <Rule label="How to read an entry" />
            <div className="text-[9.5pt] leading-snug">
              <p>
                <strong>Bold number</strong> is the TOC seed. Then the wrestler, class year, high
                school and club. The second line is their record of results — state placements
                first, then national tournaments. <strong>Wins over</strong> lists at most two
                significant wins: opponents in this field, ranked in North Carolina, or ranked
                nationally.
              </p>
              <p className="mt-1">
                Each weight opens with its first-round pairings. Later rounds are left blank to
                fill in as the bracket runs.
              </p>
            </div>

            <Rule label={TOC_SCHEDULE.friday.title} />
            <table className="w-full text-[9pt]">
              <tbody>
                {TOC_SCHEDULE.friday.rows.map((row) => (
                  <tr key={row.time} className="border-b border-black/10">
                    <td className="w-28 py-0.5 font-semibold">{row.time}</td>
                    <td className="py-0.5">{row.activity}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Rule label={TOC_SCHEDULE.saturday.title} />
            <table className="w-full text-[9pt]">
              <tbody>
                {TOC_SCHEDULE.saturday.rows.map((row) => (
                  <tr key={row.time} className="border-b border-black/10">
                    <td className="w-28 py-0.5 font-semibold">{row.time}</td>
                    <td className="py-0.5">{row.activity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[8.5pt] text-black/70">{TOC_WEIGH_IN.headline} · {TOC_WEIGH_IN.time}</p>
          </section>

          {/* One page per weight */}
          {guide.weights.map((weight) => (
            <section key={weight.weightClass} className="print:break-after-page">
              <Rule label={`${weight.weightClass} lbs`} />
              <BracketThumb weight={weight} />
              {weight.athletes.map((athlete) => (
                <AthleteEntry key={athlete.athleteId} athlete={athlete} />
              ))}
            </section>
          ))}

          {/* Back matter */}
          <section className="print:break-after-page">
            <Rule label="Committed" />
            <table className="w-full text-[9.5pt]">
              <tbody>
                {guide.committed.map((athlete) => (
                  <tr key={athlete.athleteId} className="border-b border-black/10">
                    <td className="py-0.5 font-semibold">{athlete.name}</td>
                    <td className="py-0.5">{athlete.weightClass} lbs</td>
                    <td className="py-0.5">&rsquo;{String(athlete.gradYear).slice(-2)}</td>
                    <td className="py-0.5 text-right font-semibold">{athlete.committedTo}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Rule label="Clubs in the field" />
            <div className="columns-2 text-[9.5pt]">
              {guide.clubs.map((club) => (
                <div key={club.name} className="flex justify-between border-b border-black/10 py-0.5">
                  <span className="truncate pr-2">{club.name}</span>
                  <span className="font-bold tabular-nums">{club.count}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <Rule label="Index" />
            <div className="columns-3 text-[9pt]">
              {guide.index.map((row) => (
                <div key={`${row.name}-${row.weightClass}`} className="flex justify-between gap-2 py-0.5">
                  <span className="truncate">{row.name}</span>
                  <span className="shrink-0 tabular-nums text-black/60">{row.weightClass}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

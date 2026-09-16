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

/** One blank slot for a coach to write a name into as the bracket runs. */
function Slot() {
  return <div className="mt-1 h-[13px] border-b border-black/45" />
}

/**
 * The championship side: round one as drawn, then blanks through to the final.
 *
 * Only the winners bracket. The full draw is twelve bouts once consolation is counted, and that
 * side does not shrink to this size legibly — it is the part of the weekend the app is better at,
 * live, than paper ever will be.
 *
 * Round one carries real names because that is the one thing a coach wants off a page: who meets
 * whom. It is printed before Friday's weigh-in, so it says so underneath rather than presenting
 * itself as final.
 */
function BracketThumb({ weight }: { weight: GuideWeight }) {
  if (!weight.locked || weight.firstRound.length === 0) return null
  return (
    <div className="mb-3 break-inside-avoid border border-black/30 px-3 py-2">
      <div className="mb-1 flex gap-2 text-[7.5pt] font-bold uppercase tracking-widest text-black/60">
        <span className="flex-1">Round 1</span>
        <span className="flex-1">Semifinals</span>
        <span className="w-[28%]">Championship</span>
      </div>

      <div className="flex gap-2">
        <div className="flex flex-1 flex-col gap-2">
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
            </div>
          ))}
        </div>

        {/* Two semifinals, each sitting across the two first-round bouts that feed it. */}
        <div className="flex flex-1 flex-col justify-around">
          {[0, 1].map((n) => (
            <div key={n}>
              <Slot />
              <Slot />
            </div>
          ))}
        </div>

        <div className="flex w-[28%] flex-col justify-center">
          <Slot />
          <Slot />
          <div className="mt-1 text-[6.5pt] uppercase tracking-widest text-black/45">Champion</div>
        </div>
      </div>

      <p className="mt-1.5 text-[7pt] leading-tight text-black/55">
        {/* The constant already names the day — "4:00–5:00 PM Friday, September 18". */}
        Round one as drawn. Wrestlers weigh in once, {TOC_WEIGH_IN.time}, so the draw can still
        change — the NC United app carries the live bracket all weekend.
      </p>
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
        /*
         * The Guild's mark is gold baked onto black — there is no transparent version of it.
         * Floated on white it reads as a black box nobody cropped, so it gets a panel that looks
         * deliberate. Same print-color-adjust as the pills: without it the panel prints white and
         * the gold artwork all but disappears.
         */
        .panel-dark {
          background: #0A1628;
          color: #fff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
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
          <section className="flex min-h-[7in] flex-col items-center justify-center text-center print:break-after-page">
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
            {/*
              Opens the book, before any logistics.

              A coach who drove four hours to stand on a wall in Apex should be thanked on the
              first page they read, not in a line at the end nobody reaches.
            */}
            {/* Matt's words, as he wrote them. Signed, because it is a letter and not a notice. */}
            <Rule label="Thank you for being here" />
            <p className="text-[10pt] leading-snug">
              North Carolina wrestling is a community before it is anything else. It&rsquo;s club
              coaches driving across the state on a Saturday, parents running tables, officials
              giving up a weekend, and rooms full of people showing up for somebody else&rsquo;s kid.
            </p>
            <p className="mt-1.5 text-[10pt] leading-snug">
              We also recognize how valuable your time is as a college coach, especially at this time
              of year. The fact that you chose to spend part of your weekend here, evaluating and
              supporting North Carolina wrestlers, means a great deal to our athletes, families and
              wrestling community.
            </p>
            <p className="mt-1.5 text-[10pt] leading-snug">
              Eighty wrestlers earned their way into this building, and not one of them got here
              alone. Behind every name in these pages is a youth coach, a club, a family, and a
              wrestling community that helped get them here.
            </p>
            <p className="mt-1.5 text-[10pt] leading-snug">
              Thank you for supporting North Carolina wrestling and the Tournament of Champions, and
              for investing your time in the athletes competing this weekend.
            </p>
            <p className="mt-1.5 text-[10pt] leading-snug">
              The {TOC_VENUE_LOUNGES.title} is yours all weekend. If you need anything—a bout time, a
              wrestler you want to watch, a family you&rsquo;re trying to reach, or anything
              else—please find us.
            </p>
            <p className="mt-1.5 text-[10pt] leading-snug">
              You can also call or text me directly at 631-662-5409. We would far rather be
              interrupted than have you leave without what you came for.
            </p>
            <p className="mt-2 text-[10pt] font-bold leading-tight">
              Matt Hickey
              <br />
              <span className="font-semibold">NC United</span>
            </p>

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

          {/*
            Weights flow rather than each taking its own sheet.

            Forcing a page per weight left four-fifths of a sheet blank behind the lighter ones —
            285 filled 72% of its page, 197 78%. Individual entries still refuse to split across a
            break, so nobody's line is severed; the weights just start where the last one ended.
          */}
          {guide.weights.map((weight) => (
            <section key={weight.weightClass} className="break-inside-avoid-page">
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

          {/*
            The back page, where a program puts its advertisements.

            QR rather than a printed URL: nobody types apps.apple.com/app/id6803202791 off a page.
            Both codes were generated from the live App Store links and both were checked to
            resolve — a QR that goes nowhere cannot be corrected once the book is bound.
          */}
          <section className="print:break-before-page">
            <Rule label="Two apps worth your pocket" />

            <div className="mt-3 flex items-start gap-4 border border-black/20 p-3">
              <Image src="/images/nc-united-logo.png" alt="NC United" width={96} height={96} className="shrink-0" />
              <div className="flex-1">
                <h3 className="text-[13pt] font-black leading-none">The NC United app</h3>
                <p className="mt-1 text-[9.5pt] leading-snug">
                  The whole tournament in your pocket. Every bracket at every weight, updating as bouts
                  land, so you can follow a wrestler from the warm-up mat to the podium without leaving
                  your seat — and see the field for next year before anybody else does.
                </p>
                <p className="mt-1 text-[8.5pt] font-semibold">Free on the App Store · scan to install</p>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/toc/nc-united-app-qr.svg" alt="" width={84} height={84} className="shrink-0" />
            </div>

            <div className="panel-dark mt-3 flex items-start gap-4 border border-black/20 p-3">
              <Image
                src="/images/sponsors/the-guild-logo.png"
                alt="The Wrestling Guild"
                width={120}
                height={80}
                className="shrink-0"
              />
              <div className="flex-1">
                <h3 className="text-[13pt] font-black leading-none">The Wrestling Guild</h3>
                <p className="mt-1 text-[9.5pt] leading-snug">
                  The Guild connects youth and high school wrestlers with elite coaches in their own
                  communities — private sessions and small groups led by current and former college
                  wrestlers from programs like UNC and NC State.
                </p>
                <p className="mt-1 text-[8.5pt] font-semibold">
                  Premier partner of the Tournament of Champions · scan for the app
                </p>
              </div>
              <div className="shrink-0 bg-white p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/toc/guild-app-qr.svg" alt="" width={76} height={76} />
              </div>
            </div>

            <p className="mt-3 text-[8.5pt] leading-snug text-black/70">
              Everything in this guide — the field, the brackets, and the results as they land — is in
              the NC United app all weekend. Questions about any wrestler in these pages:{" "}
              {TOC_CONTACT_EMAIL}.
            </p>
          </section>
        </div>
      ) : null}
    </div>
  )
}

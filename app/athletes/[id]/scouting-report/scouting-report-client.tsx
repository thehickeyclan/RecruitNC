"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Printer, ArrowLeft, Loader2, Link2, Check } from "lucide-react"
import Link from "next/link"
import type { ScoutingReport } from "@/lib/scouting-report"
import { weightProgression } from "@/lib/scouting-report"
import { cn } from "@/lib/utils"
import { RETAINED_EDITIONS } from "@/lib/national-rankings"
import { ELITE_OPPONENT_PERCENTILE } from "@/lib/competition-strength"

/**
 * The printable scouting report.
 *
 * Deliberately does NOT look like the athlete profile. A profile is a web page a family
 * browses; this is a document a recruiter prints, marks up and takes into a staff meeting.
 * So: ruled data tables rather than cards, numbered sections, a vitals block, tabular
 * figures, serif body copy, and a confidentiality line — the conventions of a scouting
 * dossier rather than of an app screen.
 *
 * Coaches export through the browser's own print dialog, which is how the college recruiting
 * guide already works here. It keeps the text selectable and needs no server-side renderer.
 */
/** Only http(s) or a site-root path is a logo we can draw. */
function isImageUrl(value: string | null | undefined): value is string {
  const v = String(value ?? "").trim()
  return v.length > 0 && (/^https?:\/\//i.test(v) || v.startsWith("/"))
}

export function ScoutingReportClient({ athleteId }: { athleteId: string }) {
  const [report, setReport] = useState<ScoutingReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [purchasable, setPurchasable] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/athletes/${encodeURIComponent(athleteId)}/scouting-report`, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setError(data?.error ?? `Error ${res.status}`)
          // 402 means paying would help — show the offer rather than a dead end.
          setPurchasable(res.status === 402 && data?.purchasable === true)
        } else setReport(data.report as ScoutingReport)
      })
      .catch((e) => !cancelled && setError(e?.message ?? "Failed to load"))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [athleteId])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-gray-600">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Building scouting report…
      </div>
    )
  }

  if (purchasable) {
    return <ScoutingReportPaywall athleteId={athleteId} />
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="text-xl font-bold text-[#03154C]">Scouting report unavailable</h1>
        <p className="mt-3 text-gray-600">{error ?? "No report."}</p>
        <Link href="/prospects/all" className="mt-6 inline-block text-sm font-semibold text-[#B31B1B] hover:underline">
          Back to prospects
        </Link>
      </div>
    )
  }

  return <ScoutingReportDocument report={report} athleteId={athleteId} />
}

/** The document itself, separate from fetching so the layout can be rendered from fixed data. */
export function ScoutingReportDocument({
  report,
  athleteId,
}: {
  report: ScoutingReport
  athleteId: string
}) {
  const [copied, setCopied] = useState(false)

  // Share is a link to this same gated page, never a public snapshot. The report carries a
  // minor's cell number and academics; a token anyone could open would defeat the gate.
  const share = async () => {
    const url = typeof window === "undefined" ? "" : window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt("Copy this link", url)
    }
  }

  /*
   * The browser names a printed PDF after `document.title`, so every report downloaded as
   * "Scouting report | RecruitNC | NC United Wrestling.pdf" — identical for every wrestler, in
   * a folder where a recruiter is keeping thirty of them. The title is swapped for the
   * wrestler's own and put back when the dialog closes.
   *
   * Restored on `afterprint` rather than a timer: the dialog blocks for as long as the coach
   * takes, and a timer either fires while it is still open (renaming the file mid-save) or
   * leaves the tab titled wrongly if they cancel.
   */
  const printReport = () => {
    const previous = document.title
    const safeName = report.identity.name.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim()
    document.title = safeName ? `${safeName} Scouting Report` : previous
    const restore = () => {
      document.title = previous
      window.removeEventListener("afterprint", restore)
    }
    window.addEventListener("afterprint", restore)
    window.print()
  }

  const { identity, academics, membership, contact } = report
  const generated = new Date(report.generatedAt)
  const fileNumber = `NCU-${athleteId.slice(0, 8).toUpperCase()}`
  let section = 0
  const n = () => String(++section).padStart(2, "0")

  return (
    <div className="min-h-screen bg-[#e9eaee] print:bg-white">
      {/*
        The report lives inside the site shell, so printing would otherwise carry the nav,
        the footer and the Data Dawg button onto the page. Hiding those individually breaks
        whenever the shell changes; hiding everything and re-showing this document does not.
      */}
      <style>{`
        @media print {
          /*
           * Hide everything that is not this document, its ancestors, or inside it.
           *
           * The previous rule made the report \`position: absolute\`, which is why only the
           * first page ever came out: an absolutely positioned box is out of flow, and a
           * browser will not paginate it — everything past the first sheet was silently
           * clipped. The report has to stay in normal flow to break across pages.
           *
           * Ancestors are kept (they are the layout chain) but stripped of the shell's spacing
           * so the document still starts at the top of page one.
           */
          body *:not(:has(#scouting-report)):not(#scouting-report):not(#scouting-report *) {
            display: none !important;
          }
          body:has(#scouting-report), body:has(#scouting-report) *:has(#scouting-report) {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            background: #fff !important;
            min-height: 0 !important;
          }
          #scouting-report {
            position: static !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          /*
           * Break inside sections, not inside rows.
           *
           * Every section used to carry break-inside-avoid, so a section that did not fit in
           * what was left of a page moved to the next one whole — page 1 ended after Academics
           * with a third of the sheet empty while Strength of competition sat below the fold.
           *
           * A section is allowed to flow across the break now. What must not split is a table
           * row (a wrestler's name on one page and his result on the next is unreadable) and a
           * section heading, which has to stay with the first of its content.
           */
          #scouting-report tr,
          #scouting-report li,
          #scouting-report dl > div { break-inside: avoid; }
          #scouting-report section > div:first-child { break-after: avoid; }
          #scouting-report thead { display: table-header-group; }
          @page { margin: 0.45in; }
        }
        #scouting-report { font-variant-numeric: tabular-nums; position: relative; }
        /* Faint across the page and repeated in the footer: a coach whose own name is on the
           document behaves differently with it, and a leaked copy carries its source. */
        #scouting-report[data-watermark]::before {
          content: attr(data-watermark);
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          transform: rotate(-28deg);
          font-size: 34px; font-weight: 800; letter-spacing: 0.08em;
          color: rgba(3, 21, 76, 0.055);
          pointer-events: none; z-index: 0; white-space: nowrap;
        }
        #scouting-report > * { position: relative; z-index: 1; }
      `}</style>

      <div className="sticky top-0 z-10 border-b bg-white px-4 py-3 print:hidden">
        <div className="mx-auto flex max-w-[8.5in] items-center justify-between gap-4">
          <Link
            href={`/unified-profile/${athleteId}`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#03154C]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to profile
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={share}
              className="inline-flex items-center gap-2 rounded-md border border-[#03154C]/30 px-3 py-2 text-sm font-semibold text-[#03154C] hover:bg-[#03154C]/5"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Link2 className="h-4 w-4" />}
              {copied ? "Link copied" : "Share"}
            </button>
            <button
              onClick={printReport}
              className="inline-flex items-center gap-2 rounded-md bg-[#B31B1B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8f1616]"
            >
              <Printer className="h-4 w-4" />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      <div
        id="scouting-report"
        data-watermark={report.watermark ?? undefined}
        className="mx-auto my-6 max-w-[8.5in] border border-gray-300 bg-white px-10 py-8 shadow-sm print:my-0 print:border-0 print:px-0 print:shadow-none"
      >
        {/* Masthead — file number and date on the right, the way a dossier is headed. */}
        <div className="flex items-start justify-between gap-6 border-b-[3px] border-[#03154C] pb-3">
          <div className="flex items-center gap-3">
            <Image
              src="/nc-united-logo.png"
              alt="NC United Wrestling"
              width={44}
              height={44}
              className="h-11 w-11 object-contain"
              unoptimized
            />
            <div>
              <div className="text-[13px] font-black uppercase tracking-[0.18em] text-[#03154C]">
                NC United Wrestling
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#B31B1B]">
                Prospect scouting report
              </div>
            </div>
          </div>
          <div className="text-right text-[10px] leading-relaxed text-gray-600">
            <div>
              <span className="uppercase tracking-wider text-gray-400">File</span>{" "}
              <span className="font-mono font-semibold text-[#03154C]">{fileNumber}</span>
            </div>
            <div>
              <span className="uppercase tracking-wider text-gray-400">Issued</span>{" "}
              <span className="font-mono">{generated.toLocaleDateString()}</span>
            </div>
            <div className="mt-0.5 font-semibold uppercase tracking-wider text-[#B31B1B]">Confidential</div>
          </div>
        </div>

        {/* Subject line + vitals block, two columns like a dossier header. */}
        <div className="mt-5 flex items-start justify-between gap-5">
          {/* File photo, sized and bordered like one — a dossier has a portrait, not a hero image. */}
          {identity.photoUrl ? (
            <div className="shrink-0 border border-gray-300 bg-gray-50 p-1">
              <Image
                src={identity.photoUrl}
                alt={identity.name}
                width={104}
                height={130}
                className="h-[130px] w-[104px] object-cover object-top"
                unoptimized
              />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Subject</div>
            <h1 className="mt-0.5 font-serif text-[34px] font-bold leading-none tracking-tight text-[#03154C]">
              {identity.name}
            </h1>
            {report.starRating ? (
              <div className="mt-2 flex items-center gap-2">
                <Stars stars={report.starRating.stars} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {report.starRating.stars} star{report.starRating.stars === 1 ? "" : "s"}
                  {report.starRating.provisional ? " · provisional" : ""}
                </span>
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {report.nationalRankings.length ? (
                <span className="bg-[#B31B1B] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                  National #{report.nationalRankings[0]!.current} ·{" "}
                  {report.nationalRankings[0]!.sourceLabel}
                </span>
              ) : null}
              {report.rankingPublished && report.prospectRanking ? (
                <span className="bg-[#D3B574] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#0A1628]">
                  NC #{report.prospectRanking} · Class of {identity.graduationYear}
                </span>
              ) : null}
              {membership.ncUnitedTeam ? (
                <span className="bg-[#03154C] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                  NC United {membership.ncUnitedTeam}
                </span>
              ) : null}
              <span className="border border-gray-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                {report.commitment ? `Committed · ${report.commitment}` : report.recruitingStatus ?? "Uncommitted"}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              {/*
                A logo only renders from something that is actually a URL.
                Twenty athlete records had their NCHSAA classification in this column — "7A",
                "8A", "NCISAA" — and the report drew a broken image with the school's name as its
                alt text, on the page a college coach pays for.
              */}
              {isImageUrl(identity.highSchoolLogoUrl) ? (
                <Image
                  src={identity.highSchoolLogoUrl}
                  alt={identity.highSchool ?? ""}
                  width={38}
                  height={38}
                  className="h-9 w-9 object-contain"
                  unoptimized
                />
              ) : null}
              {isImageUrl(identity.clubLogoUrl) ? (
                <Image
                  src={identity.clubLogoUrl}
                  alt={identity.club ?? ""}
                  width={38}
                  height={38}
                  className="h-9 w-9 object-contain"
                  unoptimized
                />
              ) : null}
            </div>
          </div>

          <dl className="w-[2.9in] shrink-0 border border-gray-300 bg-[#f7f8fa] px-3 py-2 text-[11px] leading-tight">
            <Vital label="Class" value={identity.graduationYear ? String(identity.graduationYear) : null} />
            {/* "Weight" on its own read as the weight he wrestles. It is the weight he is
                listed at, which is often not the same — naming both stops the reader guessing
                which of the two they are looking at. */}
            <Vital label="Listed weight" value={identity.weightClass ? `${identity.weightClass} lbs` : null} />
            <Vital label="Last competed weight" value={lastCompetedLine(identity)} />
            {/* Sits with the two real weights, since the three together are the honest picture:
                what he is listed at, what he last made, and where he thinks he lands. */}
            <Vital
              label="Projected college"
              value={identity.collegeWeightClass ? `${identity.collegeWeightClass} lbs · athlete-stated` : null}
            />
            <Vital label="High school" value={identity.highSchool} />
            <Vital label="Club" value={identity.club} />
            <Vital label="Career" value={report.careerRecord} />
            <Vital label="Cell" value={contact.cell} />
            <Vital label="Email" value={contact.email} last />
            {report.accessTier !== "full" ? (
              <div className="pt-1 text-[9.5px] italic leading-snug text-gray-500">
                Contact details released to verified college coaching staff.
              </div>
            ) : null}
          </dl>
        </div>

        {report.summary ? (
          <Block n={n()} title="Evaluation">
            <p className="font-serif text-[12.5px] leading-[1.65] text-gray-900">{report.summary}</p>
          </Block>
        ) : null}

        {/*
          Film and the public profiles, which the report has always carried and never drawn.
          `highlightVideoUrl` is released at both access tiers on purpose, and our own claim
          wizard tells athletes film is "the first thing a college coach asks for after your
          record" — it was reaching the page and stopping there.
        */}
        {contact.highlightVideoUrl || contact.floProfileUrl || contact.trackWrestlingProfileUrl ? (
          <Block n={n()} title="Film and profiles">
            <ul className="space-y-1 text-[11.5px] text-gray-900">
              {contact.highlightVideoUrl ? (
                <li>
                  <span className="font-semibold">Highlight film</span>{" "}
                  <a href={contact.highlightVideoUrl} className="break-all underline" target="_blank" rel="noreferrer">
                    {contact.highlightVideoUrl}
                  </a>
                </li>
              ) : null}
              {contact.floProfileUrl ? (
                <li>
                  <span className="font-semibold">FloWrestling</span>{" "}
                  <a href={contact.floProfileUrl} className="break-all underline" target="_blank" rel="noreferrer">
                    {contact.floProfileUrl}
                  </a>
                </li>
              ) : null}
              {contact.trackWrestlingProfileUrl ? (
                <li>
                  <span className="font-semibold">TrackWrestling</span>{" "}
                  <a href={contact.trackWrestlingProfileUrl} className="break-all underline" target="_blank" rel="noreferrer">
                    {contact.trackWrestlingProfileUrl}
                  </a>
                </li>
              ) : null}
            </ul>
          </Block>
        ) : null}

        <Block n={n()} title="Academics">
          {report.accessTier !== "full" ? (
            <Note>
              Academic records are released to verified college coaching staff.
              {academics.academicInterest ? ` Intended major: ${academics.academicInterest}.` : ""}
            </Note>
          ) : academics.gpa || academics.sat || academics.act || academics.academicInterest ? (
            <div className="grid grid-cols-4 gap-px border border-gray-300 bg-gray-300">
              <Cell label="GPA" value={academics.gpa} />
              <Cell label="SAT" value={academics.sat} />
              <Cell label="ACT" value={academics.act} />
              <Cell label="Intended major" value={academics.academicInterest} />
            </div>
          ) : (
            <Note>No academic information on file.</Note>
          )}
          {academics.academicSummary ? (
            <p className="mt-2 font-serif text-[12px] leading-relaxed text-gray-800">
              {academics.academicSummary}
            </p>
          ) : null}
        </Block>

        {report.starRating ? (
          <Block n={n()} title="Star rating">
            <div className="flex items-baseline gap-3">
              <Stars stars={report.starRating.stars} />
              <span className="font-mono text-[11px] text-gray-600">
                {report.starRating.score}/100
                {report.starRating.provisional ? " · provisional, thin record on file" : ""}
              </span>
            </div>
            <Table head={["Component", "Earned", "Basis"]} widths={["10rem", "4.5rem", "auto"]}>
              {report.starRating.components.map((c) => (
                <tr key={c.key} className="border-t border-gray-200">
                  <Td bold>{c.label}</Td>
                  <Td mono>
                    {c.points}/{c.max}
                  </Td>
                  <Td>{c.detail}</Td>
                </tr>
              ))}
            </Table>
            {/* The defence of the number is that it can be walked through, so it always is. */}
            <p className="mt-1.5 text-[9px] leading-relaxed text-gray-500">
              Built only from results on file, never a projection of college ceiling. Five stars
              requires a current national ranking from FloWrestling, Sports Illustrated or MatScouts
              and a record that independently earns four. Rated for the classes RecruitNC ranks.
            </p>
          </Block>
        ) : null}

        {report.nationalRankings.length ? (
          <Block n={n()} title="National ranking history">
            <Table head={["Outlet", "Current", "By month", "Movement"]} widths={["9rem", "4.5rem", "auto", "6rem"]}>
              {report.nationalRankings.map((series) => (
                <tr key={series.source} className="border-t border-gray-200">
                  <Td bold>{series.sourceLabel}</Td>
                  <Td mono>#{series.current}</Td>
                  <Td mono>
                    {series.editions.map((e) => `${monthLabel(e.rankingMonth)} #${e.rank}`).join(" · ")}
                  </Td>
                  <Td>{movementLabel(series.movement)}</Td>
                </tr>
              ))}
            </Table>
            <p className="mt-1.5 text-[9px] leading-relaxed text-gray-500">
              Weight class as published by the outlet. Only the {RETAINED_EDITIONS} most recent monthly
              editions are retained, so movement describes that window and no further back.
            </p>
          </Block>
        ) : null}

        {/*
          Strength of competition — renamed from "schedule", which only ever described the
          in-season half. The season figures come from the same bouts the star rating is built
          on; the ranked-win counts come from the same bouts the table below prints.

          No composite score, deliberately. A single number would have to answer "out of what?",
          and the previous copy here claimed a 95th percentile we cannot define: the value is
          pasted in from an outside source and 41% of all rated bouts on file clear it. The
          rating is reported; the population is not named.
        */}
        {report.seasonStrength && report.seasonStrength.bouts > 0 ? (
          <Block n={n()} title="Strength of competition">
            {/*
              One table, in the same language as Significant wins and Notable losses below, so
              the section reads as part of the report rather than a dashboard bolted to it.

              Each row carries its own basis, on the same line as the number.

              The two rows built on the imported opponent rating are gone. The rating still
              arrives with every import — 88% of 2025-26 bouts carry one — so this is not about
              stale data. It is that nobody here can say what the number measures: it is pasted
              in from an outside source, no definition travels with it, and a figure a college
              coach cannot have explained to them does not belong on a report they paid for.
              Bonus rate went too: falls, techs and majors are well recorded and simply do not
              answer the question this section asks, which is who a wrestler has faced.
            */}
            <Table head={["Measure", "Value", "Basis"]} widths={["12rem", "6.5rem", "auto"]}>
              <tr className="border-t border-gray-200">
                <Td bold>In-season record</Td>
                <Td mono>{`${report.seasonStrength.wins}-${report.seasonStrength.losses}`}</Td>
                <Td>
                  {report.seasonStrength.bouts} bouts
                  {report.seasonStrengthSeason ? ` in the ${report.seasonStrengthSeason} season` : ""} — duals, tris,
                  invitationals and the NCHSAA postseason. National and post/preseason events are listed under
                  Competition record, not counted here.
                </Td>
              </tr>
              <tr className="border-t border-gray-200">
                <Td bold>Wins over ranked opponents</Td>
                <Td mono>{report.strengthOfCompetition.rankedWins.total}</Td>
                <Td>
                  {report.strengthOfCompetition.rankedWins.national} nationally ranked ·{" "}
                  {report.strengthOfCompetition.rankedWins.tocField} Tournament of Champions field ·{" "}
                  {report.strengthOfCompetition.rankedWins.stateRanked} NC ranked
                </Td>
              </tr>
              <tr className="border-t border-gray-200">
                <Td bold>Losses to ranked opponents</Td>
                <Td mono>{report.strengthOfCompetition.credentialedLosses}</Td>
                <Td>Listed in full under Notable losses</Td>
              </tr>
              {weightProgression(report.results) ? (
                <tr className="border-t border-gray-200">
                  <Td bold>Competed at</Td>
                  <Td mono>—</Td>
                  <Td>{weightProgression(report.results)}</Td>
                </tr>
              ) : null}
            </Table>

            {/*
              The verdict, not a measurement.
              
              A family reading this is owed the thing a college coach already knows: a state
              title does not prove you have been tested. Red means no ranked wins, no national
              competition, in-season only. Green means all three. Every band names the cheapest
              step up, because the point of showing it is to get kids wrestling the best, and a
              grade nobody can act on is only a judgement.
            */}
            <div
              className={cn(
                "mt-3 rounded border p-3",
                report.strengthOfCompetition.grade.band === "green" && "border-emerald-300 bg-emerald-50",
                report.strengthOfCompetition.grade.band === "amber" && "border-amber-300 bg-amber-50",
                report.strengthOfCompetition.grade.band === "orange" && "border-orange-300 bg-orange-50",
                report.strengthOfCompetition.grade.band === "red" && "border-red-300 bg-red-50",
              )}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className={cn(
                    "text-[13px] font-bold uppercase tracking-wide",
                    report.strengthOfCompetition.grade.band === "green" && "text-emerald-800",
                    report.strengthOfCompetition.grade.band === "amber" && "text-amber-800",
                    report.strengthOfCompetition.grade.band === "orange" && "text-orange-800",
                    report.strengthOfCompetition.grade.band === "red" && "text-red-800",
                  )}
                >
                  {report.strengthOfCompetition.grade.label}
                </span>
                <span className="font-mono text-[11px] text-gray-600">
                  {report.strengthOfCompetition.grade.score}/6
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-gray-800">
                {report.strengthOfCompetition.grade.verdict}
              </p>
              <ul className="mt-2 space-y-1">
                {report.strengthOfCompetition.grade.factors.map((factor) => (
                  <li key={factor.key} className="flex items-baseline gap-2 text-[11px]">
                    <span
                      aria-hidden
                      className={cn(
                        "inline-block h-2 w-2 shrink-0 rounded-full",
                        factor.points === 2 && "bg-emerald-600",
                        factor.points === 1 && "bg-amber-500",
                        factor.points === 0 && "bg-red-500",
                      )}
                    />
                    <span className="font-medium text-gray-700">{factor.label}:</span>
                    <span className="text-gray-600">{factor.detail}</span>
                  </li>
                ))}
              </ul>
              {report.strengthOfCompetition.grade.nextStep ? (
                <p className="mt-2 text-[11px] font-semibold text-gray-800">
                  Next step: {report.strengthOfCompetition.grade.nextStep}
                </p>
              ) : null}
            </div>

            {report.strengthOfCompetition.seasonsOnFile <= 1 ? (
              <p className="mt-2 text-[9.5px] leading-snug text-amber-700">
                One season on file. A wrestler who transferred in, or is in their first year, will read as quiet here
                whatever they have done elsewhere.
              </p>
            ) : null}
          </Block>
        ) : null}

        <Block n={n()} title="Competition record">
          {report.results.length ? (
            <Table head={["Date", "Event", "Result"]} widths={["5.2rem", "11rem", "auto"]}>
              {report.results.map((row, i) => (
                <tr key={i} className="border-t border-gray-200">
                  {/* The day where we have it, the year where the source only published one. */}
                  <Td mono>{row.date ? dayLabel(row.date) : row.year}</Td>
                  <Td bold>{row.event}</Td>
                  <Td>{row.detail}</Td>
                </tr>
              ))}
            </Table>
          ) : (
            <Note>No tournament results on file.</Note>
          )}
        </Block>

        <Block n={n()} title="Significant wins" count={report.significantWins.length}>
          <BoutTable rows={report.significantWins} kind="win" />
        </Block>

        <Block n={n()} title="Notable losses" count={report.significantLosses.length}>
          <BoutTable rows={report.significantLosses} kind="loss" />
        </Block>

        <footer className="mt-7 border-t-2 border-[#03154C] pt-2 text-[9px] leading-relaxed text-gray-500">
          <p>
            <span className="font-bold uppercase tracking-wider text-[#B31B1B]">Method.</span> Significant
            results are those against wrestlers ranked nationally by FloWrestling, Sports Illustrated or
            MatScouts, in the NC Tournament of Champions field, or ranked as North Carolina prospects —
            labelled per bout, since they are not the same standing. This is not a complete match list —
            routine results are omitted by design.
          </p>
          <p className="mt-1">
            <span className="font-bold uppercase tracking-wider text-[#B31B1B]">Confidential.</span>{" "}
            {report.watermark ? (
              <>
                {report.watermark}. Contains contact information for a prospective student-athlete; do not
                redistribute. This copy is traceable to the recipient named above.
              </>
            ) : (
              <>
                Competition analysis only. Contact details and academic records are released to verified
                college coaching staff.
              </>
            )}{" "}
            File {fileNumber} · issued {generated.toLocaleString()} · NC United Wrestling / RecruitNC.
          </p>
        </footer>
      </div>
    </div>
  )
}

/**
 * Five glyphs, filled to the rating.
 *
 * Always five outlines so the number is read at a glance against a fixed scale — three filled
 * of five, not three marks floating on their own.
 */
function Stars({ stars }: { stars: number }) {
  return (
    <span className="inline-flex gap-px" aria-label={`${stars} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
          <path
            d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L1.5 7.7l5.9-.9z"
            fill={i <= stars ? "#D3B574" : "none"}
            stroke={i <= stars ? "#B8963F" : "#C8CDD4"}
            strokeWidth="1.2"
          />
        </svg>
      ))}
    </span>
  )
}

function Vital({ label, value, last }: { label: string; value: string | null; last?: boolean }) {
  if (!value) return null
  return (
    <div className={`flex justify-between gap-3 py-1 ${last ? "" : "border-b border-gray-200"}`}>
      <dt className="shrink-0 uppercase tracking-wider text-gray-500">{label}</dt>
      {/* Wraps rather than truncating: "Last competed" carries weight, event and date, and a
          clipped event name is the half a coach needs. */}
      <dd className="min-w-0 text-right font-semibold leading-tight text-[#03154C]">{value}</dd>
    </div>
  )
}

function Block({
  n,
  title,
  count,
  children,
}: {
  n: string
  title: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-baseline gap-2 border-b-2 border-[#03154C] pb-1">
        <span className="font-mono text-[10px] font-bold text-[#B31B1B]">{n}</span>
        <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-[#03154C]">{title}</h2>
        {count !== undefined ? (
          <span className="ml-auto font-mono text-[10px] text-gray-500">{count} recorded</span>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function Cell({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="bg-white px-2 py-1.5 text-[11.5px]">
      <div className="text-[9px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="font-semibold text-[#03154C]">{value ?? "—"}</div>
    </div>
  )
}

/**
 * "132 lbs · Super 32 Early Entry (VA) · 14 Sep 2026".
 *
 * The weight on its own answers less than a coach needs: a weight made eight months ago at a
 * state tournament and one made last weekend at a national qualifier are different facts. Most
 * result tables record only a year, so the year stands alone when there is no day.
 */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gray-300 bg-[#f7f8fa] px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="font-semibold text-gray-900">{value}</div>
    </div>
  )
}

function lastCompetedLine(identity: ScoutingReport["identity"]): string | null {
  if (!identity.lastCompetedWeight) return null
  const when = identity.lastCompetedDate
    ? dayLabel(identity.lastCompetedDate)
    : identity.lastCompetedYear
      ? String(identity.lastCompetedYear)
      : null
  return [`${identity.lastCompetedWeight} lbs`, identity.lastCompetedEvent, when]
    .filter(Boolean)
    .join(" · ")
}

/**
 * "14 Sep 2026", or the raw value if it is not a date we can read.
 *
 * A bare "2026-08-23" is parsed by `new Date` as UTC midnight, which is still the 22nd in every
 * US timezone — so a wrestler's last bout showed a day early. These are calendar dates with no
 * time in them, so the parts are read directly and never cross a timezone.
 */
function dayLabel(value: string): string {
  const ymd = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  const parsed = ymd
    ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))
    : new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

/** "Sep 2026" from a `date` column — the outlet's edition, not the day we imported it. */
function monthLabel(rankingMonth: string): string {
  const [year, month] = rankingMonth.slice(0, 7).split("-")
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const name = names[Number(month) - 1]
  return name ? `${name} ${year}` : rankingMonth
}

/**
 * Movement in words rather than a coloured arrow.
 *
 * A single retained edition is not a trend and must not read as one — it says so instead of
 * showing a flat line a coach would take as "went nowhere".
 */
function movementLabel(movement: number | null): string {
  if (movement == null) return "One edition"
  if (movement === 0) return "Unchanged"
  const places = Math.abs(movement) === 1 ? "place" : "places"
  return movement > 0 ? `Up ${movement} ${places}` : `Down ${Math.abs(movement)} ${places}`
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="font-serif text-[12px] italic text-gray-500">{children}</p>
}

function Table({
  head,
  widths,
  children,
}: {
  head: string[]
  widths: string[]
  children: React.ReactNode
}) {
  return (
    <table className="w-full border-collapse text-[11.5px]">
      <thead>
        <tr className="border-b border-gray-400">
          {head.map((h, i) => (
            <th
              key={h}
              style={{ width: widths[i] }}
              className="pb-1 text-left text-[9px] font-bold uppercase tracking-wider text-gray-500"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}

function Td({ children, mono, bold }: { children: React.ReactNode; mono?: boolean; bold?: boolean }) {
  return (
    <td
      className={`py-1.5 pr-2 align-top ${mono ? "font-mono text-gray-700" : ""} ${
        bold ? "font-semibold text-[#03154C]" : "text-gray-700"
      }`}
    >
      {children}
    </td>
  )
}

/**
 * The three standings kept apart.
 *
 * These used to collapse into one "Ranked" badge, which made a win over a nationally ranked
 * wrestler look the same as one over a state-ranked wrestler — the single most valuable line
 * on the page, flattened. A coach must be able to tell them apart at a glance.
 */
const STANDING: Record<
  ScoutingReport["significantWins"][number]["reason"],
  { label: string; className: string }
> = {
  "national-ranked": { label: "Nat'l ranked", className: "bg-[#B31B1B] text-white" },
  "toc-field": { label: "TOC field", className: "bg-[#D3B574] text-[#0A1628]" },
  ranked: { label: "NC ranked", className: "bg-[#03154C] text-white" },
}

function BoutTable({ rows, kind }: { rows: ScoutingReport["significantWins"]; kind: "win" | "loss" }) {
  if (!rows.length) {
    return (
      <Note>
        {kind === "win"
          ? "No wins over nationally ranked, state-ranked or Tournament of Champions wrestlers on file."
          : "No losses to nationally ranked, state-ranked or Tournament of Champions wrestlers on file."}
      </Note>
    )
  }
  return (
    <Table
      head={["Opponent", "Affiliation", "Standing", "Result", "Event", "Date"]}
      widths={["7.5rem", "6.5rem", "6rem", "4.25rem", "auto", "5.5rem"]}
    >
      {rows.map((row, i) => (
        <tr key={i} className="border-t border-gray-200">
          <Td bold>{row.opponent}</Td>
          <Td>{row.opponentSchool ?? "—"}</Td>
          <td className="py-1.5 pr-2 align-top">
            <span
              className={`inline-block whitespace-nowrap px-1 py-0.5 text-[8.5px] font-black uppercase tracking-wider ${
                STANDING[row.reason].className
              }`}
            >
              {STANDING[row.reason].label}
            </span>
            {/* The outlet and number, because "nationally ranked" invites "by whom, and where". */}
            {row.nationalRankLabel ? (
              <div className="mt-0.5 text-[8.5px] leading-tight text-gray-500">{row.nationalRankLabel}</div>
            ) : null}
          </td>
          <Td mono>{row.result ?? "—"}</Td>
          <Td>{row.event ?? "—"}</Td>
          <td className="whitespace-nowrap py-1.5 pr-2 align-top font-mono text-gray-700">
            {row.date ? dayLabel(row.date) : "—"}
          </td>
        </tr>
      ))}
    </Table>
  )
}

/**
 * The offer, shown when the report exists but this account has not paid for it.
 *
 * Says plainly what is and is not in it. A buyer who expects a phone number and finds the
 * competition record is a refund; contact details and academics follow coach verification and
 * are not for sale, so the offer had better not imply otherwise.
 */
function ScoutingReportPaywall({ athleteId }: { athleteId: string }) {
  const [busy, setBusy] = useState<"single" | "subscription" | null>(null)

  async function buy(kind: "single" | "subscription") {
    setBusy(kind)
    try {
      const res = await fetch("/api/scouting-report/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ athleteId, kind }),
      })
      const data = await res.json().catch(() => ({}))
      if (data?.url) window.location.href = data.url as string
      else {
        setBusy(null)
        alert(data?.error ?? "Could not start checkout.")
      }
    } catch {
      setBusy(null)
      alert("Could not start checkout.")
    }
  }

  return (
    <div className="min-h-screen bg-[#0A1628] px-4 py-16">
      <div className="mx-auto max-w-lg rounded-sm border border-white/10 bg-[#0f1c2e] p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D3B574]">Scouting report</p>
        <h1 className="mt-2 text-2xl font-black text-white">See the full report</h1>
        <p className="mt-2 text-sm text-white/60">
          Competition record, significant wins and losses against ranked and Tournament of
          Champions wrestlers, strength of schedule, and the national picture.
        </p>
        <p className="mt-2 text-xs text-white/40">
          Contact details and academic records are released to verified college coaching staff
          only, and are not part of a purchase.
        </p>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => void buy("single")}
            disabled={busy !== null}
            className="flex min-h-[52px] w-full items-center justify-between rounded-sm bg-[#B31B1B] px-4 text-left text-white hover:bg-[#8f1616] disabled:opacity-60"
          >
            <span>
              <span className="block text-sm font-bold">This report</span>
              <span className="block text-xs text-white/70">One athlete, keep it for good</span>
            </span>
            <span className="text-lg font-black">$4.99</span>
          </button>

          <button
            onClick={() => void buy("subscription")}
            disabled={busy !== null}
            className="flex min-h-[52px] w-full items-center justify-between rounded-sm border border-[#D3B574] bg-transparent px-4 text-left text-[#D3B574] hover:bg-[#D3B574]/10 disabled:opacity-60"
          >
            <span>
              <span className="block text-sm font-bold">RecruitNC membership</span>
              <span className="block text-xs text-[#D3B574]/70">
                Every scouting report, full rankings, cancel any time
              </span>
            </span>
            <span className="text-lg font-black">$9.99/mo</span>
          </button>
        </div>

        <p className="mt-5 text-xs text-white/40">
          Your own wrestler&rsquo;s report is always free — claim their profile to see it.
        </p>
        <Link href={`/unified-profile/${athleteId}`} className="mt-4 inline-block text-sm text-white/50 hover:text-white/80">
          Back to profile
        </Link>
      </div>
    </div>
  )
}

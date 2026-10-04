"use client"

import { Fragment, useEffect, useState } from "react"
import Image from "next/image"
import { Printer, ArrowLeft, Loader2, Link2, Check } from "lucide-react"
import Link from "next/link"
import type { ScoutingReport } from "@/lib/scouting-report"
import { weightProgression } from "@/lib/scouting-report"
import { cn } from "@/lib/utils"
import { competitionLine, isInternationalStyle, styleOfEvent, stylesLine, styleOfEventForAthlete } from "@/lib/wrestling-style"
import { RETAINED_EDITIONS } from "@/lib/national-rankings"
import { keyFacts, snapshotFigures, starPart } from "@/lib/scouting-report-snapshot"
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

  /*
   * Log each download. Listening for the print itself catches the button and Cmd+P alike - both
   * go through the browser's dialog, which is where the PDF is saved.
   */
  useEffect(() => {
    const logDownload = () => {
      void fetch(`/api/athletes/${encodeURIComponent(athleteId)}/scouting-report/download`, {
        method: "POST",
        credentials: "include",
        keepalive: true,
      }).catch(() => {})
    }
    window.addEventListener("beforeprint", logDownload)
    return () => window.removeEventListener("beforeprint", logDownload)
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
  // Folkstyle and Olympic styles never share a section: the NCHSAA State Championships and the NC
  // Freestyle & Greco State Championships are different titles (Matt).
  const olympicRow = (style: ReturnType<typeof styleOfEvent>) => isInternationalStyle(style)
  /*
   * The Ultimate Club Duals are folkstyle for the men and freestyle for the women (Matt), so the
   * split needs to know whose report this is - and must match the profile, or the two documents
   * disagree about the same wrestler.
   */
  const reportGender = report.identity?.gender ?? null
  const styleOf = (event: string | null, detail?: string | null) => styleOfEventForAthlete(event, detail ?? null, reportGender)
  const folkResults = report.results.filter((r) => !olympicRow(r.style ?? styleOf(r.event, r.detail)))
  const olympicResults = report.results.filter((r) => olympicRow(r.style ?? styleOf(r.event, r.detail)))
  // Individual events first, then dual results (Junior National Duals), as on the profile.
  const olympicDuals = olympicResults.filter((r) => /\bduals?\b/i.test(r.event))
  const olympicIndividual = olympicResults.filter((r) => !/\bduals?\b/i.test(r.event))
  const allWins: BoutRow[] = [...report.significantWins, ...(report.reportedWins ?? []).map(reportedRow)]
  const folkWins = allWins.filter((w) => !olympicRow(styleOf(w.event)))
  const olympicWins = allWins.filter((w) => olympicRow(styleOf(w.event)))
  const folkLosses = report.significantLosses.filter((w) => !olympicRow(styleOf(w.event)))
  const olympicLosses = report.significantLosses.filter((w) => olympicRow(styleOf(w.event)))
  const snapshot = snapshotFigures(report)
  const facts = keyFacts(report)

  return (
    <div className="min-h-screen bg-[#e9eaee] print:bg-white">
      {/*
        The report lives inside the site shell, so printing would otherwise carry the nav,
        the footer and the Data Dawg button onto the page. Hiding those individually breaks
        whenever the shell changes; hiding everything and re-showing this document does not.
      */}
      {/* Raw, not children: React escapes quote marks in a <style> child, which broke the
          quoted page-footer strings below in the server-rendered page. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
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
          #scouting-report h3 { break-after: avoid; }
          #scouting-report thead { display: table-header-group; }
          /*
           * Our own running footer instead of the browser's date, title and URL. The page margin
           * boxes print on every sheet; the browser's header/footer option has nothing to add.
           */
          @page {
            margin: 0.45in 0.45in 0.6in;
            @top-left { content: none; }
            @top-right { content: none; }
            @bottom-left {
              content: "NC UNITED · RECRUITNC · CONFIDENTIAL";
              font: 700 7.5pt/1 system-ui, sans-serif; letter-spacing: 0.12em; color: #4b5563;
            }
            @bottom-right {
              content: "PAGE " counter(page) " / " counter(pages) "   ·   FILE ${fileNumber}";
              font: 600 7.5pt/1 system-ui, sans-serif; letter-spacing: 0.08em; color: #4b5563;
            }
          }
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
          color: rgba(3, 21, 76, 0.045);
          pointer-events: none; z-index: 0; white-space: nowrap;
        }
        #scouting-report > * { position: relative; z-index: 1; }
      `,
        }}
      />

      <div className="sticky top-0 z-10 border-b bg-white px-4 py-3 print:hidden">
        <div className="mx-auto flex max-w-[8.5in] items-center justify-between gap-4">
          <Link
            href={`/unified-profile/${athleteId}`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#03154C]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sm:hidden">Back</span>
            <span className="hidden sm:inline">Back to profile</span>
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
              <span className="whitespace-nowrap">
                <span className="sm:hidden">PDF</span>
                <span className="hidden sm:inline">Download PDF</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <div
        id="scouting-report"
        data-watermark={report.watermark ?? undefined}
        className="mx-auto max-w-[8.5in] bg-white px-4 py-5 sm:my-6 sm:border sm:border-gray-300 sm:px-10 sm:py-8 sm:shadow-sm print:my-0 print:border-0 print:px-0 print:shadow-none"
      >
        {/* Masthead: small and professional - a scouting document, not an advertisement. */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 border-b-2 border-[#03154C] pb-2.5">
          <div className="flex items-center gap-2.5">
            <Image
              src="/nc-united-logo.png"
              alt="NC United Wrestling"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
              unoptimized
            />
            <div className="leading-tight">
              <div className="text-[12px] font-black uppercase tracking-[0.2em] text-[#03154C]">NC United</div>
              <div className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-gray-600">Prospect scouting report</div>
            </div>
          </div>
          <div className="text-[9.5px] leading-relaxed text-gray-600 sm:text-right">
            <div>
              File <span className="font-mono font-semibold text-[#03154C]">{fileNumber}</span> · Issued{" "}
              <span className="font-mono">{dayLabel(report.generatedAt)}</span>
            </div>
            <div className="font-bold uppercase tracking-[0.2em] text-[#B31B1B]">Confidential</div>
          </div>
        </div>

        {/*
          Identity. A coach should know who this is, how good, and how to reach him without
          turning the page: photo, name, stars, ranking, status, weight, school - and contact on
          the right.
        */}
        <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 break-inside-avoid sm:grid-cols-[auto_minmax(0,1fr)_2.6in] sm:gap-5">
          {identity.photoUrl ? (
            <div className="border border-gray-300 bg-gray-50 p-1">
              <Image
                src={identity.photoUrl}
                alt={identity.name}
                width={136}
                height={170}
                className="h-[125px] w-[100px] object-cover object-top sm:h-[170px] sm:w-[136px]"
                unoptimized
              />
            </div>
          ) : (
            <div />
          )}
          <div className="min-w-0">
            <h1 className="break-words text-[24px] font-black uppercase leading-[0.95] tracking-tight text-[#03154C] sm:text-[32px]">
              {identity.name}
            </h1>
            {report.starRating ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <Stars stars={report.starRating.stars} />
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#03154C]">
                  {report.starRating.stars}-star prospect
                </span>
                {report.starRating.provisional ? (
                  <span className="text-[9.5px] font-semibold uppercase tracking-wider text-gray-600">Provisional</span>
                ) : null}
              </div>
            ) : null}
            <div className="mt-2 text-[13px] font-bold text-[#03154C]">
              {[
                report.rankingPublished && report.prospectRanking ? `RecruitNC #${report.prospectRanking}` : null,
                identity.graduationYear ? `Class of ${identity.graduationYear}` : null,
              ]
                .filter(Boolean)
                .join("  ·  ")}
            </div>
            {report.nationalRankings.length ? (
              <div className="mt-1 text-[11.5px] font-bold text-[#03154C]">
                National #{report.nationalRankings[0]!.current} · {report.nationalRankings[0]!.sourceLabel}
              </div>
            ) : null}
            {/* Status, unmissable but plain: the first thing a recruiter checks. */}
            <div className="mt-2.5 inline-block border-2 border-[#03154C] px-2.5 py-0.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#03154C]">
              {report.commitment ? `Committed · ${report.commitment}` : (report.recruitingStatus ?? "Uncommitted")}
            </div>
            <div className="mt-2.5 space-y-0.5 text-[11.5px] text-gray-800">
              {identity.weightClass ? (
                <div>
                  <span className="font-bold text-[#03154C]">{identity.weightClass} lbs</span>
                  {identity.lastCompetedWeight && String(identity.lastCompetedWeight) !== String(identity.weightClass) ? (
                    <span className="text-gray-600"> · last competed {identity.lastCompetedWeight}</span>
                  ) : null}
                </div>
              ) : null}
              {identity.highSchool ? <div className="break-words">{identity.highSchool}</div> : null}
              {identity.club ? <div className="break-words">{identity.club}</div> : null}
              {membership.ncUnitedTeam ? (
                <div className="text-gray-600">
                  NC United {membership.ncUnitedTeam.charAt(0).toUpperCase() + membership.ncUnitedTeam.slice(1)}
                </div>
              ) : null}
            </div>
          </div>

          {/* Contact: discover, evaluate, contact - so it sits beside the name, every line a link. */}
          <div className="col-span-2 border border-gray-300 bg-[#f3f5f8] px-3 py-2.5 text-[11px] sm:col-span-1">
            <div className="mb-1.5 text-[9.5px] font-black uppercase tracking-[0.2em] text-[#03154C]">Contact</div>
            {report.accessTier === "full" ? (
              <dl className="space-y-1">
                <ContactLine label="Text" value={contact.cell} href={contact.cell ? `sms:${contact.cell.replace(/[^\d+]/g, "")}` : null} />
                <ContactLine label="Call" value={contact.cell} href={contact.cell ? `tel:${contact.cell.replace(/[^\d+]/g, "")}` : null} />
                <ContactLine label="Email" value={contact.email} href={contact.email ? `mailto:${contact.email}` : null} />
                <ContactLine
                  label="Instagram"
                  value={contact.instagramUrl ? `@${contact.instagramUrl.replace(/^https:\/\/www\.instagram\.com\//, "")}` : null}
                  href={contact.instagramUrl}
                />
              </dl>
            ) : (
              <>
                {contact.instagramUrl ? (
                  <ContactLine
                    label="Instagram"
                    value={`@${contact.instagramUrl.replace(/^https:\/\/www\.instagram\.com\//, "")}`}
                    href={contact.instagramUrl}
                  />
                ) : null}
                <p className="mt-1 text-[9.5px] italic leading-snug text-gray-600">
                  Cell and email are released to verified college coaching staff.
                </p>
              </>
            )}
            {contact.highlightVideoUrl || contact.floProfileUrl || contact.trackWrestlingProfileUrl ? (
              <div className="mt-2 border-t border-gray-300 pt-1.5 text-[10.5px]">
                {contact.highlightVideoUrl ? <ProfileLink label="Highlight film" href={contact.highlightVideoUrl} /> : null}
                {contact.floProfileUrl ? <ProfileLink label="FloWrestling" href={contact.floProfileUrl} /> : null}
                {contact.trackWrestlingProfileUrl ? <ProfileLink label="TrackWrestling" href={contact.trackWrestlingProfileUrl} /> : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Recruiting snapshot: the record in five figures, each from the sections behind it. */}
        {snapshot.length ? (
          <section className="mt-5 break-inside-avoid">
            <div className="mb-1.5 text-[9.5px] font-black uppercase tracking-[0.2em] text-[#03154C]">Recruiting snapshot</div>
            <div
              className="grid grid-cols-2 gap-2 sm:[grid-template-columns:repeat(var(--cards),minmax(0,1fr))]"
              style={{ ["--cards" as string]: snapshot.length }}
            >
              {snapshot.map((f) => (
                <SummaryCard key={f.label} label={f.label} value={f.value} sub={f.sub} />
              ))}
            </div>
          </section>
        ) : null}

        {facts.length || report.summary ? (
          <Block n={n()} title="Evaluation">
            {facts.length ? (
              <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-[11.5px] text-gray-900 sm:grid-cols-2">
                {facts.map((fact) => (
                  <li key={fact} className="flex gap-2">
                    <span aria-hidden className="mt-[5px] h-1.5 w-1.5 shrink-0 bg-[#03154C]" />
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {report.summary ? (
              <p className={cn("font-serif text-[12px] leading-[1.6] text-gray-900", facts.length && "mt-3")}>{report.summary}</p>
            ) : null}
          </Block>
        ) : null}

        <Block n={n()} title="Academics">
          {report.accessTier !== "full" ? (
            <Note>
              Academic records are released to verified college coaching staff.
              {academics.academicInterest ? ` Intended major: ${academics.academicInterest}.` : ""}
            </Note>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <SummaryCard label="GPA" value={academics.gpa ?? "—"} />
              <SummaryCard label="SAT" value={academics.sat ?? "—"} />
              <SummaryCard label="ACT" value={academics.act ?? "—"} />
              <SummaryCard label="Intended major" value={academics.academicInterest ?? "—"} small />
            </div>
          )}
          {academics.academicSummary ? (
            <p className="mt-2 font-serif text-[12px] leading-relaxed text-gray-800">{academics.academicSummary}</p>
          ) : null}
        </Block>

        {report.starRating ? (
          <Block n={n()} title="Star rating">
            {/* The verdict and why, in four lines. The full method is at the end of the report. */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Stars stars={report.starRating.stars} large />
              <span className="text-[13px] font-black uppercase tracking-[0.16em] text-[#03154C]">
                {report.starRating.stars}-star prospect
              </span>
              {report.starRating.floor ? <span className="text-[10.5px] text-gray-700">{report.starRating.floor}</span> : null}
              {report.starRating.provisional ? <span className="text-[10px] text-gray-600">Provisional: thin record on file</span> : null}
            </div>
            <table className="mt-2 w-full border-collapse text-[11.5px]">
              <tbody>
                {starRows(report).map((row) => (
                  <tr key={row.label} className="border-t border-gray-300">
                    <td className="w-[7.5rem] py-1.5 pr-3 align-top text-[9.5px] font-black uppercase tracking-[0.14em] text-[#03154C] sm:w-[12rem]">
                      {row.label}
                    </td>
                    <td className="py-1.5 align-top text-gray-900">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Block>
        ) : null}

        {/*
          Competition profile - what "tested 6/6" was made of, in figures a coach reads at once:
          the season, ranked wins, national and post/preseason events, the weight he last made.
          Same strength-of-competition fields as before; only the presentation changed.
        */}
        {report.seasonStrength && report.seasonStrength.bouts > 0 ? (
          <Block n={n()} title="Competition profile">
            <div className="grid grid-cols-2 gap-2 break-inside-avoid sm:grid-cols-5">
              <SummaryCard
                label="In-season record"
                value={`${report.seasonStrength.wins}-${report.seasonStrength.losses}`}
                sub={report.seasonStrengthSeason ?? undefined}
              />
              <SummaryCard label="Wins over ranked" value={String(report.strengthOfCompetition.rankedWins.total)} />
              <SummaryCard label="National events" value={String(report.strengthOfCompetition.nationalEvents.length)} />
              <SummaryCard label="Post/preseason events" value={String(report.strengthOfCompetition.offSeasonEvents)} />
              <SummaryCard
                label="Last competed"
                value={identity.lastCompetedWeight ? `${identity.lastCompetedWeight} lbs` : "—"}
                sub={identity.lastCompetedEvent ?? undefined}
              />
            </div>
            <div className="mt-2 space-y-0.5 text-[10.5px] leading-snug text-gray-700">
              <div>
                <span className="font-bold text-[#03154C]">Ranked wins:</span>{" "}
                {report.strengthOfCompetition.rankedWins.national} nationally ranked ·{" "}
                {report.strengthOfCompetition.rankedWins.stateRanked} NC-ranked ·{" "}
                {report.strengthOfCompetition.rankedWins.tocField} Tournament of Champions field.{" "}
                <span className="font-bold text-[#03154C]">Losses to ranked opponents:</span>{" "}
                {report.strengthOfCompetition.credentialedLosses}, listed under Notable losses.
              </div>
              {weightProgression(report.results) ? (
                <div>
                  <span className="font-bold text-[#03154C]">Competed at:</span> {weightProgression(report.results)}
                </div>
              ) : null}
              <div>
                <span className="font-bold text-[#03154C]">Competition level:</span> {report.strengthOfCompetition.grade.label}.{" "}
                {report.strengthOfCompetition.grade.verdict}
                {report.strengthOfCompetition.grade.nextStep ? ` Next step: ${report.strengthOfCompetition.grade.nextStep}` : ""}
              </div>
              {report.strengthOfCompetition.seasonsOnFile <= 1 ? (
                <div className="italic text-gray-600">
                  One season on file. A wrestler who transferred in, or is in a first year, reads as quiet here whatever was
                  done elsewhere.
                </div>
              ) : null}
            </div>
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
            <p className="mt-1.5 text-[9px] leading-relaxed text-gray-600">
              Weight class as published by the outlet. Only the {RETAINED_EDITIONS} most recent monthly
              editions are retained, so movement describes that window and no further back.
            </p>
          </Block>
        ) : null}

        {/*
          Which style leads depends on the wrestler.
          
          For the boys, folkstyle is the sport: the NCHSAA season, NHSCA, Super 32, the duals and
          the TOC are all folkstyle, and freestyle and Greco are the off-season.
          
          For the girls it is the other way round. College women's wrestling is freestyle, so
          freestyle is the standard a women's coach reads first and the in-season folkstyle record
          - NCHSAA, NHSCA - is the secondary one. Leading with folkstyle on a girl's report puts
          the less relevant half at the top and buries Fargo.
          
          The NCHSAA State Championships and the NC Freestyle & Greco State Championships are
          different titles and must never share a table, whichever order they appear in.
        */}
{(() => {
  const folkstyleSection = (
    <>
          <StyleDivider title="Folkstyle" note="NCHSAA State Championships, national tournaments, duals and the high-school season" />
          <Block n={n()} title="Competition record — Folkstyle">
            {folkResults.length ? (
              <ResultsTable rows={folkResults} />
            ) : (
              <Note>No folkstyle tournament results on file.</Note>
            )}
          </Block>
  
          <Block n={n()} title="Significant wins — Folkstyle" count={folkWins.length}>
            <GroupedBoutTables rows={folkWins} kind="win" />
          </Block>
  
          <Block n={n()} title="Notable losses — Folkstyle" count={folkLosses.length}>
            <GroupedBoutTables rows={folkLosses} kind="loss" />
          </Block>
    </>
  )
  const olympicSection = (
    <>
          {olympicResults.length || olympicWins.length || olympicLosses.length ? (
            <>
            <StyleDivider
              title="Olympic Styles — Freestyle & Greco-Roman"
              note="Fargo, the NC Freestyle & Greco State Championships and the Tar Heel State Classic — not folkstyle"
            />
            <Block n={n()} title="Olympic Styles — Freestyle & Greco-Roman">
              <Note>
                Fargo, the NC Freestyle &amp; Greco State Championships, the Tar Heel State Classic and the Junior National
                Duals. Not folkstyle, and not part of the record above.
              </Note>
              <div className="mt-3 space-y-5">
                <div>
                  <h3 className="mb-2 border-b border-[#03154C]/30 pb-0.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#B31B1B]">
                    Individual results <span className="font-mono text-gray-500">({olympicIndividual.length})</span>
                  </h3>
                  {olympicIndividual.length ? <ResultsTable rows={olympicIndividual} /> : <Note>No individual freestyle or Greco results on file.</Note>}
                </div>
                {olympicDuals.length ? (
                  <div>
                    <h3 className="mb-2 border-b border-[#03154C]/30 pb-0.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#B31B1B]">
                      Dual results <span className="font-mono text-gray-500">({olympicDuals.length})</span>
                    </h3>
                    <ResultsTable rows={olympicDuals} />
                  </div>
                ) : null}
                <div>
                </div>
                <div>
                  <h3 className="mb-2 border-b border-[#03154C]/30 pb-0.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#B31B1B]">
                    Significant wins <span className="font-mono text-gray-500">({olympicWins.length})</span>
                  </h3>
                  <GroupedBoutTables rows={olympicWins} kind="win" />
                </div>
                <div>
                  <h3 className="mb-2 border-b border-[#03154C]/30 pb-0.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#B31B1B]">
                    Notable losses <span className="font-mono text-gray-500">({olympicLosses.length})</span>
                  </h3>
                  <GroupedBoutTables rows={olympicLosses} kind="loss" />
                </div>
              </div>
            </Block>
            </>
          ) : null}
    </>
  )
  const freestyleFirst = String(identity.gender ?? "").trim().toLowerCase() === "female"
  return freestyleFirst ? <>{olympicSection}{folkstyleSection}</> : <>{folkstyleSection}{olympicSection}</>
})()}

        <footer className="mt-8 break-inside-avoid border-t-2 border-[#03154C] pt-2 text-[9px] leading-relaxed text-gray-700">
          <p>
            <span className="font-bold uppercase tracking-wider text-[#B31B1B]">Method.</span> Significant
            results are those against wrestlers ranked nationally by FloWrestling, Sports Illustrated or
            MatScouts, ranked as North Carolina prospects, or who are NCHSAA/NCISA state champions or
            placers (top 8) — grouped by that standing, since they are not the same claim. State finishes
            count from any season on file; other results from the current season. This is not a complete
            match list — routine results are omitted by design. In-state and national are split by the
            opponent, not the event: an out-of-state opponent is national wherever the bout was wrestled.
            Wins reported by the athlete or family are
            included, with the opponent&apos;s accolade as they gave it.
          </p>
          {report.starRating ? (
            <p className="mt-1">
              <span className="font-bold uppercase tracking-wider text-[#B31B1B]">Star rating.</span> Built only from
              results on file, never a projection of college ceiling. Three equal parts: in-state performance (best
              Tournament of Champions or NCHSAA finish, plus significant wins), nationals (NHSCA, Super 32 and Fargo
              placing weigh most), and the RecruitNC class ranking. A top-10 ranking holds a wrestler at four stars and
              any other ranking at three; some credentials also set a minimum, named beside the stars. Five stars
              requires a current national ranking and a top-eight finish at Super 32. Rated for the classes RecruitNC
              ranks.
            </p>
          ) : null}
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
function Stars({ stars, large }: { stars: number; large?: boolean }) {
  return (
    <span className="inline-flex gap-px" aria-label={`${stars} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 20 20" className={large ? "h-5 w-5" : "h-4 w-4"} aria-hidden>
          <path
            d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L1.5 7.7l5.9-.9z"
            fill={i <= stars ? "#D3B574" : "none"}
            /* Outlines dark enough to survive a greyscale office printer. */
            stroke={i <= stars ? "#9C7A2E" : "#9AA3AE"}
            strokeWidth="1.2"
          />
        </svg>
      ))}
    </span>
  )
}

/**
 * A phone number a coach can act on, with the choice made explicit.
 *
 * Left as plain text, iOS detects the digits itself and offers only "Call" - and a first
 * approach to a recruit is far more often a text. Both actions are spelled out so the coach
 * picks, rather than the phone picking for him.
 */
/** The address, as something a coach can tap rather than copy out by hand. */
function EmailVital({ label, value, last }: { label: string; value: string | null; last?: boolean }) {
  if (!value) return null
  return (
    <div className={`flex justify-between gap-3 py-1 ${last ? "" : "border-b border-gray-200"}`}>
      <dt className="shrink-0 uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="min-w-0 break-all text-right font-semibold leading-tight">
        <a href={`mailto:${value}`} className="text-[#B31B1B] underline underline-offset-2">
          {value}
        </a>
      </dd>
    </div>
  )
}

function PhoneVital({ label, value, last }: { label: string; value: string | null; last?: boolean }) {
  if (!value) return null
  const digits = value.replace(/\D/g, "")
  const dial = digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits.startsWith("1") ? `+${digits}` : digits
  return (
    <div className={`flex justify-between gap-3 py-1 ${last ? "" : "border-b border-gray-200"}`}>
      <dt className="shrink-0 uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="min-w-0 text-right leading-tight text-[#03154C]">
        <span className="font-semibold">{value}</span>
        {dial ? (
          <span className="ml-2 whitespace-nowrap text-xs font-semibold">
            <a href={`sms:${dial}`} className="text-[#B31B1B] underline underline-offset-2">Text</a>
            <span className="mx-1 text-gray-400">·</span>
            <a href={`tel:${dial}`} className="text-[#B31B1B] underline underline-offset-2">Call</a>
          </span>
        ) : null}
      </dd>
    </div>
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

/**
 * A full-width navy bar between the folkstyle record and the Olympic-styles one (Matt): on a
 * printed page the two must read as different records at a glance, not as more rows of one.
 */
function StyleDivider({ title, note }: { title: string; note: string }) {
  return (
    <div className="mt-8 break-inside-avoid break-after-avoid bg-[#03154C] px-3 py-2 text-white">
      <div className="text-[12px] font-black uppercase tracking-[0.2em]">{title}</div>
      <div className="text-[9.5px] text-white/75">{note}</div>
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
          <span className="ml-auto shrink-0 whitespace-nowrap font-mono text-[10px] text-gray-500">{count} recorded</span>
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

/** A snapshot figure: label, value, and the year or basis beneath. Pale tint, navy type. */
function SummaryCard({ label, value, sub, small }: { label: string; value: string; sub?: string; small?: boolean }) {
  return (
    <div className="min-w-0 border border-[#cfd6e0] bg-[#f3f5f8] px-2.5 py-2">
      <div className="truncate text-[8.5px] font-bold uppercase tracking-[0.14em] text-gray-600">{label}</div>
      <div className={cn("mt-0.5 font-black leading-tight text-[#03154C]", small ? "break-words text-[12px]" : "text-[19px]")}>{value}</div>
      {sub ? <div className="mt-0.5 truncate text-[9.5px] text-gray-600">{sub}</div> : null}
    </div>
  )
}

/** Text / Call / Email / Instagram: a link where there is one, a dash where there is not. */
function ContactLine({ label, value, href }: { label: string; value: string | null; href: string | null }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="w-[4.6rem] shrink-0 text-[9px] font-black uppercase tracking-[0.14em] text-[#03154C]">{label}</dt>
      <dd className="min-w-0 break-words text-[10.5px] font-semibold text-gray-900 [overflow-wrap:anywhere]">
        {value && href ? (
          <a href={href} className="underline decoration-gray-400 underline-offset-2" target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
            {value}
          </a>
        ) : (
          (value ?? "—")
        )}
      </dd>
    </div>
  )
}

function ProfileLink({ label, href }: { label: string; href: string }) {
  return (
    <div>
      <a href={href} className="font-semibold text-[#03154C] underline decoration-gray-400 underline-offset-2" target="_blank" rel="noreferrer">
        {label}
      </a>
    </div>
  )
}

/**
 * The star rating's supporting lines, from its own component details: in-state finish,
 * significant wins, national competition, and the class ranking.
 */
function starRows(report: ScoutingReport): Array<{ label: string; value: string }> {
  const rating = report.starRating
  if (!rating) return []
  const component = (key: string) => rating.components.find((c) => c.key === key)
  const rows: Array<{ label: string; value: string }> = []
  const inState = starPart(report, "Best in-state finish") ?? component("instate")?.detail
  if (inState) rows.push({ label: "In-state performance", value: inState })
  const wins = starPart(report, "Significant wins")
  if (wins) rows.push({ label: "Significant wins", value: wins })
  const national = [starPart(report, "National placement"), starPart(report, "National record")].filter(Boolean).join(" · ")
  if (national || component("nationals")?.detail) rows.push({ label: "National competition", value: national || component("nationals")!.detail })
  const ranking = component("ranking")?.detail
  if (ranking) rows.push({ label: "RecruitNC ranking", value: ranking })
  return rows
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
      className={`py-1.5 pr-2 align-top ${mono ? "whitespace-nowrap font-mono text-gray-800" : ""} ${
        bold ? "font-semibold text-[#03154C]" : "text-gray-800"
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
  // Navy fill for the national claims, navy outline for the in-state ones, grey for placers:
  // told apart by weight and fill rather than hue, so the distinction survives a greyscale printer.
  "national-ranked": { label: "Nat'l ranked", className: "bg-[#03154C] text-white" },
  "national-placer": { label: "Nat'l placer", className: "bg-[#03154C] text-white" },
  ranked: { label: "NC ranked", className: "border border-[#03154C] text-[#03154C]" },
  "toc-field": { label: "TOC field", className: "border border-[#03154C] text-[#03154C]" },
  "state-champion": { label: "State champ", className: "border border-[#03154C] text-[#03154C]" },
  "state-placer": { label: "State placer", className: "border border-gray-500 text-gray-700" },
}

/**
 * Significant results split by the opponent's standing, strongest first.
 *
 * One table with a coloured chip per row still asked a coach to read every chip to find the
 * nationally ranked wins, and on a printed page the colours are the first thing lost. A win over a
 * nationally ranked wrestler and one over a North Carolina-ranked wrestler are different claims,
 * so they get different headings; state champions and placers are a third.
 */
type BoutRow = ScoutingReport["significantWins"][number] & { credential?: string }

/**
 * A family-reported win placed in the group its accolade names. The accolade is their words,
 * printed as given; the group is only where it sits on the page.
 */
function reportedRow(win: ScoutingReport["reportedWins"][number]): BoutRow {
  const reason: BoutRow["reason"] = /national|#\d/i.test(win.credential)
    ? "national-ranked"
    : /champ/i.test(win.credential)
      ? "state-champion"
      : "state-placer"
  return {
    opponent: win.opponent,
    opponentSchool: win.opponentSchool,
    event: win.event,
    date: win.date,
    result: win.result,
    weight: null,
    reason,
    opponentGraduationYear: null,
    opponentRanking: null,
    credential: win.credential,
  }
}

const BOUT_GROUPS: Array<{
  title: string
  reasons: ReadonlyArray<ScoutingReport["significantWins"][number]["reason"]>
}> = [
  { title: "Nationally ranked opponents", reasons: ["national-ranked"] },
  { title: "NC-ranked opponents", reasons: ["ranked", "toc-field"] },
  { title: "State champions & placers", reasons: ["state-champion", "state-placer"] },
  // Super 32 / NHSCA / Journeymen / Beast / Ironman placers with no state placing on file.
  { title: "National tournament placers", reasons: ["national-placer"] },
]

/**
 * North Carolina opponents first, then out-of-state ones.
 *
 * Matt: separate in-state wins from national. A coach reads a win over a Michigan placer and a win
 * over a Greensboro placer as different evidence - one says he holds up outside the state. The
 * opponent decides it, not the event: Luke Richards beat his Michigan and Wisconsin placers at the
 * NC Super 32 Early Entry.
 */
function isOutOfState(row: BoutRow): boolean {
  if (row.credential) return !/\b(NC|N\.C\.|North Carolina|NCHSAA|NCISA)\b/i.test(row.credential)
  // Any standing: a Virginia state champion is out-of-state whatever reason put him on the list.
  return !!row.opponentState && row.opponentState.toUpperCase() !== "NC"
}

/** One results table, the same for the folkstyle record and the Olympic-styles section. */
function ResultsTable({ rows }: { rows: ScoutingReport["results"] }) {
  return (
    <>
    {/* Phones: one line per event. Desktop and print keep the table (print is md width). */}
    <ul className="divide-y divide-gray-200 border-y border-gray-200 sm:hidden">
      {rows.map((row, i) => (
        <li key={i} className="py-2 text-[12px]">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold text-[#03154C]">{row.event}</span>
            <span className="shrink-0 font-mono text-[10.5px] text-gray-600">{row.date ? dayLabel(row.date) : row.year}</span>
          </div>
          <div className="mt-0.5 text-gray-800">{row.detail}</div>
        </li>
      ))}
    </ul>
    <div className="hidden sm:block">
    <Table head={["Date", "Event", "Result"]} widths={["6.4rem", "12rem", "auto"]}>
      {rows.map((row, i) => (
        <tr key={i} className="border-t border-gray-200">
          {/* The day where we have it, the year where the source only published one. */}
          <Td mono>{row.date ? dayLabel(row.date) : row.year}</Td>
          <Td bold>{row.event}</Td>
          <Td>{row.detail}</Td>
        </tr>
      ))}
    </Table>
    </div>
    </>
  )
}

function GroupedBoutTables({ rows, kind }: { rows: BoutRow[]; kind: "win" | "loss" }) {
  if (!rows.length) return <BoutTable rows={rows} kind={kind} />
  const scopes = [
    { title: "In-state", rows: rows.filter((r) => !isOutOfState(r)) },
    { title: "National (out-of-state opponents)", rows: rows.filter(isOutOfState) },
  ].filter((s) => s.rows.length)
  return (
    <div className="space-y-5">
      {scopes.map((scope) => (
        <div key={scope.title}>
          <h3 className="mb-2 border-b border-[#03154C]/30 pb-0.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#B31B1B]">
            {scope.title} <span className="font-mono text-gray-500">({scope.rows.length})</span>
          </h3>
          <StandingGroups rows={scope.rows} kind={kind} />
        </div>
      ))}
    </div>
  )
}

function StandingGroups({ rows, kind }: { rows: BoutRow[]; kind: "win" | "loss" }) {
  return (
    <div className="space-y-4">
      {BOUT_GROUPS.map((group) => {
        const groupRows = rows.filter((r) => group.reasons.includes(r.reason))
        if (!groupRows.length) return null
        return (
          <div key={group.title}>
            <h4 className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#03154C]">
              {kind === "win" ? "Wins over " : "Losses to "}
              {group.title.charAt(0).toLowerCase() + group.title.slice(1)}{" "}
              <span className="font-mono text-gray-500">({groupRows.length})</span>
            </h4>
            <BoutTable rows={groupRows} kind={kind} />
          </div>
        )
      })}
    </div>
  )
}

function BoutTable({ rows, kind }: { rows: BoutRow[]; kind: "win" | "loss" }) {
  if (!rows.length) {
    return (
      <Note>
        {kind === "win"
          ? "No wins over nationally ranked, NC-ranked, state champion or state-placing wrestlers on file."
          : "No losses to nationally ranked, NC-ranked, state champion or state-placing wrestlers on file."}
      </Note>
    )
  }
  const standingLines = (row: BoutRow) =>
    [row.nationalRankLabel, row.stateLabel, row.fargoLabel, row.credential].filter((x): x is string => Boolean(x))
  return (
    <>
    {/* Phones: a card per bout - six columns cannot fit. Desktop and print keep the table. */}
    <ul className="divide-y divide-gray-200 border-y border-gray-200 sm:hidden">
      {rows.map((row, i) => (
        <li key={i} className="py-2 text-[12px]">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-semibold text-[#03154C]">
              {row.opponent}
              {row.opponentSchool ? <span className="font-normal text-gray-600"> · {row.opponentSchool}</span> : null}
            </span>
            <span className="shrink-0 font-mono text-[11px] text-gray-800">{row.result ?? "—"}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className={`inline-block whitespace-nowrap px-1 py-0.5 text-[8.5px] font-black uppercase tracking-wider ${STANDING[row.reason].className}`}>
              {STANDING[row.reason].label}
            </span>
            {standingLines(row).map((line) => (
              <span key={line} className="text-[10.5px] text-gray-600">{line}</span>
            ))}
          </div>
          <div className="mt-0.5 flex items-baseline justify-between gap-3 text-[10.5px] text-gray-600">
            <span>{row.event ?? "—"}</span>
            <span className="shrink-0 font-mono">{row.date ? dayLabel(row.date) : "—"}</span>
          </div>
        </li>
      ))}
    </ul>
    <div className="hidden sm:block">
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
            {/* The finish itself - "2026 7A State Champion" - which is what a coach recognises. */}
            {row.stateLabel ? (
              <div className="mt-0.5 text-[8.5px] leading-tight text-gray-500">{row.stateLabel}</div>
            ) : null}
            {row.fargoLabel ? (
              <div className="mt-0.5 text-[8.5px] leading-tight text-gray-500">{row.fargoLabel}</div>
            ) : null}
            {row.credential ? (
              <div className="mt-0.5 text-[8.5px] leading-tight text-gray-500">{row.credential}</div>
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
    </div>
    </>
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

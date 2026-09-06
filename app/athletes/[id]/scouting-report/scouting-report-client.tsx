"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Printer, ArrowLeft, Loader2, Link2, Check } from "lucide-react"
import Link from "next/link"
import type { ScoutingReport } from "@/lib/scouting-report"

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
          body * { visibility: hidden !important; }
          #scouting-report, #scouting-report * { visibility: visible !important; }
          #scouting-report {
            position: absolute !important;
            left: 0; top: 0; width: 100%;
            margin: 0 !important; box-shadow: none !important;
          }
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
              onClick={() => window.print()}
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
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
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
              {identity.highSchoolLogoUrl ? (
                <Image
                  src={identity.highSchoolLogoUrl}
                  alt={identity.highSchool ?? ""}
                  width={38}
                  height={38}
                  className="h-9 w-9 object-contain"
                  unoptimized
                />
              ) : null}
              {identity.clubLogoUrl ? (
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
            <Vital label="Weight" value={identity.weightClass ? `${identity.weightClass} lbs` : null} />
            <Vital
              label="Last competed"
              value={identity.lastCompetedWeight ? `${identity.lastCompetedWeight} lbs` : null}
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

        <Block n={n()} title="Competition record">
          {report.results.length ? (
            <Table head={["Year", "Event", "Result"]} widths={["3rem", "11rem", "auto"]}>
              {report.results.map((row, i) => (
                <tr key={i} className="border-t border-gray-200">
                  <Td mono>{row.year}</Td>
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

        <Block n={n()} title="Significant losses" count={report.significantLosses.length}>
          <BoutTable rows={report.significantLosses} kind="loss" />
        </Block>

        <footer className="mt-7 border-t-2 border-[#03154C] pt-2 text-[9px] leading-relaxed text-gray-500">
          <p>
            <span className="font-bold uppercase tracking-wider text-[#B31B1B]">Method.</span> Significant
            results are those against wrestlers in the NC Tournament of Champions field or ranked North
            Carolina prospects. This is not a complete match list — routine results are omitted by design.
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

function Vital({ label, value, last }: { label: string; value: string | null; last?: boolean }) {
  if (!value) return null
  return (
    <div className={`flex justify-between gap-3 py-1 ${last ? "" : "border-b border-gray-200"}`}>
      <dt className="shrink-0 uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="truncate text-right font-semibold text-[#03154C]">{value}</dd>
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
    <section className="mt-6 break-inside-avoid">
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

function BoutTable({ rows, kind }: { rows: ScoutingReport["significantWins"]; kind: "win" | "loss" }) {
  if (!rows.length) {
    return (
      <Note>
        {kind === "win"
          ? "No wins over ranked or Tournament of Champions wrestlers on file."
          : "No losses to ranked or Tournament of Champions wrestlers on file."}
      </Note>
    )
  }
  return (
    <Table
      head={["Opponent", "Affiliation", "Standing", "Result", "Event", "Date"]}
      widths={["8.5rem", "7.5rem", "4rem", "4.5rem", "auto", "4.75rem"]}
    >
      {rows.map((row, i) => (
        <tr key={i} className="border-t border-gray-200">
          <Td bold>{row.opponent}</Td>
          <Td>{row.opponentSchool ?? "—"}</Td>
          <td className="py-1.5 pr-2 align-top">
            <span
              className={`px-1 py-0.5 text-[8.5px] font-black uppercase tracking-wider ${
                row.reason === "toc-field" ? "bg-[#D3B574] text-[#0A1628]" : "bg-[#03154C] text-white"
              }`}
            >
              {row.reason === "toc-field" ? "TOC" : "Ranked"}
            </span>
          </td>
          <Td mono>{row.result ?? "—"}</Td>
          <Td>{row.event ?? "—"}</Td>
          <Td mono>{row.date ?? "—"}</Td>
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
            <span className="text-lg font-black">$14.99/mo</span>
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

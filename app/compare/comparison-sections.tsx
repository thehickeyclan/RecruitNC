"use client"

/**
 * Three side-by-side sections on the comparison: best wins, the national tournaments year by year,
 * and who wrestles freestyle and Greco, with every result as the evidence.
 *
 * Everything here is decided in lib/athlete-comparison-rows.ts - this file only lays it out, so the
 * sections and the rows below them can never tell a coach two different things.
 */
import { Globe, Medal, Trophy } from "lucide-react"
import type {
  BestWin,
  BestWinsSection,
  ComparisonSections,
  EventLine,
  FreestyleSection,
  NationalSection,
  RowEdge,
} from "@/lib/athlete-comparison-rows"

const GOLD = "text-[#D3B574]"
const PANEL = "rounded-xl border border-white/10 bg-[#0f1c2e]"
const TITLE = "flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/40"

function surname(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts[parts.length - 1] ?? name
}

function Column({ name, edge, side, children }: { name: string; edge: RowEdge; side: "left" | "right"; children: React.ReactNode }) {
  const ahead = edge === side
  return (
    <div className={`min-w-0 rounded-lg p-3 ${ahead ? "bg-[#D3B574]/10 ring-1 ring-[#D3B574]/40" : "bg-white/[0.03]"}`}>
      <p className={`mb-2 flex items-center gap-1.5 truncate text-xs font-black uppercase tracking-wide ${ahead ? GOLD : "text-white/60"}`}>
        {surname(name)}
        {ahead ? <span className="rounded-full bg-[#D3B574] px-1.5 text-[9px] text-[#0A1628]">Edge</span> : null}
      </p>
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-white/35">{children}</p>
}

function Line({ line, showEvent = false }: { line: EventLine; showEvent?: boolean }) {
  const placed = line.place != null
  return (
    <li className="text-xs leading-snug">
      <span className="font-bold text-white">{line.year}</span>
      {showEvent ? <span className="text-white/70"> {line.event}</span> : null}
      {line.division ? <span className="text-white/50"> · {line.division}</span> : null}
      {line.weight ? <span className="text-white/50"> · {line.weight}</span> : null}
      <span className={placed ? ` font-bold ${GOLD}` : " text-white/50"}> · {line.finish}</span>
      {line.record ? <span className="text-white/70"> · {line.record}</span> : null}
    </li>
  )
}

/* ------------------------------------------------------------------ best wins */

function WinItem({ win }: { win: BestWin }) {
  return (
    <li className="border-t border-white/5 pt-2 first:border-0 first:pt-0">
      <p className="text-sm font-bold text-white">
        {win.opponent}
        <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-px align-middle text-[9px] font-black uppercase tracking-wide text-white/60">
          {win.tier}
        </span>
      </p>
      {win.credential ? <p className={`text-xs ${GOLD}`}>{win.credential}</p> : null}
      <p className="text-[11px] text-white/45">{[win.result, win.event, win.date].filter(Boolean).join(" · ")}</p>
    </li>
  )
}

function BestWins({ s, leftName, rightName }: { s: BestWinsSection; leftName: string; rightName: string }) {
  return (
    <section className={`${PANEL} p-5 sm:p-6`}>
      <h2 className={TITLE}>
        <Trophy className={`h-3.5 w-3.5 ${GOLD}`} /> Best wins
      </h2>
      <p className="mt-2 text-sm font-semibold text-white">{s.summary}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {([
          ["left", leftName, s.left, s.leftCounts],
          ["right", rightName, s.right, s.rightCounts],
        ] as const).map(([side, name, wins, counts]) => (
          <Column key={side} name={name} edge={s.edge} side={side}>
            <p className="mb-2 text-[11px] text-white/50">
              {counts.total} ranked {counts.total === 1 ? "win" : "wins"} in the last 12 months
              {counts.national ? ` · ${counts.national} over nationally ranked` : ""}
              {` · ${counts.careerTotal} career`}
            </p>
            {wins.length ? <ul className="space-y-2">{wins.map((w, i) => <WinItem key={i} win={w} />)}</ul> : <Empty>No win over a ranked or placing opponent on file.</Empty>}
          </Column>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ national tournaments */

function National({ s, leftName, rightName }: { s: NationalSection; leftName: string; rightName: string }) {
  const totals = (side: NationalSection["left"]) =>
    side.events
      ? [`${side.events} ${side.events === 1 ? "entry" : "entries"}`, `${side.placings} ${side.placings === 1 ? "placing" : "placings"}`, side.record ? `${side.record} overall` : null]
          .filter(Boolean)
          .join(" · ")
      : "No national entries on file"
  return (
    <section className={`${PANEL} p-5 sm:p-6`}>
      <h2 className={TITLE}>
        <Medal className={`h-3.5 w-3.5 ${GOLD}`} /> National tournaments
      </h2>
      <p className="mt-2 text-sm font-semibold text-white">{s.summary}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        {([
          [leftName, s.left],
          [rightName, s.right],
        ] as const).map(([name, side]) => (
          <div key={name} className="rounded-lg bg-white/[0.03] p-3">
            <p className="truncate font-black uppercase tracking-wide text-white/60">{surname(name)}</p>
            <p className="mt-1 text-white/80">{totals(side)}</p>
            {side.bestFinish ? <p className={`mt-0.5 font-bold ${GOLD}`}>Best: {side.bestFinish}</p> : null}
          </div>
        ))}
      </div>
      <div className="mt-5 space-y-5">
        {s.blocks.map((block) => (
          <div key={block.key}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-black text-white">{block.label}</p>
              <p className="text-[11px] text-white/45">{block.basis}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                ["left", leftName, block.left],
                ["right", rightName, block.right],
              ] as const).map(([side, name, lines]) => (
                <Column key={side} name={name} edge={block.edge} side={side}>
                  {lines.length ? <ul className="space-y-1">{lines.map((l, i) => <Line key={i} line={l} showEvent={/\(OF\)/.test(l.event)} />)}</ul> : <Empty>Did not enter</Empty>}
                </Column>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ freestyle and Greco */

function Freestyle({ s, leftName, rightName }: { s: FreestyleSection; leftName: string; rightName: string }) {
  return (
    <section className={`${PANEL} p-5 sm:p-6`}>
      <h2 className={TITLE}>
        <Globe className={`h-3.5 w-3.5 ${GOLD}`} /> Freestyle &amp; Greco
      </h2>
      <p className="mt-2 text-sm font-semibold text-white">{s.summary}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {([
          ["left", leftName, s.left],
          ["right", rightName, s.right],
        ] as const).map(([side, name, styles]) => (
          <Column key={side} name={name} edge={null} side={side}>
            {styles.freestyle.length || styles.greco.length ? (
              <div className="space-y-3">
                {([
                  ["Freestyle", styles.freestyle, styles.freestyleRecord],
                  ["Greco-Roman", styles.greco, styles.grecoRecord],
                ] as const).map(([label, lines, record]) =>
                  lines.length ? (
                    <div key={label}>
                      <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-white/40">
                        {label}
                        {record ? <span className="text-white/60"> · {record}</span> : null}
                      </p>
                      <ul className="space-y-1">{lines.map((l, i) => <Line key={i} line={l} showEvent />)}</ul>
                    </div>
                  ) : null,
                )}
              </div>
            ) : (
              <Empty>No freestyle or Greco results on file.</Empty>
            )}
          </Column>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-white/35">
        From the events we import: Fargo, NC Freestyle &amp; Greco States, Tar Heel State Classic, Southeast Regionals, the
        16U and Junior National Duals, and Ultimate Club Duals for women. An event we don&apos;t import won&apos;t show.
      </p>
    </section>
  )
}

export function ComparisonSectionsView({
  sections,
  leftName,
  rightName,
}: {
  sections: ComparisonSections
  leftName: string
  rightName: string
}) {
  return (
    <>
      <BestWins s={sections.bestWins} leftName={leftName} rightName={rightName} />
      <National s={sections.national} leftName={leftName} rightName={rightName} />
      <Freestyle s={sections.freestyle} leftName={leftName} rightName={rightName} />
    </>
  )
}

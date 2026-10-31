/**
 * Pieces shared by the Super 32 2026 boys recap (app/news/super32-2026-nc-boys-recap) and the
 * college coaches' report built from it (app/coach-reports): the three-year charts, the chips and
 * the computed "Every match" list with each opponent's credentials.
 */
import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { markdownToHtml } from "@/lib/news-recaps/markdown"
import { nameKey } from "@/lib/news-recaps/recap"
import type { SnapshotBout, SnapshotEntrant } from "@/lib/super32-live/snapshot"

const inlineHtml = (md: string) => ({ __html: markdownToHtml(md).replace(/^<p[^>]*>|<\/p>$/g, "") })

/** Final Super 32 2026 placings, keyed "name|weight", so every opponent shows where he finished. */
export async function super32Placings(): Promise<Map<string, number>> {
  const { data } = await createAdminClient().from("national_event_placers").select("wrestler_name, weight, place").eq("event_key", "super32-2026")
  return new Map((data ?? []).map((r) => [`${nameKey(r.wrestler_name)}|${String(r.weight).replace(/\D/g, "")}`, r.place as number]))
}

/**
 * Girls' Super 32 2026 placings, keyed the same way. national_event_placers holds the boys only, so
 * these are derived from the bracket's own placement matches ("3rd Place", "5th Place", "7th Place")
 * and the "Finals" round, exactly as the recap's figures were checked (26 Oct 2026).
 */
export async function super32GirlsPlacings(): Promise<Map<string, number>> {
  const admin = createAdminClient()
  const rows: Array<{ weight_class: string; round: string; athlete_name: string; win: boolean; is_bye: boolean }> = []
  for (let from = 0; ; from += 1000) {
    const { data } = await admin.from("other_tournament_bouts").select("weight_class, round, athlete_name, win, is_bye")
      .eq("source_file", "super32-2026-live.csv").eq("gender", "F").or("round.ilike.%place%,round.eq.Finals").order("id").range(from, from + 999)
    rows.push(...((data ?? []) as typeof rows))
    if (!data || data.length < 1000) break
  }
  const out = new Map<string, number>()
  for (const r of rows) {
    if (r.is_bye) continue
    const m = /(\d+)(st|nd|rd|th) place/i.exec(r.round)
    const place = m ? (r.win ? Number(m[1]) : Number(m[1]) + 1) : /^finals$/i.test(r.round) ? (r.win ? 1 : 2) : null
    if (place) out.set(`${nameKey(r.athlete_name)}|${String(r.weight_class).replace(/\D/g, "")}`, place)
  }
  return out
}

/** The three-year table as cards: each row a stat, 2026 called out. */
/** The chart that leads: wins over top-15 seeds (boys), else All-Americans (girls). */
export const FEATURED = /top-15|all-americans/i
// A row where a drop is the improvement ("Went 0-2"), and one whose values are percentages.
const LOWER_IS_BETTER = /0-2/
const PERCENT = /%/

/** Vertical columns, years left to right, so a row reads as progress over time; 2026 in the accent colour (gold on NC United, lime on RecruitWrestlers: RW_ACCENT). */
export function Columns({ vals, years, height, unit = "" }: { vals: number[]; years: string[]; height: number; unit?: string }) {
  const max = Math.max(...vals, 1)
  // Bars live in their own fixed-height area, so a bar's height is exactly its share of the
  // largest value; the labels sit outside it and can never squeeze a bar.
  return (
    <div className="flex justify-around gap-3">
      {years.map((yr, i) => {
        const now = i === years.length - 1
        return (
          <div key={yr} className="flex flex-1 flex-col items-center">
            <div className="flex w-full flex-col items-center justify-end" style={{ height }}>
              <span className={`mb-1 ${now ? "text-lg font-black text-[#0b1730]" : "text-sm font-semibold text-gray-500"}`}>{vals[i]}{unit}</span>
              <div className={`w-full max-w-[56px] shrink-0 rounded-t-md ${now ? "bg-[var(--rpt-accent,#d4af55)]" : "bg-[#c7d0e2]"}`} style={{ height: Math.max(3, Math.round(((height - 32) * vals[i]!) / max)) }} />
            </div>
            <span className={`mt-1.5 text-xs ${now ? "font-bold text-[#0b1730]" : "text-gray-400"}`}>{yr}</span>
          </div>
        )
      })}
    </div>
  )
}

export function Change({ vals, years, label = "" }: { vals: number[]; years: string[]; label?: string }) {
  const d = vals[vals.length - 1]! - vals[vals.length - 2]!
  const better = LOWER_IS_BETTER.test(label) ? d < 0 : d > 0
  const unit = PERCENT.test(label) ? " pts" : ""
  const prev = years[years.length - 2]
  if (d === 0) return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">Same as {prev}</span>
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${better ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
      {d > 0 ? "+" : ""}{d}{unit} vs {prev}
    </span>
  )
}

export function ThreeYear({ body }: { body: string }) {
  const lines = body.split("\n").filter((l) => l.startsWith("|") && !/^\|\s*-/.test(l))
  const note = body.split("\n").filter((l) => !l.startsWith("|")).join(" ").trim()
  // Years come from the table's header row: three for the boys (2024-26), four for the girls (2023-26).
  const headCells = lines[0]!.replace(/^\||\|$/g, "").split("|").map((c) => c.trim())
  const years = headCells.slice(1)
  // The table's own first header ("Super 32 — NC girls"), never a fixed label: it said "NC boys" on the girls' page.
  const who = (headCells[0] ?? "").replace(/^super 32\s*[—-]\s*/i, "") || "North Carolina"
  const rows = lines.slice(1).map((l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()))
    .map(([label, ...ys]) => ({ label: label!, vals: ys.slice(0, years.length).map(Number) }))
  const featured = rows.find((r) => FEATURED.test(r.label))
  const rest = rows.filter((r) => r !== featured)
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-black text-[#0b1730]">{years.length === 4 ? "Four" : "Three"} years of progress</h2>
      {featured && (
        <div className="rpt-chart mt-4 rounded-2xl border border-[var(--rpt-accent-line,#e9cf86)] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="text-lg font-black text-[#0b1730]">{featured.label}</div>
            <Change vals={featured.vals} years={years} label={featured.label} />
          </div>
          <div className="mt-4"><Columns vals={featured.vals} years={years} height={220} /></div>
        </div>
      )}
      <div className="rpt-chart mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {rest.map((r) => (
          <div key={r.label} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="min-h-[2.5rem] text-[13px] font-semibold leading-tight text-gray-700">{r.label}</div>
            <div className="mt-2"><Columns vals={r.vals} years={years} height={120} unit={PERCENT.test(r.label) ? "%" : ""} /></div>
            <div className="mt-2 text-center"><Change vals={r.vals} years={years} label={r.label} /></div>
          </div>
        ))}
      </div>
      <div className="rpt-table mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#0b1730] text-white">
              <th className="px-3 py-2 text-left font-semibold">{who}</th>
              {years.map((yr, i) => <th key={yr} className={`px-3 py-2 text-right font-semibold ${i === years.length - 1 ? "text-[var(--rpt-accent,#d4af55)]" : ""}`}>{yr}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.label} className={i % 2 ? "bg-[#f8f9fc]" : ""}>
                <td className="px-3 py-2 text-gray-700">{r.label}</td>
                {r.vals.map((v, j) => <td key={j} className={`px-3 py-2 text-right tabular-nums ${j === years.length - 1 ? "font-black text-[#0b1730]" : "text-gray-600"}`}>{v}{PERCENT.test(r.label) ? "%" : ""}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p className="mt-3 text-xs leading-relaxed text-gray-500" dangerouslySetInnerHTML={inlineHtml(note)} />}
    </section>
  )
}

export function Chip({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gold" | "gray" | "navy" }) {
  const c = tone === "gold" ? "bg-[var(--rpt-accent-soft,#fbf3dc)] text-[var(--rpt-accent-ink,#7a5d12)] border-[var(--rpt-accent-line,#e9cf86)]" : tone === "navy" ? "bg-[#0b1730] text-white border-[#0b1730]" : "bg-gray-50 text-gray-700 border-gray-200"
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${c}`}>{children}</span>
}

export const ordinal = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`

/** Locked: no props at all, so nothing that identifies the wrestler reaches the page, even blurred (Matt, 25 Oct). */
/** "South Rowan · Class of 2030": school (never a placeholder like "NA") then class year. */
export const schoolAndClass = (e: SnapshotEntrant | undefined) =>
  [e?.school && !/^n\/?a$/i.test(e.school) ? e.school : null, e?.classYear ? `Class of ${e.classYear}` : null].filter(Boolean).join(" · ")

export const WIN_TYPE: Record<string, string> = { DEC: "Dec", MD: "Major", TF: "Tech fall", F: "Fall", FOR: "Forfeit", "M FOR": "Medical forfeit", DQ: "DQ", INJ: "Injury default" }
export const score = (b: SnapshotBout) => (b.winType === "F" ? (b.result.match(/\d+:\d+/)?.[0] ?? "") : /FOR/.test(b.winType) ? "" : b.result)

/**
 * Every match with everything we hold on the opponent: seed, national rankings, state and national
 * finishes, and where he placed here. The opponent graph is the point (Matt, 25 Oct): all of it is
 * computed from the results, never typed.
 */
export function MatchList({ bouts, weight, placings }: { bouts: SnapshotBout[]; weight: string; placings: Map<string, number> }) {
  const rows = bouts.filter((b) => b.winType !== "BYE")
  if (!rows.length) return null
  return (
    <div className="rpt-matches border-t border-gray-100 bg-[#fafbfd] px-4 py-3">
      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Every match</div>
      <ol className="mt-2 space-y-2">
        {rows.map((b) => {
          const place = placings.get(`${nameKey(b.opponent)}|${weight.replace(/\D/g, "")}`)
          const creds = (b.reasons ?? []).filter((r) => !/^#\d+ seed$/.test(r))
          return (
            <li key={b.key} className="flex gap-2.5 text-sm">
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-black ${b.win ? "bg-[#0b1730] text-white" : "bg-gray-200 text-gray-600"}`}>{b.win ? "W" : "L"}</span>
              <div className="min-w-0">
                <div className="text-gray-900">
                  <span className="font-semibold">{b.opponent}</span>
                  <span className="text-gray-500"> ({b.opponentTeam})</span>
                  {b.opponentSeed ? <span className="ml-1 rounded bg-[var(--rpt-accent-soft,#fbf3dc)] px-1 text-[11px] font-bold text-[var(--rpt-accent-ink,#7a5d12)]">#{b.opponentSeed} seed</span> : null}
                  {place ? <span className="ml-1 rounded bg-[#0b1730] px-1 text-[11px] font-bold text-white">Placed {ordinal(place)} here</span> : null}
                </div>
                <div className="text-xs text-gray-500">{[b.round, [WIN_TYPE[b.winType] ?? b.winType, score(b)].filter(Boolean).join(" ")].join(" · ")}</div>
                {creds.length > 0 && <div className="text-xs text-gray-600">{creds.join(" · ")}</div>}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}


/** Bottom-right of every card: not every coach knows the name is a link (Matt, 26 Oct 2026). */
export function ViewProfilePill({ athleteId }: { athleteId: string }) {
  return (
    <div className="flex justify-end px-4 pb-3 print:hidden">
      <Link href={`/athletes/${athleteId}`} className="inline-flex items-center gap-1 rounded-full bg-[#0b1730] px-3 py-1 text-xs font-semibold text-white hover:bg-[#13294b]">
        View profile →
      </Link>
    </div>
  )
}

/**
 * RecruitWrestlers' accent for the shared parts above: lime, never gold (Matt, 20 Oct 2026). Spread
 * into a RecruitWrestlers page's <main> style; NC United's pages set nothing and keep their gold.
 */
export const RW_ACCENT = {
  "--rpt-accent": "#A3E635",
  "--rpt-accent-line": "#D9F99D",
  "--rpt-accent-soft": "#F7FEE7",
  "--rpt-accent-ink": "#3F6212",
} as React.CSSProperties

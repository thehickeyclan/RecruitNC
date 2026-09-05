import type { Metadata } from "next"
import { HardLink } from "@/components/hard-link"
import { tocContainerClass, tocDisplayClass, tocSectionClass, TocVarsityHeading } from "@/components/toc/toc-theme"
import {
  FRIDAY_ROUNDS,
  ROUND_KIND_LABEL,
  SATURDAY_ROUNDS,
  type RoundKind,
  type ScheduledRound,
} from "@/lib/toc/round-schedule"
import { TOC_EVENT_DATES_RANGE, TOC_VENUE } from "@/lib/toc/constants"

export const metadata: Metadata = {
  title: "Round Schedule | Tournament of Champions 2026",
  description:
    "Round-by-round running order for the NC United Tournament of Champions, 18–19 September 2026 at Hope Community Church, Apex.",
}

/** Championship gold, consolation slate, finals red — the same three the legend names. */
const DOT: Record<RoundKind, string> = {
  championship: "bg-[#D3B574]",
  consolation: "bg-white/35",
  finals: "bg-[#CC0000]",
  ceremony: "bg-white/15",
}

function RoundRow({ round }: { round: ScheduledRound }) {
  return (
    <li className="flex items-start gap-3 border-b border-white/10 py-3 last:border-b-0 sm:gap-4 sm:py-4">
      <span className="w-24 shrink-0 pt-0.5 text-sm font-bold tabular-nums text-white sm:w-32 sm:text-base">
        {round.time}
      </span>
      <span aria-hidden className={`mt-2 h-2 w-2 shrink-0 rounded-[2px] ${DOT[round.kind]}`} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-snug text-white">{round.label}</span>
        {round.detail ? <span className="mt-0.5 block text-sm leading-snug text-white/50">{round.detail}</span> : null}
      </span>
      {round.tag ? (
        <span className="shrink-0 pt-0.5 text-xs font-bold tabular-nums text-white/35">{round.tag}</span>
      ) : null}
    </li>
  )
}

function Day({ title, subtitle, rounds }: { title: string; subtitle: string; rounds: readonly ScheduledRound[] }) {
  return (
    <div>
      <h2 className={`text-xl font-black uppercase tracking-tight text-white sm:text-2xl ${tocDisplayClass()}`}>
        {title}
      </h2>
      <p className="mt-1 text-sm text-[#D3B574]">{subtitle}</p>
      <ul className="mt-4 list-none p-0">
        {rounds.map((round) => (
          <RoundRow key={`${round.time}-${round.label}`} round={round} />
        ))}
      </ul>
    </div>
  )
}

export default function TocRoundSchedulePage() {
  return (
    <main className="min-h-screen bg-[#060f1f] text-white">
      <section className={tocSectionClass()}>
        <div className={tocContainerClass()}>
          {/* The shared heading defaults to navy for light sections; this page is near-black. */}
          <TocVarsityHeading as="h1" className="text-white">
            Tentative Round Schedule
          </TocVarsityHeading>

          <p className="mt-4 max-w-2xl leading-relaxed text-white/60">
            {/* The same caveat every tournament needs: a bracket that runs clean runs early. */}
            Rounds start early when we are ahead of the bracket. Treat these as the earliest a round will go,
            not the latest — be in the building before your wrestler&apos;s round rather than on it.
          </p>
          <p className="mt-2 text-sm text-white/45">
            {TOC_EVENT_DATES_RANGE} · {TOC_VENUE.name}, {TOC_VENUE.campus}
          </p>

          <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-12">
            <Day
              title="Friday, September 18"
              subtitle="One weigh-in · opening ceremony · first round on two mats"
              rounds={FRIDAY_ROUNDS}
            />
            <Day
              title="Saturday, September 19"
              subtitle="Brackets resume · Giving Hour · finals on one mat"
              rounds={SATURDAY_ROUNDS}
            />
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 pt-6">
            {(["championship", "consolation", "finals"] as const).map((kind) => (
              <span key={kind} className="flex items-center gap-2">
                <span aria-hidden className={`h-2 w-2 rounded-[2px] ${DOT[kind]}`} />
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-white/45">
                  {ROUND_KIND_LABEL[kind]}
                </span>
              </span>
            ))}
          </div>

          <p className="mt-8 text-sm text-white/45">
            Ten weight classes, true double-elimination, top three place.{" "}
            <HardLink href="/tournament-of-champions" className="font-semibold text-[#D3B574] underline-offset-4 hover:underline">
              Back to the tournament page
            </HardLink>
          </p>
        </div>
      </section>
    </main>
  )
}

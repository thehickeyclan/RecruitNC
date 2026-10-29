import { Award, Crosshair, GraduationCap, ShieldCheck, Swords, Trophy } from "lucide-react"

/**
 * What a College Prospect Ranking measures, said once and plainly (Matt, 29 October 2026).
 *
 * Every pillar here is something the ranking actually weighs: national results first, then who
 * they beat and how good those opponents really were, then state results, and a person finishes
 * every board. Nothing on this list is a form field or a reputation.
 */
const PILLARS = [
  {
    icon: Trophy,
    title: "National participation and performance",
    body: "Super 32, NHSCA, Fargo, Journeymen and the Tournament of Champions. Showing up counts, and placing counts most: an All-American finish is the strongest single result on any résumé.",
  },
  {
    icon: Swords,
    title: "Direct wins",
    body: "When two ranked wrestlers have met in the last twelve months, that result carries the most weight in their order, and the latest meeting counts most.",
  },
  {
    icon: Crosshair,
    title: "Strength of competition",
    body: "Each win is scored by the opponent's own record: nationally ranked, state champion, All-American. The score line doesn't decide it. A close win over a ranked opponent outweighs a pin over an unranked one.",
  },
  {
    icon: GraduationCap,
    title: "College readiness",
    body: "The question behind every rank: whose results already come against the kind of opponents a college lineup brings, and hold up there.",
  },
  {
    icon: Award,
    title: "State results",
    body: "State titles and placings count, weighed by how deep the bracket is. They support a ranking; they don't decide it on their own.",
  },
  {
    icon: ShieldCheck,
    title: "Reviewed by people",
    body: "A formula ranks every wrestler in the class from the evidence. A staff ranker who knows the state reviews it, checks it against the head-to-heads, and signs off on every board before it is published.",
  },
] as const

export function RankingMethod({ womens = false }: { womens?: boolean }) {
  return (
    <section className="mx-auto mt-14 max-w-6xl" aria-labelledby="how-we-rank">
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#D7B95A]">How we rank</p>
      <h2 id="how-we-rank" className="mt-2 text-center text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
        Built on results, finished by people
      </h2>
      {womens ? (
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-white/60">
          Women wrestle freestyle in college, so on the women&rsquo;s boards national and state freestyle results carry the most weight.
        </p>
      ) : null}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PILLARS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-sm border border-white/10 bg-white/[0.03] p-5">
            <Icon className="h-5 w-5 text-[#D7B95A]" aria-hidden />
            <h3 className="mt-3 text-sm font-black uppercase tracking-wide text-white">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/60">{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/** What the marks on a card mean, shown only when the board carries any of them. */
export function RankingLegend({ moved, isNew }: { moved: boolean; isNew: boolean }) {
  if (!moved && !isNew) return null
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
      <span>Since the last update:</span>
      {moved ? (
        <>
          <span className="text-emerald-300">▲ moved up</span>
          <span className="text-red-300">▼ moved down</span>
        </>
      ) : null}
      {isNew ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="rounded-sm bg-emerald-400 px-1.5 py-0.5 text-[10px] font-black text-[#061224]">NEW</span>
          new to the board
        </span>
      ) : null}
    </div>
  )
}

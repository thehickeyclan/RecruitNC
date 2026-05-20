import { Smartphone, Trophy, Tv, ExternalLink, PlayCircle } from "lucide-react"

/** NHSCA National Duals 2026 — streaming & brackets (subscriber services; links open externally). */
const FLO_MAIN = "https://www.flowrestling.org/"
/** NHSCA official duals landing (brackets / results when posted). */
const NHSCA_DUALS_PAGE = "https://nhsca-events.com/national-duals/"

export function NHSCADuals2026HowToWatch() {
  return (
    <section
      id="how-to-watch"
      className="scroll-mt-28 rounded-2xl border border-white/25 bg-[#061428]/90 shadow-xl overflow-hidden"
      aria-labelledby="how-to-watch-heading"
    >
      <div className="border-b border-white/10 px-5 py-4">
        <h2 id="how-to-watch-heading" className="text-lg font-bold text-white tracking-tight">
          How to watch
        </h2>
        <p className="text-sm text-white/70 mt-1">
          NHSCA National Duals is broadcast on FloWrestling; brackets and placement info post on NHSCA.
        </p>
      </div>

      {/* Flo hero strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-[#B31B1B] via-[#9a1717] to-[#7f1414] px-5 py-5 sm:px-6 border-b border-white/10">
        <div className="min-w-0">
          <p className="text-xl sm:text-2xl font-black text-white leading-tight">Watch Live on FloWrestling</p>
          <p className="text-white/95 text-sm sm:text-base mt-1">
            Stream every match from Sat May 23–Mon May 25, 2026 (NHSCA competition days · weigh-ins Fri May 22)
          </p>
        </div>
        <a
          href={FLO_MAIN}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#B31B1B] shadow hover:bg-gray-50 transition-colors"
        >
          <PlayCircle className="h-5 w-5" aria-hidden />
          Watch Live
          <ExternalLink className="h-4 w-4 opacity-70" aria-hidden />
        </a>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#003366]/40 bg-[#0B2545] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D3B574]/25 text-[#D3B574] shrink-0" aria-hidden>
                <Tv className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-white">On your TV</p>
                <p className="text-sm text-white/80 mt-1 leading-snug">
                  Download the FloSports app — available on Roku, Fire TV, Google TV, Apple TV, Samsung, VIZIO, &amp; LG.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-[#003366]/40 bg-[#0B2545] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D3B574]/25 text-[#D3B574] shrink-0" aria-hidden>
                <Smartphone className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-white">On the go</p>
                <p className="text-sm text-white/80 mt-1 leading-snug">
                  Download the FloSports app on iOS or Android.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={FLO_MAIN}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#D3B574] px-4 py-3 text-[#0B2545] font-bold hover:bg-[#E5C97A] transition-colors"
          >
            <Tv className="h-5 w-5 shrink-0" aria-hidden />
            Live stream
            <ExternalLink className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          </a>
          <a
            href={NHSCA_DUALS_PAGE}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-white/80 bg-white px-4 py-3 text-[#002147] font-bold hover:bg-white/95 transition-colors"
          >
            <Trophy className="h-5 w-5 shrink-0 text-[#002147]" aria-hidden />
            Brackets &amp; results
            <ExternalLink className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
          </a>
        </div>

        <p className="text-xs text-white/65 leading-relaxed border-t border-white/10 pt-4">
          <strong className="text-white/85">Archived footage:</strong> Video from the event is typically archived for FloWrestling subscribers according to Flo&apos;s terms — check Flo for replay availability after the event.
        </p>
      </div>
    </section>
  )
}

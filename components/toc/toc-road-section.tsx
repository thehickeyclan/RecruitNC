import { Check, ChevronRight } from "lucide-react"
import { TocVarsityHeading, tocSectionClass } from "@/components/toc/toc-theme"
import { TOC_ROAD_MILESTONES, tocRoadStates } from "@/lib/toc/road-to-september"

/**
 * "Road to September 18" — tells every visitor exactly what's coming and when, so one
 * visit becomes six. Server component: the page is force-dynamic, so states advance on
 * their own as dates pass (past → check, next → highlighted).
 */
export function TocRoadSection() {
  const states = tocRoadStates()

  return (
    <section id="road" className={`relative scroll-mt-20 bg-white border-y border-[#0B1D3A]/10 ${tocSectionClass()}`}>
      <div className="container mx-auto w-full px-4 sm:px-6 max-w-6xl">
        <p className="text-[#CC0000] text-xs font-semibold uppercase tracking-[0.22em] mb-2">What happens next</p>
        <TocVarsityHeading as="h2" className="mb-3 sm:mb-4">
          Road to September 18
        </TocVarsityHeading>
        <p className="text-[#0B1D3A]/90 text-base sm:text-lg leading-relaxed mb-8 max-w-3xl">
          Every date that matters between now and the first whistle.
        </p>

        <ol className="space-y-0">
          {TOC_ROAD_MILESTONES.map((m, i) => {
            const state = states[i]
            const isLast = i === TOC_ROAD_MILESTONES.length - 1
            return (
              <li key={m.label} className="relative flex gap-4">
                {/* Rail */}
                <div className="flex flex-col items-center">
                  <div
                    className={
                      state === "done"
                        ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0B1D3A] text-white"
                        : state === "next"
                          ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#CC0000] text-white ring-4 ring-[#CC0000]/20"
                          : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#0B1D3A]/25 bg-white text-[#0B1D3A]/40"
                    }
                    aria-hidden
                  >
                    {state === "done" ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                  {!isLast && <div className="w-0.5 grow bg-[#0B1D3A]/15 my-1" aria-hidden />}
                </div>

                {/* Content */}
                <div className={isLast ? "pb-1" : "pb-6"}>
                  <p
                    className={
                      state === "next"
                        ? "text-xs font-bold uppercase tracking-wide text-[#CC0000]"
                        : "text-xs font-semibold uppercase tracking-wide text-[#0B1D3A]/50"
                    }
                  >
                    {m.dateLabel}
                    {state === "next" && <span className="ml-2 rounded-full bg-[#CC0000] px-2 py-0.5 text-[10px] font-bold text-white">Up next</span>}
                  </p>
                  <p className={`mt-0.5 font-bold ${state === "done" ? "text-[#0B1D3A]/60" : "text-[#0B1D3A]"}`}>
                    {m.label}
                  </p>
                  {m.detail && (
                    <p className={`mt-0.5 text-sm leading-relaxed ${state === "done" ? "text-[#0B1D3A]/45" : "text-[#0B1D3A]/70"}`}>
                      {m.detail}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

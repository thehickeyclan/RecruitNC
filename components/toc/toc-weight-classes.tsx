import { TOC_WEIGH_IN_LINE, TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import { TocPatrioticBar, TocVarsityHeading } from "@/components/toc/toc-theme"

export function TocWeightClassesList() {
  return (
    <section className="py-12 sm:py-16 bg-[#0B1D3A] text-white relative">
      <div className="container mx-auto w-full px-4 sm:px-6 max-w-4xl text-center">
        <TocVarsityHeading as="h2" className="text-white mb-2">
          College weight classes
        </TocVarsityHeading>
        <p className="text-white/70 text-sm sm:text-base mb-6 sm:mb-8 max-w-xl mx-auto leading-relaxed">
          Eleven brackets · eight wrestlers each · one champion earns the jacket
        </p>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {TOC_WEIGHT_CLASSES.map((w) => (
            <span
              key={w}
              className="inline-flex h-12 sm:h-14 min-w-[3.25rem] sm:min-w-[3.75rem] items-center justify-center rounded-sm bg-[#060f1f] border-2 border-white/25 text-white font-bold text-lg sm:text-xl px-2.5 sm:px-3 relative overflow-hidden"
            >
              <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#CC0000]" aria-hidden />
              {w}
            </span>
          ))}
        </div>
        <p className="mt-6 sm:mt-8 text-sm sm:text-base text-white/80 font-medium tracking-wide">
          {TOC_WEIGH_IN_LINE}
        </p>
        <p className="mt-4 text-sm text-white/55">
          Boys division in Year 1 · girls divisions planned for Year 2
        </p>
      </div>
      <TocPatrioticBar className="absolute bottom-0 left-0 right-0" />
    </section>
  )
}

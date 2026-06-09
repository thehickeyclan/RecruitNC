import { TocPatrioticBar, TocVarsityHeading } from "@/components/toc/toc-theme"
import { TOC_ATHLETE_QUOTES } from "@/lib/toc/constants"

export function TocAthleteQuotesSection() {
  return (
    <section id="voices" className="relative scroll-mt-20 bg-[#0B1D3A] text-white py-16 md:py-20">
      <TocPatrioticBar className="absolute top-0 left-0 right-0" />
      <div className="container mx-auto px-4 max-w-6xl pt-4">
        <div className="max-w-3xl mb-10">
          <p className="text-[#CC0000] text-xs font-semibold uppercase tracking-[0.22em] mb-2">
            {TOC_ATHLETE_QUOTES.eyebrow}
          </p>
          <TocVarsityHeading as="h2" className="text-4xl md:text-5xl text-white mb-4">
            {TOC_ATHLETE_QUOTES.headline}
          </TocVarsityHeading>
          <p className="text-white/75 text-lg leading-relaxed">{TOC_ATHLETE_QUOTES.lead}</p>
        </div>

        <ul className="grid gap-5 md:grid-cols-2 list-none p-0 m-0">
          {TOC_ATHLETE_QUOTES.quotes.map(({ name, credentials, quote }) => (
            <li
              key={name}
              className="flex h-full flex-col rounded-sm border-2 border-white/10 bg-[#060f1f]/60 p-6 md:p-7 border-l-4 border-l-[#CC0000]"
            >
              <blockquote className="flex-1">
                <p className="text-white/90 text-base md:text-lg leading-relaxed italic">&ldquo;{quote}&rdquo;</p>
              </blockquote>
              <footer className="mt-6 pt-5 border-t border-white/10">
                <p className="font-bold text-white text-base">{name}</p>
                <p className="text-white/55 text-xs md:text-sm mt-1 leading-relaxed">{credentials}</p>
              </footer>
            </li>
          ))}
        </ul>
      </div>
      <TocPatrioticBar className="absolute bottom-0 left-0 right-0" />
    </section>
  )
}

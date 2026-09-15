import { TocPatrioticBar, TocVarsityHeading, tocDisplayClass } from "@/components/toc/toc-theme"
import { TOC_KNOW_BEFORE_YOU_GO, TOC_KNOW_BEFORE_YOU_GO_INTRO } from "@/lib/toc/know-before-you-go"

/**
 * Tournament-day essentials — arrival, weigh-ins, bags, food, access — near the top of the TOC page,
 * where families look first the week of the event.
 */
export function TocKnowBeforeYouGo() {
  return (
    <section id="know-before-you-go" className="relative scroll-mt-20 bg-[#0A1628] py-12 text-white sm:py-16">
      <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#CC0000]">Tournament weekend</p>
        <TocVarsityHeading as="h2" className="mt-2 text-white">
          Know before you go
        </TocVarsityHeading>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-white/75 sm:text-lg">{TOC_KNOW_BEFORE_YOU_GO_INTRO}</p>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {TOC_KNOW_BEFORE_YOU_GO.map((section) => (
            <div key={section.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className={`text-lg text-[#D3B574] ${tocDisplayClass()}`}>{section.title}</h3>
              <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-white/80 marker:text-[#CC0000] sm:text-base">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {section.link ? (
                <a
                  href={section.link.href}
                  className="mt-3 inline-block text-sm font-bold text-[#D3B574] underline-offset-4 hover:text-white hover:underline"
                >
                  {section.link.label} →
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <TocPatrioticBar className="mt-12 sm:mt-16" />
    </section>
  )
}

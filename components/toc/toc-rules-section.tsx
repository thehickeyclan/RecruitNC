import { ClipboardList } from "lucide-react"
import { TOC_GOFAN_TICKETS_URL, TOC_RULES_GROUPS, TOC_RULES_SUMMARY } from "@/lib/toc/constants"
import { tocDisplayClass } from "@/components/toc/toc-theme"

/**
 * The rules and format, as one section rather than four half-answers.
 *
 * Everything else on this page sells the tournament — tickets, hotels, apparel, the scholarship.
 * A coach who wants to know match length, or a wrestler who wants to know whether headgear is
 * required, had nowhere to go: those facts lived in a weigh-in callout, a quick-facts tile and
 * three FAQ answers, and nowhere as a set.
 *
 * The summary line is the point of the section and reads first. A coach who reads only that has
 * the six things that change how they prepare.
 */
export function TocRulesSection() {
  return (
    <section id="rules" aria-labelledby="toc-rules-heading" className="scroll-mt-24">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-6 w-6 shrink-0 text-[#CC0000]" aria-hidden />
        <h2 id="toc-rules-heading" className={`text-2xl sm:text-3xl text-[#0B1D3A] ${tocDisplayClass()}`}>
          Rules &amp; format
        </h2>
      </div>

      <p className="mt-3 text-lg sm:text-xl font-semibold leading-snug text-[#0B1D3A]">{TOC_RULES_SUMMARY}</p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {TOC_RULES_GROUPS.map((group) => (
          <div key={group.title} className="rounded-sm border-2 border-[#0B1D3A]/15 bg-white p-4 sm:p-5">
            <h3 className="text-xs font-black uppercase tracking-[0.12em] text-[#CC0000]">{group.title}</h3>
            <ul className="mt-3 space-y-2">
              {group.items.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-[#0B1D3A]/85">
                  <span aria-hidden className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#CC0000]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {/* The one rule that costs money — the corner limit is why people buy a credential. */}
            {group.title === "Coaches" ? (
              <a
                href={TOC_GOFAN_TICKETS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#CC0000] underline underline-offset-4 hover:text-[#0B1D3A]"
              >
                Buy a coach credential
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}

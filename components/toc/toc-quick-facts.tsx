import { CalendarClock, Lock, Scale } from "lucide-react"
import { TocPatrioticBar, tocDisplayClass } from "@/components/toc/toc-theme"
import { TOC_WEIGH_IN } from "@/lib/toc/constants"

const FACTS = [
  { icon: Lock, label: "Invite only", sub: "88 wrestlers · hand-picked at each weight" },
  { icon: CalendarClock, label: "One weigh-in", sub: `${TOC_WEIGH_IN.time} · no Saturday weigh-in` },
  { icon: Scale, label: "College weights", sub: "Eleven brackets · flat scale · no allowance" },
]

export function TocQuickFacts() {
  return (
    <section className="bg-[#060f1f] py-8 sm:py-10">
      <div className="container mx-auto w-full px-4 sm:px-6 max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
          {FACTS.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="text-left border-l-2 border-[#CC0000]/80 pl-3 sm:pl-4">
              <Icon className="h-5 w-5 text-white mb-2" aria-hidden />
              <p className={`text-white text-base sm:text-lg ${tocDisplayClass()}`}>{label}</p>
              <p className="text-white/55 text-xs sm:text-sm mt-1 leading-relaxed">{sub}</p>
            </div>
          ))}
        </div>
      </div>
      <TocPatrioticBar className="mt-8 sm:mt-10" />
    </section>
  )
}

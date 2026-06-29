import { Lock, MapPin, Medal, Sparkles, Trophy } from "lucide-react"
import { TocPatrioticBar, tocDisplayClass } from "@/components/toc/toc-theme"
import { TOC_MATS_LINE } from "@/lib/toc/constants"

const FACTS = [
  { icon: Lock, label: "By invitation only", sub: "You don't enter. You get the call." },
  { icon: Trophy, label: "The brackets are stacked", sub: "Eight elite wrestlers · eleven weights" },
  { icon: Sparkles, label: "Two mats · one finale", sub: TOC_MATS_LINE },
  { icon: MapPin, label: "Premier venue", sub: "Hope Community Church · up to 1,000 seats" },
  { icon: Medal, label: "Earn the jacket", sub: "One champion per weight · NC pride forever" },
]

export function TocQuickFacts() {
  return (
    <section className="bg-[#060f1f] py-8 sm:py-10">
      <div className="container mx-auto w-full px-4 sm:px-6 max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 sm:gap-6">
          {FACTS.map(({ icon: Icon, label, sub }, index) => (
            <div
              key={label}
              className={`text-left border-l-2 border-[#CC0000]/80 pl-3 sm:pl-4 ${index === 2 ? "sm:col-span-2 lg:col-span-1" : ""}`}
            >
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

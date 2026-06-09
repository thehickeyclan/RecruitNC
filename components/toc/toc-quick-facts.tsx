import { Lock, MapPin, Medal, Sparkles, Trophy } from "lucide-react"
import { TocPatrioticBar, tocDisplayClass } from "@/components/toc/toc-theme"

const FACTS = [
  { icon: Lock, label: "By invitation only", sub: "You don't enter. You get the call." },
  { icon: Trophy, label: "The brackets are stacked", sub: "Eight elite wrestlers · eleven weights" },
  { icon: Sparkles, label: "Two mats until finals", sub: "One mat under the lights for the titles" },
  { icon: MapPin, label: "Premier venue", sub: "Hope Community Church · up to 1,000 seats" },
  { icon: Medal, label: "Earn the jacket", sub: "One champion per weight · NC pride forever" },
]

export function TocQuickFacts() {
  return (
    <section className="bg-[#060f1f] py-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {FACTS.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="text-center md:text-left border-l-2 border-[#CC0000]/80 pl-3 md:pl-4">
              <Icon className="h-5 w-5 text-white mx-auto md:mx-0 mb-2" aria-hidden />
              <p className={`text-white text-base sm:text-lg ${tocDisplayClass()}`}>{label}</p>
              <p className="text-white/55 text-xs mt-1">{sub}</p>
            </div>
          ))}
        </div>
      </div>
      <TocPatrioticBar className="mt-10" />
    </section>
  )
}

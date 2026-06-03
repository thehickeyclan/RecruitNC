import { Trophy, Users, Scale, Medal, Calendar } from "lucide-react"
import { TocPatrioticBar, tocDisplayClass } from "@/components/toc/toc-theme"

const FACTS = [
  { icon: Users, label: "88 wrestlers", sub: "8 per weight · invite-only field" },
  { icon: Scale, label: "11 weights", sub: "NCAA collegiate classes + 117 lbs" },
  { icon: Medal, label: "Top 4 = jacket", sub: "Champion jacket at every weight" },
  { icon: Calendar, label: "2 days", sub: "Single weigh-in · no allowance" },
  { icon: Trophy, label: "1,000+ fans", sub: "Apex, NC · September 2026" },
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

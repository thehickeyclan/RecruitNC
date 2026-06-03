"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { TocVarsityHeading } from "@/components/toc/toc-theme"

const FAQ_ITEMS = [
  {
    q: "Who can compete?",
    a: "The field is invite-only. Athletes are nominated by coaches, parents, or themselves, reviewed by NC United staff, and invited if selected for one of 88 spots (8 per weight class).",
  },
  {
    q: "What is the Champion jacket?",
    a: "Top-four placers at each weight earn the NC United Tournament of Champions jacket — navy with arched NORTH CAROLINA on the chest, CHAMPION on the back, red-and-white sleeve stripes, NC silhouette, and 2026 on the sleeve. It is earned on the mat, not sold.",
  },
  {
    q: "What weight classes are used?",
    a: "NCAA collegiate weights plus 117 lbs: 117, 125, 133, 141, 149, 157, 165, 174, 184, 197, and 285. Single weigh-in Friday afternoon with no Saturday allowance.",
  },
  {
    q: "Is there a girls division?",
    a: "Year 1 launches with a boys division. NC United is committed to adding girls divisions in Year 2 as the event grows.",
  },
  {
    q: "When and where is the event?",
    a: "September 4–5, 2026 at Hope Community Church in Apex, North Carolina. Two mats, true double-elimination, top-four placement at each weight.",
  },
  {
    q: "Can I buy tickets now?",
    a: "Ticket sales open later in 2026. Sign up for email updates and we'll notify you when tickets go on sale.",
  },
  {
    q: "How do I sponsor the event?",
    a: "Use the sponsor inquiry form on this page. Our team will send partnership options and follow up directly.",
  },
]

export function TocFaq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="py-16 md:py-20 bg-white" id="faq">
      <div className="container mx-auto px-4 max-w-2xl">
        <TocVarsityHeading as="h2" className="text-4xl mb-8 text-center">
          FAQ
        </TocVarsityHeading>
        <div className="divide-y divide-[#0B1D3A]/10 rounded-sm border-2 border-[#0B1D3A]/10 overflow-hidden">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={item.q} className={isOpen ? "bg-[#0B1D3A]/[0.03]" : ""}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-[#0B1D3A] hover:bg-[#0B1D3A]/5"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span className={isOpen ? "border-l-4 border-[#CC0000] pl-3" : "pl-3 border-l-4 border-transparent"}>
                    {item.q}
                  </span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-[#CC0000] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen ? <p className="px-5 pb-4 pl-8 text-muted-foreground text-sm leading-relaxed">{item.a}</p> : null}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

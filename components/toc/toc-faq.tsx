"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { TocVarsityHeading, tocSectionClass } from "@/components/toc/toc-theme"
import { TOC_CONTACT_EMAIL, TOC_MATS_LINE, TOC_TICKET_SALE_MONTH } from "@/lib/toc/constants"

const FAQ_ITEMS = [
  {
    q: "Who can compete?",
    a: "By invitation only. You don't enter — you get the call. Athletes are nominated, reviewed by NC United staff, and invited if selected for one of 88 spots (eight per weight class).",
  },
  {
    q: "What makes the Tournament of Champions different?",
    a: `Invite-only — eight wrestlers per weight. College weight classes. Stacked eight-person brackets with true double-elimination and top-four placement. ${TOC_MATS_LINE} An elite Apex venue built for great wrestling and a crowd — championship-level production, not another grind-through tournament.`,
  },
  {
    q: "What weight classes are used?",
    a: "Eleven brackets: the ten standard NCAA collegiate weights (125 through 285) plus 117 lbs — so the state's lightest elite wrestlers have a bracket of their own. That's the full card: 117, 125, 133, 141, 149, 157, 165, 174, 184, 197, and 285.",
  },
  {
    q: "How does weigh-in work?",
    a: "Single weigh-in Friday, 3:00–5:00 PM, covering both competition days. No Saturday weight allowance. Skin checks at the scale. USA Wrestling card required.",
  },
  {
    q: "Will college coaches be there?",
    a: "Yes. A dedicated section for college coaches gives programs clear sightlines to watch the brackets live all weekend.",
  },
  {
    q: "What is the Champion jacket?",
    a: "Only the champion at each weight earns the NC United Tournament of Champions jacket — navy with arched NORTH CAROLINA on the chest, CHAMPION on the back, red-and-white sleeve stripes, NC silhouette, and 2026 on the sleeve. Top-four placement is recognized on the podium; the jacket is for the winner alone. It is earned on the mat, not sold.",
  },
  {
    q: "Is there a girls division?",
    a: "Year 1 launches with a boys division. NC United is committed to adding girls divisions in Year 2 as the event grows.",
  },
  {
    q: "When and where is the event?",
    a: `September 4–5, 2026 at Hope Community Church (Apex Campus), 2080 East Williams Street, Apex, NC. ${TOC_MATS_LINE} Seating for up to 1,000, plus a dedicated section for college coaches.`,
  },
  {
    q: "Will the event be streamed?",
    a: "Yes — the Tournament of Champions will be live streamed. Broadcast details and watch links will be announced soon. Sign up for email updates on this page to get the stream link when it's live.",
  },
  {
    q: "Can I buy tickets now?",
    a: `Not yet. Tickets go on sale ${TOC_TICKET_SALE_MONTH}. Sign up for the email list to be notified the moment they're live. Single-day and weekend passes will be available. Pricing to be announced.`,
  },
  {
    q: "How do I sponsor the event?",
    a: `Use the sponsor inquiry form on this page or email ${TOC_CONTACT_EMAIL}. Our team will send the full tier deck and follow up directly.`,
  },
]

export function TocFaq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className={`bg-white scroll-mt-20 ${tocSectionClass()}`} id="faq">
      <div className="container mx-auto w-full px-4 sm:px-6 max-w-2xl">
        <TocVarsityHeading as="h2" className="mb-6 sm:mb-8 text-center">
          FAQ
        </TocVarsityHeading>
        <div className="divide-y divide-[#0B1D3A]/10 rounded-sm border-2 border-[#0B1D3A]/10 overflow-hidden">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={item.q} className={isOpen ? "bg-[#0B1D3A]/[0.03]" : ""}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-4 sm:px-5 py-4 min-h-[3.25rem] text-left font-semibold text-[#0B1D3A] hover:bg-[#0B1D3A]/5"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span className={isOpen ? "border-l-4 border-[#CC0000] pl-3" : "pl-3 border-l-4 border-transparent"}>
                    {item.q}
                  </span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-[#CC0000] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen ? (
                  <p className="px-4 sm:px-5 pb-4 pl-6 sm:pl-8 text-muted-foreground text-sm leading-relaxed">{item.a}</p>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

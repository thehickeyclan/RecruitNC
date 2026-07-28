"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { TocVarsityHeading, tocSectionClass } from "@/components/toc/toc-theme"
import {
  TOC_CONTACT_EMAIL,
  TOC_EVENT_DATES_RANGE,
  TOC_FRIDAY_EVENT_DATE,
  TOC_MATS_LINE,
  TOC_SATURDAY_COMPETITION_DATE,
  TOC_TICKET_SALE_TIMING,
  TOC_VENUE,
  TOC_WEIGH_IN,
} from "@/lib/toc/constants"
import { tocTicketsOnSale } from "@/lib/toc/ticket-sale"
import {
  formatTocRegistrationFee,
  TOC_CONFIRM_WITHIN_DAYS,
  TOC_REGISTRATION_FEE_COVERS,
} from "@/lib/toc/registration-policy"

const FAQ_ITEMS = [
  {
    q: "Who can compete?",
    a: "By invitation only. You don't enter — you get the call. Athletes are nominated, reviewed by NC United staff, and invited if selected for one of 88 spots (eight per weight class).",
  },
  {
    q: "How is NC United selecting athletes?",
    a: "We use the same philosophy as our RecruitNC rankings. We prioritize performance at college opens, national competition, quality of wins, NC United practice performance, and overall body of work. Our goal is to assemble the most elite eight-man bracket possible at every weight — delivering the best value to college coaches and our community.",
  },
  {
    q: "Will NC United coaches be cornering the athletes?",
    a: "No. We encourage each athlete's club and/or high school coach to corner them throughout the tournament. If you need a coach, we're happy to help coordinate.",
  },
  {
    q: "What makes the Tournament of Champions different?",
    a: `Invite-only — eight wrestlers per weight. College weight classes. Stacked eight-person brackets with true double-elimination and top-three placement. ${TOC_MATS_LINE} An elite Apex venue built for great wrestling and a crowd — championship-level production, not another grind-through tournament.`,
  },
  {
    q: "What weight classes are used?",
    a: "Eleven brackets: the ten standard NCAA collegiate weights (125 through 285) plus 117 lbs — so the state's lightest elite wrestlers have a bracket of their own. That's the full card: 117, 125, 133, 141, 149, 157, 165, 174, 184, 197, and 285.",
  },
  {
    q: "Will there be one weigh-in or two? Is there any allowance?",
    a: `${TOC_WEIGH_IN.headline}. ${TOC_WEIGH_IN.detail} First-round bouts follow Friday night.`,
  },
  {
    q: "Will college coaches be there?",
    a: "Yes. Credentialed college coaches, credentialed high school coaches, and tournament officials share one atrium lounge — live feeds from both mats, bracket updates, work tables, charging and Wi-Fi, hospitality on Saturday, recruiting guides for college coaches (delivered in advance and hard copy in the lounge on event day), and a print station for profiles and notes. Credentials required; it's built for coaches and officials working the event, not general spectators.",
  },
  {
    q: "What is the Champion jacket?",
    a: "Only the champion at each weight earns the NC United Tournament of Champions jacket — navy with arched NORTH CAROLINA on the chest, 2026 and CHAMPION on the back, and red-and-white sleeve stripes. Top-three placement is recognized on the podium; the jacket is for the winner alone. It is earned on the mat, not sold.",
  },
  {
    q: "Is there a girls division?",
    a: "Year 1 launches with a boys division. NC United is committed to adding girls divisions in Year 2 as the event grows.",
  },
  {
    q: "When and where is the event?",
    a: `${TOC_EVENT_DATES_RANGE} at ${TOC_VENUE.name} (${TOC_VENUE.campus}), ${TOC_VENUE.address}. ${TOC_FRIDAY_EVENT_DATE}: one official weigh-in at 4:00 PM (no Saturday weigh-in) and first round Friday night. ${TOC_SATURDAY_COMPETITION_DATE}: doors at 7:30 AM, brackets resume at 9:00 AM through single-mat championship finals. ${TOC_MATS_LINE} Seating for up to 1,000, plus a credentialed Coaches & Officials Lounge in a dedicated atrium room.`,
  },
  {
    q: "Will the event be streamed?",
    a: "Yes — the Tournament of Champions will be live streamed. Broadcast details and watch links will be announced soon. Sign up for email updates on this page to get the stream link when it's live.",
  },
  {
    q: "What does registration cost?",
    a: `Invited athletes pay a ${formatTocRegistrationFee()} registration fee during confirmation checkout. That supports tournament entry, ${TOC_REGISTRATION_FEE_COVERS}. Confirm within ${TOC_CONFIRM_WITHIN_DAYS} days of your invite; the spot is locked only after secure card payment is completed.`,
  },
  {
    q: "Can I buy tickets now?",
    a: tocTicketsOnSale()
      ? `Yes — tickets are on sale now through NC United's GoFan page (see the Spectators section above). Saturday admission covers the full tournament including single-mat championship finals.`
      : `Not yet. Tickets go on sale ${TOC_TICKET_SALE_TIMING}. Sign up for the email list to be notified the moment they're live. Saturday admission covers the full tournament including single-mat championship finals. Pricing to be announced.`,
  },
  {
    q: "How do I sponsor the event?",
    a: `Use the sponsor inquiry form on this page or email ${TOC_CONTACT_EMAIL}. Our team will follow up with tier options and the full sponsorship deck.`,
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

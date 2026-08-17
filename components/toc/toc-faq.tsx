"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { TocVarsityHeading, tocSectionClass } from "@/components/toc/toc-theme"
import {
  TOC_CONTACT_EMAIL,
  TOC_CADEN_PERRY_WARRIOR_SCHOLARSHIP,
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
  TOC_REGISTRATION_FEE_COVERS,
} from "@/lib/toc/registration-policy"

const FAQ_ITEMS = [
  {
    q: "Who can compete?",
    a: "By invitation only. You don't enter — you get the call. Athletes are nominated, reviewed by NC United staff, and invited if selected for one of 88 spots (eight per weight class).",
  },
  {
    q: "How is NC United selecting athletes?",
    a: "We use the same philosophy as our RecruitNC rankings. We prioritize performance at college opens, national competition, quality of wins, NC United practice performance, and overall body of work. Most weights are built as elite eight-person fields; select deep weights may expand to 10 or 12 without enlarging the other brackets.",
  },
  /**
   * Eligibility / NCHSAA compliance block. Every citation below is quoted from the 2025-26 NCHSAA
   * Handbook. Do not soften or paraphrase the rule text without re-checking the Handbook first —
   * these answers exist to be read by someone trying to disqualify the event.
   */
  {
    q: "Does competing in the Tournament of Champions affect NCHSAA eligibility?",
    a: "No. TOC is an independent NC United event, not a scholastic competition, and it is held outside the NCHSAA wrestling season — Rule 4.14.1 sets the date of first practice at October 29 and the date of first match at November 10, well after our September dates. Wrestlers enter as individuals, unattached. NCHSAA Rule 2.2.13 defines an unattached athlete as one who is not representing a school team, and states directly: “The NCHSAA does not regulate unattached student-athletes.”",
  },
  {
    q: "Is the Tournament of Champions an “all-star” event under NCHSAA rules?",
    a: "No, and this is a definitional question rather than a matter of opinion. Rule 1.2.11(1)(d) makes a student ineligible in a sport for “participating on an all-star team or in an all-star game or bowl game that is not sanctioned by the administering organization of which the student’s school is a member.” The Handbook’s Application Note to 1.2.11 then defines that term through requirements joined by “and” — every element has to be present — one of which is that “one or both teams is composed of players selected from two or more regularly constituted teams.” TOC has no teams at all. It is an individual bracketed tournament: wrestlers enter individually, compete individually, place individually, and no team score is kept. Invitation is how the field is built; it does not create a team, and the rule turns on team composition rather than on selectivity.",
  },
  {
    q: "Do wrestlers compete for a school or a team at TOC?",
    a: "No. There are no school entries, no school rosters, no team scoring, and no school-versus-school result. Wrestlers do not compete in school uniforms and do not use school equipment or school transportation. Rule 1.2.2(d) provides that school uniforms and equipment, including transportation, may not be used for any outside organization competition or by athletes performing unattached during the academic school year, and Rule 2.2.13 requires an unattached athlete to assume his or her own expenses. Where an athlete attends school appears on profiles for identification only — the same way a club is listed — not as a competitive affiliation.",
  },
  {
    q: "Does the Champion jacket affect amateur status?",
    a: "We treat it under the amateur rule rather than as a souvenir, because the Handbook is explicit that items received in connection with athletic participation count as remuneration. Rule 1.2.11(1)(c) permits a student to accept a gift or merchandise provided three conditions are met together: the value stays within the Handbook’s per-season limit, the item is totally consumable and nontransferable or “labeled in a permanent manner (e.g., an engraved or monogrammed item),” and the item is approved by the student’s principal and the local superintendent. Every TOC champion jacket is permanently embroidered with NORTH CAROLINA, the event year, and CHAMPION, which satisfies the permanent-label condition. NC United provides each champion’s family written documentation of the award and its value so it can be presented to the principal and superintendent for the approval the rule requires.",
  },
  {
    q: "Are there cash prizes for winning at TOC?",
    a: "No. TOC awards no prize money and no performance-based compensation of any kind. Champions receive the embroidered jacket; placement is recognized on the podium with medals and awards.",
  },
  {
    q: "Are the Caden Perry Warrior Scholarship or the Guild training awards based on how you place?",
    a: "No, and that separation is deliberate. The Caden Perry Warrior Scholarship is awarded on character and response to adversity through an independent nomination and selection process, and the recipient does not have to compete in TOC at all. The Guild training awards are distributed by random drawing among eligible registrations, and those wrestlers likewise do not have to compete. Neither is tied to winning, placing, or any result on the mat. NCHSAA’s NIL policy (ATHL-008, Section 2.a) provides that an agreement “shall not condition the receipt, type, or extent of any compensation on the extent or quality of the student’s athletic performance,” and we keep every award we present clear of that line.",
  },
  {
    q: "Will NC United coaches be cornering the athletes?",
    a: "No. Each athlete's club coach corners them throughout the tournament — wrestlers come to TOC individually, with their own coach, not as part of a school or team group. If you need a club coach to corner you, we're happy to help coordinate.",
  },
  {
    q: "What makes the Tournament of Champions different?",
    a: `Invite-only at college weight classes. Most weights use compact eight-person brackets; select weights may expand to 10 or 12 on a 16-slot draw with seeded byes. Every format preserves double-elimination and top-three placement. ${TOC_MATS_LINE} An elite Apex venue built for great wrestling and a crowd — championship-level production, not another grind-through tournament.`,
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
    a: "Yes. Credentialed college coaches, credentialed club coaches, and tournament officials share one atrium lounge — live feeds from both mats, bracket updates, work tables, charging and Wi-Fi, hospitality on Saturday, recruiting guides for college coaches (delivered in advance and hard copy in the lounge on event day), and a print station for profiles and notes. Credentials required; it's built for coaches and officials working the event, not general spectators.",
  },
  {
    q: "What is the Champion jacket?",
    a: "Only the champion at each weight earns the NC United Tournament of Champions jacket — navy with arched NORTH CAROLINA on the chest, 2026 and CHAMPION on the back, and red-and-white sleeve stripes. Top-three placement is recognized on the podium; the jacket is for the winner alone. It is earned on the mat, not sold.",
  },
  {
    q: "What is the Caden Perry Warrior Scholarship?",
    a: `${TOC_CADEN_PERRY_WARRIOR_SCHOLARSHIP.headline} is a $1,000 wrestling-support award presented at Tournament of Champions. It is open to active North Carolina wrestlers in grades 6–12, and the recipient does not have to compete in TOC. Funds can support documented wrestling-related expenses such as club dues, private lessons, small groups, camps, tournament fees, travel, and gear. ${TOC_CADEN_PERRY_WARRIOR_SCHOLARSHIP.dates}`,
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
    a: `Invited athletes pay a ${formatTocRegistrationFee()} registration fee during confirmation checkout. That supports tournament entry, ${TOC_REGISTRATION_FEE_COVERS}. Confirm and complete secure card payment by the deadline shown with the athlete's invitation; the spot is locked only after payment is completed.`,
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

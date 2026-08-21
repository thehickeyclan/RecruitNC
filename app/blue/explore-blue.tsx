"use client"

import Link from "next/link"
import { ChevronDown } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useState } from "react"

const GROUPS = [
  {
    id: "about",
    label: "About",
    links: [
      { href: "#recruiting", label: "Recruiting Support & Exposure" },
      { href: "#opportunity", label: "Opportunity & Obligation" },
      { href: "#what-makes-different", label: "What Makes Blue Different" },
    ],
  },
  {
    id: "recognition",
    label: "Recognition",
    links: [
      { href: "#coaching-excellence", label: "Coaching Excellence" },
      { href: "#testimonials", label: "Testimonials" },
    ],
  },
  {
    id: "join-info",
    label: "Join & Info",
    links: [
      { href: "#membership", label: "Membership" },
      { href: "#roster", label: "Roster" },
      { href: "#alumni", label: "Alumni" },
      { href: "/calendar", label: "Practice Calendar" },
      { href: "#drop-ins", label: "Drop-Ins" },
    ],
  },
] as const

function GroupLinks({ links }: { links: readonly { href: string; label: string }[] }) {
  return (
    <ul className="space-y-2">
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className="text-sm text-[#003366] hover:text-[#D3B574] hover:underline"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function ExploreBlue() {
  const [openGroup, setOpenGroup] = useState<string | null>(null)

  return (
    <section id="explore-blue" className="mb-14" aria-label="Explore Blue">
      <h2 className="mb-1 text-lg font-semibold text-[#003366]">Explore Blue</h2>
      <p className="mb-6 text-sm text-[#003366]/80">
        More sections and links to dive deeper.
      </p>

      {/* Mobile: accordion */}
      <div className="space-y-2 md:hidden">
        {GROUPS.map((group) => (
          <Collapsible
            key={group.id}
            open={openGroup === group.id}
            onOpenChange={(open) => setOpenGroup(open ? group.id : null)}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border-2 border-[#D3B574]/40 bg-white px-4 py-3 text-left font-semibold text-[#003366] hover:bg-[#003366]/5">
              {group.label}
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[#D3B574] transition-transform ${openGroup === group.id ? "rotate-180" : ""}`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-x-2 border-b-2 border-[#D3B574]/40 rounded-b-lg px-4 py-3 pb-4">
                <GroupLinks links={group.links} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      {/* Desktop: grid */}
      <div className="hidden md:grid md:grid-cols-3 md:gap-6">
        {GROUPS.map((group) => (
          <div
            key={group.id}
            className="rounded-lg border-2 border-[#D3B574]/40 bg-white/50 p-4"
          >
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#003366]/70">
              {group.label}
            </h3>
            <GroupLinks links={group.links} />
          </div>
        ))}
      </div>
    </section>
  )
}

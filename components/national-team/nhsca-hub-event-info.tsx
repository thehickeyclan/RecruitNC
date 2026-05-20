"use client"

import Image from "next/image"
import { Calendar, Clock, ExternalLink, MapPin, ChevronDown } from "lucide-react"
import { hubPanelClass, hubPanelDescClass, hubPanelHeaderClass, hubPanelTitleClass } from "@/components/national-team/nhsca-hub-theme"
import { cn } from "@/lib/utils"
import { useState } from "react"

const VBSC_MAPS =
  "https://www.google.com/maps/search/?api=1&query=Virginia+Beach+Sports+Center"
const NHSCA_OFFICIAL = "https://nhsca-events.com/national-duals/"

const SCHEDULE_ROWS = [
  {
    day: "Friday, May 22",
    event: "Travel + weigh-ins",
    details: [
      { time: "9:00 AM", desc: "Depart Raleigh (NC United transportation)" },
      { time: "2:00–4:00 PM", desc: "Early weigh-ins at VBSC (optional)" },
      { time: "6:00–7:30 PM", desc: "Regular weigh-ins at VBSC" },
    ],
  },
  {
    day: "Saturday, May 23",
    event: "Day 1 — 3 duals (pool)",
    details: [
      { time: "8:00 AM", desc: "Athlete check-in" },
      { time: "9:00 AM", desc: "First dual begins" },
      { time: "TBD", desc: "See official NHSCA schedule for exact times" },
    ],
  },
  {
    day: "Sunday, May 24",
    event: "Day 2 — min. 3 duals",
    details: [
      { time: "8:00 AM", desc: "Athlete check-in" },
      { time: "9:00 AM", desc: "Duals begin" },
      { time: "TBD", desc: "See official NHSCA schedule for exact times" },
    ],
  },
  {
    day: "Monday, May 25",
    event: "Championship bracket (advancing teams only)",
    details: [
      { time: "8:00 AM", desc: "Athlete check-in for bracket teams" },
      { time: "9:00 AM", desc: "Championship bracket begins" },
      { time: "TBD", desc: "See official NHSCA schedule" },
    ],
  },
] as const

function HubInfoCard({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <article className={cn(hubPanelClass, className)}>
      <header className={hubPanelHeaderClass}>
        <h3 className={cn(hubPanelTitleClass, "flex items-center gap-2")}>
          <Icon className="h-5 w-5 text-[#CBAF5D]" />
          {title}
        </h3>
        {description ? <p className={hubPanelDescClass}>{description}</p> : null}
      </header>
      <div className="p-5 md:p-6 text-sm text-white/85 leading-relaxed">{children}</div>
    </article>
  )
}

/** Event Info tab — schedule, venue, travel summary (dark hub panels). */
export function NhscaHubEventInfo() {
  const [expandedDay, setExpandedDay] = useState<string | null>("Friday, May 22")

  return (
    <div className="space-y-5 md:space-y-6">
      <HubInfoCard icon={Calendar} title="Schedule">
        <ul className="space-y-2">
          {SCHEDULE_ROWS.map(({ day, event, details }) => (
            <li key={day} className="border-b border-white/10 last:border-0">
              <button
                onClick={() => setExpandedDay(expandedDay === day ? null : day)}
                className="w-full flex items-center justify-between gap-3 py-4 text-left hover:bg-white/5 rounded-lg px-2 -mx-2 transition-colors"
              >
                <div className="flex-1">
                  <span className="font-semibold text-white">{day}</span>
                  <span className="ml-2 text-[#D3B574] font-medium">{event}</span>
                </div>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-white/60 transition-transform shrink-0",
                    expandedDay === day && "rotate-180"
                  )}
                />
              </button>
              {expandedDay === day && (
                <div className="pb-3 pl-2 space-y-2">
                  {details.map((detail, idx) => (
                    <div key={idx} className="flex gap-3 text-sm">
                      <span className="font-semibold text-[#CBAF5D] min-w-fit">{detail.time}</span>
                      <span className="text-white/75">{detail.desc}</span>
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-white/60">
          Every team is guaranteed a minimum of 6 dual matches. Full NHSCA times may change — see{" "}
          <a
            href={NHSCA_OFFICIAL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#D3B574] font-medium hover:text-white underline underline-offset-2"
          >
            official schedule
            <ExternalLink className="inline h-3 w-3 ml-0.5 opacity-70" />
          </a>
          .
        </p>
      </HubInfoCard>

      <div className="grid gap-5 md:grid-cols-2 md:gap-6">
        <HubInfoCard icon={MapPin} title="Venue" description="Virginia Beach Sports Center">
          <p className="mb-4">201 Market Street, Virginia Beach, VA — host site for NHSCA National Duals.</p>
          <div className="relative rounded-xl overflow-hidden bg-black/30 aspect-video mb-4 ring-1 ring-white/10">
            <Image
              src="/images/nhsca-virginia-beach-arena.png"
              alt="Virginia Beach Sports Center"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <a
            href={VBSC_MAPS}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-[#D3B574] hover:text-white"
          >
            Open in Maps
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </HubInfoCard>

        <HubInfoCard icon={Clock} title="Team departure" description="NC United transportation">
          <ul className="space-y-3 list-disc pl-5">
            <li>
              <strong className="text-white">Raleigh:</strong> Friday <strong>9:00 AM</strong>
            </li>
            <li>Need a ride? Check GroupMe for the transportation form.</li>
            <li>
              <strong>Early weigh-ins:</strong> Friday 2:00–4:00 PM at VBSC (NC United prepaid for both teams).
            </li>
            <li>
              <strong>Regular weigh-ins:</strong> Friday 6:00–7:30 PM at VBSC.
            </li>
          </ul>
        </HubInfoCard>
      </div>
    </div>
  )
}

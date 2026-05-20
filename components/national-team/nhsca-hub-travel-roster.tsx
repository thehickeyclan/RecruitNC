import { Bus, Hotel } from "lucide-react"
import {
  NHSCA_DUALS_2026_HOTEL_ACCOMMODATIONS,
  NHSCA_DUALS_2026_VAN_TRANSPORTATION,
} from "@/lib/nhsca-duals-2026-travel-roster"
import { hubPanelClass, hubPanelDescClass, hubPanelHeaderClass, hubPanelTitleClass } from "@/components/national-team/nhsca-hub-theme"
import { cn } from "@/lib/utils"

function TravelList({ title, icon: Icon, names }: { title: string; icon: typeof Bus; names: readonly string[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0a2040]/50 p-4">
      <p className="text-sm font-bold text-white flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-[#CBAF5D]" aria-hidden />
        {title}
      </p>
      <ul className="space-y-1.5">
        {names.map((name) => (
          <li key={name} className="text-sm text-white/85 pl-1">
            {name}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Van + hotel sign-up lists for parents on Event Info and Payment checkout. */
export function NhscaHubTravelRoster({ compact = false, className }: { compact?: boolean; className?: string }) {
  if (compact) {
    return (
      <div className={cn("rounded-xl border border-white/10 bg-[#0a2040]/60 p-4 space-y-4", className)}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#CBAF5D]/90 mb-2">Current sign-ups</p>
          <p className="text-xs text-white/50 mb-3">Athletes who have paid for team van or hotel through hub checkout.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <TravelList title="Van transportation" icon={Bus} names={NHSCA_DUALS_2026_VAN_TRANSPORTATION} />
          <TravelList title="Hotel accommodations" icon={Hotel} names={NHSCA_DUALS_2026_HOTEL_ACCOMMODATIONS} />
        </div>
      </div>
    )
  }

  return (
    <article className={cn(hubPanelClass, className)}>
      <header className={hubPanelHeaderClass}>
        <h3 className={hubPanelTitleClass}>Travel sign-ups</h3>
        <p className={hubPanelDescClass}>
          Athletes who have paid for team van or hotel through hub checkout.
        </p>
      </header>
      <div className="p-5 md:p-6 grid sm:grid-cols-2 gap-4">
        <TravelList title="Van transportation" icon={Bus} names={NHSCA_DUALS_2026_VAN_TRANSPORTATION} />
        <TravelList title="Hotel accommodations" icon={Hotel} names={NHSCA_DUALS_2026_HOTEL_ACCOMMODATIONS} />
      </div>
    </article>
  )
}

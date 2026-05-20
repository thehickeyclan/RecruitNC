"use client"

import { ArrowRight } from "lucide-react"
import { HardLink } from "@/components/hard-link"
import { NhscaHubEventInfo } from "@/components/national-team/nhsca-hub-event-info"
import { NhscaHubTeamGearShowcase } from "@/components/national-team/nhsca-hub-team-gear-showcase"
import { hubPanelClass, hubPanelDescClass, hubPanelHeaderClass, hubPanelTitleClass } from "@/components/national-team/nhsca-hub-theme"

/** Apparel tab — full gear gallery + event logistics. */
export function NhscaHubApparelTab() {
  return (
    <div className="space-y-6 md:space-y-8">
      <NhscaHubTeamGearShowcase />

      <article className={hubPanelClass}>
        <header className={hubPanelHeaderClass}>
          <h3 className={hubPanelTitleClass}>Ready to order?</h3>
          <p className={hubPanelDescClass}>
            Checkout runs through Stripe on the Payments tab — full team package or pick items à la carte.
          </p>
        </header>
        <div className="px-5 pb-5 md:px-6 md:pb-6">
          <HardLink
            href="/national-team/hub?tab=payments"
            className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#CBAF5D] px-6 py-3 text-sm font-bold text-[#002147] hover:bg-[#D3B574]"
          >
            Go to Payments
            <ArrowRight className="h-4 w-4" aria-hidden />
          </HardLink>
        </div>
      </article>

      <NhscaHubEventInfo />
    </div>
  )
}

"use client"

import { ArrowRight } from "lucide-react"
import { HardLink } from "@/components/hard-link"
import { NhscaDuals2026ApparelPreview } from "@/components/national-team/nhsca-duals-2026-apparel-preview"
import { NhscaDuals2026SingletPreview } from "@/components/national-team/nhsca-duals-2026-singlet-preview"
import { hubPanelClass, hubPanelDescClass, hubPanelHeaderClass, hubPanelTitleClass } from "@/components/national-team/nhsca-hub-theme"
import { cn } from "@/lib/utils"

/** Compact gear teaser — hub hero, rosters tab, etc. */
export function NhscaHubGearSprinkle({ className }: { className?: string }) {
  return (
    <article className={cn(hubPanelClass, className)}>
      <header className={hubPanelHeaderClass}>
        <h3 className={hubPanelTitleClass}>2026 team gear</h3>
        <p className={hubPanelDescClass}>Blue or white singlet, shorts, and NC United tees.</p>
      </header>
      <div className="p-4 sm:p-5 space-y-4">
        <NhscaDuals2026SingletPreview compact className="mx-auto max-w-sm" />
        <NhscaDuals2026ApparelPreview compact className="mx-auto max-w-sm" />
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <HardLink
            href="/national-team/hub?tab=apparel"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#CBAF5D]/40 bg-[#0a2040] px-4 text-sm font-semibold text-white hover:bg-[#0a2040]/80"
          >
            View apparel
            <ArrowRight className="h-4 w-4 text-[#CBAF5D]" aria-hidden />
          </HardLink>
          <HardLink
            href="/national-team/hub?tab=payments"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#CBAF5D] px-4 text-sm font-bold text-[#002147] hover:bg-[#D3B574]"
          >
            Payments
            <ArrowRight className="h-4 w-4" aria-hidden />
          </HardLink>
        </div>
      </div>
    </article>
  )
}

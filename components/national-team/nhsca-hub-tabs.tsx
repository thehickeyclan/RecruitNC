"use client"

import type { ReactNode } from "react"
import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NHSCADuals2026HowToWatch } from "@/components/national-team/nhsca-duals-2026-how-to-watch"
import { NHSCADuals2026TeamHubFaq } from "@/components/national-team/nhsca-duals-2026-team-hub-faq"
import { NhscaHubApparelTab } from "@/components/national-team/nhsca-hub-apparel-tab"
import { NhscaHubGearSprinkle } from "@/components/national-team/nhsca-hub-gear-sprinkle"
import { NhscaHubMediaTab } from "@/components/national-team/nhsca-hub-media-tab"
import { NhscaHubPaymentsTab } from "@/components/national-team/nhsca-hub-payments-tab"
import { NhscaDualsResultsTab } from "@/components/national-team/nhsca-duals-results-tab"
import { hubPanelClass, hubPanelHeaderClass, hubPanelTitleClass } from "@/components/national-team/nhsca-hub-theme"
import { nhscaHubDefaultTab, parseNhscaHubTabParam } from "@/lib/nhsca-hub-default-tab"
import { cn } from "@/lib/utils"

const tabTriggerClass =
  "rounded-lg min-h-[44px] text-sm font-semibold text-white/65 data-[state=active]:bg-[#CBAF5D] data-[state=active]:text-[#002147] data-[state=active]:shadow-sm hover:text-white/90 transition-colors"

export function NhscaHubTabs({
  rosterContent,
  registrationFallback,
  adminBlock,
  isAdmin = false,
  userId = null,
  nhscaInfoOnly = false,
  hasRoster = false,
}: {
  rosterContent: ReactNode | null
  registrationFallback?: ReactNode
  adminBlock?: ReactNode
  isAdmin?: boolean
  userId?: string | null
  nhscaInfoOnly?: boolean
  hasRoster?: boolean
}) {
  const searchParams = useSearchParams()
  const defaultTab = useMemo(() => {
    const fromUrl = parseNhscaHubTabParam(searchParams.get("tab"))
    if (fromUrl) return fromUrl
    return nhscaHubDefaultTab({ nhscaInfoOnly, hasRoster })
  }, [searchParams, nhscaInfoOnly, hasRoster])

  return (
    <Tabs key={defaultTab} defaultValue={defaultTab} className="w-full">
      <div className="relative mb-6 md:mb-8 -mx-1 px-1 sm:mx-0 sm:px-0">
        <p className="text-[10px] text-white/40 mb-1.5 sm:hidden">Swipe for more tabs →</p>
        <TabsList
          className={cn(
            "flex w-max min-w-full sm:w-full h-auto flex-nowrap sm:grid sm:grid-cols-6 gap-1 rounded-xl bg-[#0a2040] p-1.5",
            "border border-white/10 shadow-inner overflow-x-auto scrollbar-none snap-x snap-proximity sm:overflow-visible"
          )}
        >
        <TabsTrigger value="rosters" className={cn(tabTriggerClass, "shrink-0 snap-start min-w-[38%] sm:min-w-0 px-3")}>
          Rosters
        </TabsTrigger>
        <TabsTrigger value="results" className={cn(tabTriggerClass, "shrink-0 snap-start min-w-[38%] sm:min-w-0 px-3")}>
          Live
        </TabsTrigger>
        <TabsTrigger value="apparel" className={cn(tabTriggerClass, "shrink-0 snap-start min-w-[38%] sm:min-w-0 px-3")}>
          Apparel
        </TabsTrigger>
        <TabsTrigger value="payments" className={cn(tabTriggerClass, "shrink-0 snap-start min-w-[38%] sm:min-w-0 px-3")}>
          Payments
        </TabsTrigger>
        <TabsTrigger value="media" className={cn(tabTriggerClass, "shrink-0 snap-start min-w-[38%] sm:min-w-0 px-3")}>
          Media
        </TabsTrigger>
        <TabsTrigger value="watch" className={cn(tabTriggerClass, "shrink-0 snap-start min-w-[38%] sm:min-w-0 px-3")}>
          <span className="sm:hidden">Watch</span>
          <span className="hidden sm:inline">How to Watch</span>
        </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="apparel" className="mt-0 space-y-6 focus-visible:outline-none">
        <NhscaHubApparelTab />
        <article className={hubPanelClass}>
          <header className={hubPanelHeaderClass}>
            <h3 className={hubPanelTitleClass}>Team FAQ</h3>
          </header>
          <div className="p-5 md:p-6">
            <NHSCADuals2026TeamHubFaq />
          </div>
        </article>
        {adminBlock}
      </TabsContent>

      <TabsContent value="results" className="mt-0 focus-visible:outline-none">
        <NhscaDualsResultsTab />
      </TabsContent>

      <TabsContent value="payments" className="mt-0 focus-visible:outline-none">
        <NhscaHubPaymentsTab isAdmin={isAdmin} />
      </TabsContent>

      <TabsContent value="media" className="mt-0 focus-visible:outline-none">
        <NhscaHubMediaTab isAdmin={isAdmin} userId={userId} />
      </TabsContent>

      <TabsContent value="rosters" className="mt-0 focus-visible:outline-none space-y-6">
        <NhscaHubGearSprinkle />
        {rosterContent ?? (
          <article className={hubPanelClass}>
            <div className="p-8 text-center text-sm text-white/60">{registrationFallback}</div>
          </article>
        )}
      </TabsContent>

      <TabsContent value="watch" className="mt-0 focus-visible:outline-none">
        <NHSCADuals2026HowToWatch hubTheme embedded />
      </TabsContent>
    </Tabs>
  )
}

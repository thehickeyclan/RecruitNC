"use client"

import type { ReactNode } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NHSCADuals2026HowToWatch } from "@/components/national-team/nhsca-duals-2026-how-to-watch"
import { NHSCADuals2026TeamHubFaq } from "@/components/national-team/nhsca-duals-2026-team-hub-faq"
import { NhscaHubEventInfo } from "@/components/national-team/nhsca-hub-event-info"
import { NhscaResultsClient } from "@/components/national-team/nhsca-results-client"
import { hubPanelClass, hubPanelHeaderClass, hubPanelTitleClass } from "@/components/national-team/nhsca-hub-theme"
import { cn } from "@/lib/utils"

const tabTriggerClass =
  "rounded-lg min-h-[44px] text-sm font-semibold text-white/65 data-[state=active]:bg-[#CBAF5D] data-[state=active]:text-[#002147] data-[state=active]:shadow-sm hover:text-white/90 transition-colors"

export function NhscaHubTabs({
  rosterContent,
  registrationFallback,
  adminBlock,
}: {
  rosterContent: ReactNode | null
  registrationFallback?: ReactNode
  adminBlock?: ReactNode
}) {
  return (
    <Tabs defaultValue="event-info" className="w-full">
      <TabsList
        className={cn(
          "grid w-full h-auto grid-cols-4 gap-1 rounded-xl bg-[#0a2040] p-1.5",
          "border border-white/10 shadow-inner mb-6 md:mb-8"
        )}
      >
        <TabsTrigger value="event-info" className={tabTriggerClass}>
          Event Info
        </TabsTrigger>
        <TabsTrigger value="results" className={tabTriggerClass}>
          Results
        </TabsTrigger>
        <TabsTrigger value="rosters" className={tabTriggerClass}>
          Rosters
        </TabsTrigger>
        <TabsTrigger value="watch" className={tabTriggerClass}>
          Watch
        </TabsTrigger>
      </TabsList>

      <TabsContent value="event-info" className="mt-0 space-y-6 focus-visible:outline-none">
        <NhscaHubEventInfo />
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
        <NhscaResultsClient />
      </TabsContent>

      <TabsContent value="rosters" className="mt-0 focus-visible:outline-none">
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

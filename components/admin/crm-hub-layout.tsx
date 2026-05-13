"use client"

import type { ReactNode } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export function CrmHubLayout({
  overviewSlot,
  familySlot,
  programsSlot,
  timelineSlot,
  className,
}: {
  overviewSlot: ReactNode
  familySlot: ReactNode
  programsSlot: ReactNode
  timelineSlot: ReactNode
  className?: string
}) {
  return (
    <Tabs defaultValue="overview" className={cn("w-full gap-6", className)}>
      <TabsList className="mb-2 grid h-auto w-full grid-cols-2 gap-2 rounded-xl bg-muted/60 p-1.5 sm:grid-cols-4">
        <TabsTrigger
          value="overview"
          className="rounded-lg py-2.5 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm sm:text-sm"
        >
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="family"
          className="rounded-lg py-2.5 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm sm:text-sm"
        >
          Family & orders
        </TabsTrigger>
        <TabsTrigger
          value="programs"
          className="rounded-lg py-2.5 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm sm:text-sm"
        >
          Programs
        </TabsTrigger>
        <TabsTrigger
          value="timeline"
          className="rounded-lg py-2.5 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm sm:text-sm"
        >
          Timeline
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="mt-0 space-y-6 outline-none">
        {overviewSlot}
      </TabsContent>
      <TabsContent value="family" className="mt-0 space-y-6 outline-none">
        {familySlot}
      </TabsContent>
      <TabsContent value="programs" className="mt-0 space-y-6 outline-none">
        {programsSlot}
      </TabsContent>
      <TabsContent value="timeline" className="mt-0 space-y-6 outline-none">
        {timelineSlot}
      </TabsContent>
    </Tabs>
  )
}

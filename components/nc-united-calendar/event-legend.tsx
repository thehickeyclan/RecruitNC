"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { eventCategories } from "@/lib/nc-united-calendar/calendar-config"
import type { EventCategory } from "@/lib/nc-united-calendar/types"
import { cn } from "@/lib/utils"

interface EventLegendProps {
  visibleCategories: Set<EventCategory>
  onCategoryToggle: (category: EventCategory) => void
}

export function EventLegend({ visibleCategories, onCategoryToggle }: EventLegendProps) {
  const categories = visibleCategories || new Set()

  return (
    <Card className="rounded-2xl border border-slate-200/90 shadow-sm lg:sticky lg:top-24 lg:self-start">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-nc-navy-900">Event types</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {Object.entries(eventCategories).map(([key, config]) => {
          const category = key as EventCategory
          const isVisible = categories.has(category)

          return (
            <div key={category} className="flex items-center space-x-3">
              <Checkbox id={category} checked={isVisible} onCheckedChange={() => onCategoryToggle(category)} />
              <label
                htmlFor={category}
                className="flex cursor-pointer items-center gap-2.5 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                <span
                  className={cn("h-2 w-2 shrink-0 rounded-full", config.accentDot)}
                  aria-hidden
                />
                <span className="text-base">{config.icon}</span>
                <span className="text-nc-navy-900">{config.label}</span>
              </label>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

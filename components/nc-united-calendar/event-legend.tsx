"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { eventCategories } from "@/lib/nc-united-calendar/calendar-config"
import type { EventCategory } from "@/lib/nc-united-calendar/types"

interface EventLegendProps {
  visibleCategories: Set<EventCategory>
  onCategoryToggle: (category: EventCategory) => void
}

export function EventLegend({ visibleCategories, onCategoryToggle }: EventLegendProps) {
  // Ensure visibleCategories is always a Set
  const categories = visibleCategories || new Set()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Event Types</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(eventCategories).map(([key, config]) => {
          const category = key as EventCategory
          const isVisible = categories.has(category)

          return (
            <div key={category} className="flex items-center space-x-3">
              <Checkbox id={category} checked={isVisible} onCheckedChange={() => onCategoryToggle(category)} />
              <label
                htmlFor={category}
                className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                <span className="text-base">{config.icon}</span>
                <span>{config.label}</span>
              </label>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

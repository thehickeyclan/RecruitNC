"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar, List } from "lucide-react"
import { CalendarSync } from "@/components/nc-united-calendar/calendar-sync"

interface CalendarHeaderProps {
  currentDate: Date
  onDateChange: (date: Date) => void
  view: "month" | "list"
  onViewChange: (view: "month" | "list") => void
}

export function CalendarHeader({ currentDate, onDateChange, view, onViewChange }: CalendarHeaderProps) {
  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    onDateChange(newDate)
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {/* Navigation and Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Month Navigation */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold text-nc-navy-900 min-w-[200px] text-center">{monthYear}</h2>
          <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              variant={view === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewChange("month")}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Month
            </Button>
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewChange("list")}
              className="flex items-center gap-2"
            >
              <List className="h-4 w-4" />
              List
            </Button>
          </div>
          <CalendarSync />
        </div>
      </div>
    </div>
  )
}

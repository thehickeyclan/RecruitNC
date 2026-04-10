"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar, List } from "lucide-react"
import { CalendarSync } from "@/components/nc-united-calendar/calendar-sync"
import { cn } from "@/lib/utils"

interface CalendarHeaderProps {
  currentDate: Date
  onDateChange: (date: Date) => void
  view: "month" | "list"
  onViewChange: (view: "month" | "list") => void
  /** Shown next to month name — events matching current filters in this month */
  eventsThisMonth?: number
}

export function CalendarHeader({
  currentDate,
  onDateChange,
  view,
  onViewChange,
  eventsThisMonth,
}: CalendarHeaderProps) {
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
    <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-md shadow-slate-200/40 backdrop-blur-md sm:p-6">
      <div className="flex flex-col items-stretch justify-between gap-5 sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <div className="flex w-full max-w-sm items-center justify-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full border-slate-200 text-nc-navy-900 hover:border-nc-navy/30 hover:bg-slate-50"
              onClick={() => navigateMonth("prev")}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1 text-center">
              <h2 className="text-lg font-semibold tracking-tight text-nc-navy-900 sm:text-xl">{monthYear}</h2>
              {eventsThisMonth !== undefined && (
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  {eventsThisMonth === 0
                    ? "No events this month"
                    : `${eventsThisMonth} event${eventsThisMonth === 1 ? "" : "s"} this month`}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full border-slate-200 text-nc-navy-900 hover:border-nc-navy/30 hover:bg-slate-50"
              onClick={() => navigateMonth("next")}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="rounded-full border-nc-navy/20 bg-nc-navy/[0.04] px-4 font-medium text-nc-navy-900 hover:bg-nc-navy/[0.08]"
          >
            Today
          </Button>
          <div className="flex rounded-full border border-slate-200/90 bg-slate-100/80 p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewChange("month")}
              className={cn(
                "gap-2 rounded-full px-4 transition-all",
                view === "month"
                  ? "bg-nc-navy-950 text-white shadow-sm hover:bg-nc-navy-900 hover:text-white"
                  : "text-slate-600 hover:bg-white/90 hover:text-nc-navy-900",
              )}
            >
              <Calendar className="h-4 w-4" />
              Month
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewChange("list")}
              className={cn(
                "gap-2 rounded-full px-4 transition-all",
                view === "list"
                  ? "bg-nc-navy-950 text-white shadow-sm hover:bg-nc-navy-900 hover:text-white"
                  : "text-slate-600 hover:bg-white/90 hover:text-nc-navy-900",
              )}
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

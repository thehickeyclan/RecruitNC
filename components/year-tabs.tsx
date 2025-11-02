"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface YearTabsProps {
  years: string[]
  onYearChange?: (year: string) => void
  defaultYear?: string
}

export function YearTabs({ years, onYearChange, defaultYear = "All Years" }: YearTabsProps) {
  const [activeYear, setActiveYear] = useState(defaultYear)

  const handleYearClick = (year: string) => {
    setActiveYear(year)
    if (onYearChange) {
      onYearChange(year)
    }
  }

  const getYearButtonClass = (year: string) => {
    const isActive = activeYear === year

    if (year === "2025") {
      return isActive
        ? "bg-blue-600 text-white hover:bg-blue-700"
        : "bg-blue-100 text-blue-600 border-blue-300 hover:bg-blue-200"
    }

    if (year === "2026") {
      return isActive
        ? "bg-red-600 text-white hover:bg-red-700"
        : "bg-red-100 text-red-600 border-red-300 hover:bg-red-200"
    }

    // Default for "All Years"
    return isActive
      ? "bg-gray-600 text-white hover:bg-gray-700"
      : "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200"
  }

  return (
    <div className="flex flex-wrap gap-2">
      {years.map((year) => (
        <Button
          key={year}
          variant="outline"
          size="sm"
          onClick={() => handleYearClick(year)}
          className={`transition-all duration-200 ${getYearButtonClass(year)}`}
        >
          {year}
        </Button>
      ))}
    </div>
  )
}

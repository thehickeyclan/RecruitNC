"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

interface RankingsYearSelectorProps {
  availableYears?: number[]
  defaultYear?: number
}

export function RankingsYearSelector({
  availableYears = [2025, 2026, 2027, 2028, 2029],
  defaultYear = 2025,
}: RankingsYearSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Get the year from the URL or use the default
  const yearParam = searchParams.get("year")
  const [selectedYear, setSelectedYear] = useState<number>(yearParam ? Number.parseInt(yearParam) : defaultYear)

  // Update the URL when the year changes
  useEffect(() => {
    const current = new URLSearchParams(Array.from(searchParams.entries()))

    if (selectedYear !== defaultYear) {
      current.set("year", selectedYear.toString())
    } else {
      current.delete("year")
    }

    const search = current.toString()
    const query = search ? `?${search}` : ""

    window.location.href = `${pathname}${query}`
  }, [selectedYear, router, pathname, searchParams, defaultYear])

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <div className="mr-2 flex items-center text-sm font-medium">Class of:</div>
      {availableYears.map((year) => (
        <Button
          key={year}
          variant={selectedYear === year ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedYear(year)}
          className="min-w-[70px]"
        >
          {year}
        </Button>
      ))}
    </div>
  )
}

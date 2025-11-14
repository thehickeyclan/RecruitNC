"use client"

import { useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface SortOption {
  value: string
  label: string
}

export function SortSelect({
  currentSort,
  options,
  label = "Sort by:",
}: {
  currentSort: string
  options: SortOption[]
  label?: string
}) {
  // Add state to track client-side rendering
  const [mounted, setMounted] = useState(false)

  // Use useEffect to mark when component is mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSortChange = (value: string) => {
    try {
      // Update the URL with the new sort parameter
      const url = new URL(window.location.href)
      url.searchParams.set("sort", value)
      window.location.href = url.toString()
    } catch (error) {
      console.error("Error updating sort:", error)
      // Fallback to reload with the new sort parameter
      window.location.href = `${window.location.pathname}?sort=${value}`
    }
  }

  // Don't render anything until client-side hydration is complete
  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{label}</span>
        <div className="w-[180px] h-10 bg-gray-100 rounded-md animate-pulse"></div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">{label}</span>
      <Select value={currentSort} onValueChange={handleSortChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

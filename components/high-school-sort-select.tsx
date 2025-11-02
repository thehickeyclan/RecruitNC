"use client"

import { useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function HighSchoolSortSelect({ currentSort }: { currentSort: string }) {
  // Add state to track client-side rendering
  const [mounted, setMounted] = useState(false)

  // Use useEffect to mark when component is mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSortChange = (value: string) => {
    // Update the URL with the new sort parameter
    const url = new URL(window.location.href)
    url.searchParams.set("sort", value)
    window.location.href = url.toString()
  }

  // Don't render anything until client-side hydration is complete
  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Sort by:</span>
        <div className="w-[180px] h-10 bg-gray-100 rounded-md animate-pulse"></div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Sort by:</span>
      <Select value={currentSort} onValueChange={handleSortChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="commits">Most Commits</SelectItem>
          <SelectItem value="division">Division</SelectItem>
          <SelectItem value="name">Name (A-Z)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

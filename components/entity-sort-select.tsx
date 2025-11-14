"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function EntitySortSelect({
  currentSort,
  options,
}: {
  currentSort: string
  options: { value: string; label: string }[]
}) {
  const handleSortChange = (value: string) => {
    // Update the URL with the new sort parameter
    const url = new URL(window.location.href)
    url.searchParams.set("sort", value)
    window.location.href = url.toString()
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Sort by:</span>
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

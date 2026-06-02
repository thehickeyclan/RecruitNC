"use client"

import { Grid, List } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

interface ViewToggleProps {
  view: "grid" | "table"
  onChange: (view: "grid" | "table") => void
  variant?: "light" | "dark"
}

export function ViewToggle({ view, onChange, variant = "light" }: ViewToggleProps) {
  const isDark = variant === "dark"
  return (
    <ToggleGroup
      type="single"
      value={view}
      onValueChange={(value) => value && onChange(value as "grid" | "table")}
      className={isDark ? "rounded-md border border-white/10 bg-white/5" : undefined}
    >
      <ToggleGroupItem
        value="grid"
        aria-label="Grid view"
        className={
          isDark
            ? "text-white/50 data-[state=on]:bg-[#D3B574] data-[state=on]:text-[#0A1628] hover:text-white hover:bg-white/10"
            : undefined
        }
      >
        <Grid className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="table"
        aria-label="Table view"
        className={
          isDark
            ? "text-white/50 data-[state=on]:bg-[#D3B574] data-[state=on]:text-[#0A1628] hover:text-white hover:bg-white/10"
            : undefined
        }
      >
        <List className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

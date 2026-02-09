"use client"

import { useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CANONICAL_DIVISIONS_FULL, getDivisionDisplayShort } from "@/lib/division-display"

interface DivisionFilterDropdownProps {
  onSelect: (division: string | null) => void
}

export function DivisionFilterDropdown({ onSelect }: DivisionFilterDropdownProps) {
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null)

  const divisions = CANONICAL_DIVISIONS_FULL.map((full) => ({
    id: full,
    label: getDivisionDisplayShort(full),
    value: full,
  }))

  const handleSelect = (division: string | null) => {
    setSelectedDivision(division)
    onSelect(division)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-between">
          {selectedDivision || "Filter by Division"}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px]">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => handleSelect(null)}>
            <span className="flex-1">All Divisions</span>
            {selectedDivision === null && <Check className="ml-2 h-4 w-4" />}
          </DropdownMenuItem>
          {divisions.map((division) => (
            <DropdownMenuItem key={division.id} onClick={() => handleSelect(division.value)}>
              <span className="flex-1">{division.label}</span>
              {selectedDivision === division.value && <Check className="ml-2 h-4 w-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

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

interface DivisionFilterDropdownProps {
  onSelect: (division: string | null) => void
}

export function DivisionFilterDropdown({ onSelect }: DivisionFilterDropdownProps) {
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null)

  const divisions = [
    { id: "ncaa-d1", label: "NCAA DI", value: "NCAA DI" },
    { id: "ncaa-d2", label: "NCAA DII", value: "NCAA DII" },
    { id: "ncaa-d3", label: "NCAA DIII", value: "NCAA DIII" },
    { id: "naia", label: "NAIA", value: "NAIA" },
    { id: "njcaa", label: "NJCAA", value: "NJCAA" },
  ]

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

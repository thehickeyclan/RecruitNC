"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"

const DIVISIONS = [
  { id: "NCAA Division I", label: "NCAA Division I" },
  { id: "NCAA Division II", label: "NCAA Division II" },
  { id: "NCAA Division III", label: "NCAA Division III" },
  { id: "NAIA", label: "NAIA" },
  { id: "NJCAA", label: "NJCAA" },
]

interface DivisionFilterProps {
  onFilterChange: (divisions: string[]) => void
}

export function DivisionFilter({ onFilterChange }: DivisionFilterProps) {
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([])

  const handleDivisionToggle = (divisionId: string, checked: boolean) => {
    let newSelected: string[]

    if (checked) {
      newSelected = [...selectedDivisions, divisionId]
    } else {
      newSelected = selectedDivisions.filter((id) => id !== divisionId)
    }

    console.log("Division filter changed:", newSelected)
    setSelectedDivisions(newSelected)
    onFilterChange(newSelected)
  }

  const clearFilters = () => {
    setSelectedDivisions([])
    onFilterChange([])
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Filter by Division</h3>
        <div className="space-y-2">
          {DIVISIONS.map((division) => (
            <div key={division.id} className="flex items-center space-x-2">
              <Checkbox
                id={`division-${division.id}`}
                checked={selectedDivisions.includes(division.id)}
                onCheckedChange={(checked) => handleDivisionToggle(division.id, checked as boolean)}
              />
              <Label htmlFor={`division-${division.id}`} className="text-sm cursor-pointer">
                {division.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {selectedDivisions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedDivisions.map((divisionId) => {
            const division = DIVISIONS.find((d) => d.id === divisionId)
            return (
              <div
                key={divisionId}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {division?.label}
                <button
                  onClick={() => handleDivisionToggle(divisionId, false)}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          })}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
            Clear All
          </Button>
        </div>
      )}
    </div>
  )
}

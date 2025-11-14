"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"

const GENDERS = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
]

interface GenderFilterProps {
  onFilterChange: (genders: string[]) => void
}

export function GenderFilter({ onFilterChange }: GenderFilterProps) {
  const [selectedGenders, setSelectedGenders] = useState<string[]>([])

  const handleGenderToggle = (genderId: string, checked: boolean) => {
    let newSelected: string[]

    if (checked) {
      newSelected = [...selectedGenders, genderId]
    } else {
      newSelected = selectedGenders.filter((id) => id !== genderId)
    }

    setSelectedGenders(newSelected)
    onFilterChange(newSelected)
  }

  const clearFilters = () => {
    setSelectedGenders([])
    onFilterChange([])
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Filter by Gender</h3>
        <div className="flex gap-4">
          {GENDERS.map((gender) => (
            <div key={gender.id} className="flex items-center space-x-2">
              <Checkbox
                id={`gender-${gender.id}`}
                checked={selectedGenders.includes(gender.id)}
                onCheckedChange={(checked) => handleGenderToggle(gender.id, checked as boolean)}
              />
              <Label htmlFor={`gender-${gender.id}`} className="text-sm cursor-pointer">
                {gender.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {selectedGenders.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedGenders.map((genderId) => {
            const gender = GENDERS.find((g) => g.id === genderId)
            return (
              <div
                key={genderId}
                className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
              >
                {gender?.label}
                <button
                  onClick={() => handleGenderToggle(genderId, false)}
                  className="hover:bg-purple-200 rounded-full p-0.5"
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

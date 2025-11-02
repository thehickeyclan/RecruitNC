"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Filter, X, Search } from "lucide-react"

interface AdvancedFilters {
  graduationYear?: string
  gender?: string
  weightClassRange?: [number, number]
  gpaRange?: [number, number]
  satRange?: [number, number]
  actRange?: [number, number]
  rankingRange?: [number, number]
  recruitingStatus?: string
  state?: string
  achievements?: string[]
  searchTerm?: string
}

interface AdvancedProspectFiltersProps {
  onFiltersChange: (filters: AdvancedFilters) => void
  availableYears: number[]
  availableStates: string[]
  availableAchievements: string[]
}

export function AdvancedProspectFilters({
  onFiltersChange,
  availableYears,
  availableStates,
  availableAchievements,
}: AdvancedProspectFiltersProps) {
  const [filters, setFilters] = useState<AdvancedFilters>({})
  const [isExpanded, setIsExpanded] = useState(false)

  const updateFilter = (key: keyof AdvancedFilters, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const clearFilters = () => {
    setFilters({})
    onFiltersChange({})
  }

  const hasActiveFilters = Object.keys(filters).some((key) => {
    const value = filters[key as keyof AdvancedFilters]
    return value !== undefined && value !== "" && (Array.isArray(value) ? value.length > 0 : true)
  })

  const getActiveFilterCount = () => {
    return Object.keys(filters).filter((key) => {
      const value = filters[key as keyof AdvancedFilters]
      return value !== undefined && value !== "" && (Array.isArray(value) ? value.length > 0 : true)
    }).length
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFilterCount()}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? "Collapse" : "Expand"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Filters - Always Visible */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Name, school, club..."
                value={filters.searchTerm || ""}
                onChange={(e) => updateFilter("searchTerm", e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Graduation Year</Label>
            <Select
              value={filters.graduationYear || "allYears"}
              onValueChange={(value) => updateFilter("graduationYear", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="allYears">All Years</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    Class of {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Gender</Label>
            <Select value={filters.gender || "allGenders"} onValueChange={(value) => updateFilter("gender", value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Genders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="allGenders">All Genders</SelectItem>
                <SelectItem value="male">Men's Wrestling</SelectItem>
                <SelectItem value="female">Women's Wrestling</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced Filters - Expandable */}
        {isExpanded && (
          <div className="space-y-6 pt-4 border-t">
            {/* Academic Filters */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Academic Criteria</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>GPA Range</Label>
                  <div className="px-2">
                    <Slider
                      value={filters.gpaRange || [0, 4.0]}
                      onValueChange={(value) => updateFilter("gpaRange", value)}
                      max={4.0}
                      min={0}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{filters.gpaRange?.[0]?.toFixed(1) || "0.0"}</span>
                      <span>{filters.gpaRange?.[1]?.toFixed(1) || "4.0"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>SAT Range</Label>
                  <div className="px-2">
                    <Slider
                      value={filters.satRange || [400, 1600]}
                      onValueChange={(value) => updateFilter("satRange", value)}
                      max={1600}
                      min={400}
                      step={10}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{filters.satRange?.[0] || 400}</span>
                      <span>{filters.satRange?.[1] || 1600}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>ACT Range</Label>
                  <div className="px-2">
                    <Slider
                      value={filters.actRange || [1, 36]}
                      onValueChange={(value) => updateFilter("actRange", value)}
                      max={36}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{filters.actRange?.[0] || 1}</span>
                      <span>{filters.actRange?.[1] || 36}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Athletic Filters */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Athletic Criteria</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Weight Class Range (lbs)</Label>
                  <div className="px-2">
                    <Slider
                      value={filters.weightClassRange || [106, 285]}
                      onValueChange={(value) => updateFilter("weightClassRange", value)}
                      max={285}
                      min={106}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{filters.weightClassRange?.[0] || 106}</span>
                      <span>{filters.weightClassRange?.[1] || 285}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Ranking Range</Label>
                  <div className="px-2">
                    <Slider
                      value={filters.rankingRange || [1, 100]}
                      onValueChange={(value) => updateFilter("rankingRange", value)}
                      max={100}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>#{filters.rankingRange?.[0] || 1}</span>
                      <span>#{filters.rankingRange?.[1] || 100}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Recruiting Status</Label>
                <Select
                  value={filters.recruitingStatus || "allStatuses"}
                  onValueChange={(value) => updateFilter("recruitingStatus", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="allStatuses">All Statuses</SelectItem>
                    <SelectItem value="Uncommitted">Uncommitted</SelectItem>
                    <SelectItem value="Committed">Committed</SelectItem>
                    <SelectItem value="College Athlete">College Athlete</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>State</Label>
                <Select value={filters.state || "allStates"} onValueChange={(value) => updateFilter("state", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="allStates">All States</SelectItem>
                    {availableStates.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="pt-4 border-t">
            <div className="flex flex-wrap gap-2">
              {Object.entries(filters).map(([key, value]) => {
                if (!value || (Array.isArray(value) && value.length === 0)) return null

                let displayValue = ""
                switch (key) {
                  case "graduationYear":
                    displayValue = value === "allYears" ? "All Years" : `Class of ${value}`
                    break
                  case "gender":
                    displayValue =
                      value === "allGenders"
                        ? "All Genders"
                        : value === "male"
                          ? "Men's Wrestling"
                          : "Women's Wrestling"
                    break
                  case "gpaRange":
                    displayValue = `GPA: ${(value as number[])[0]?.toFixed(1)}-${(value as number[])[1]?.toFixed(1)}`
                    break
                  case "satRange":
                    displayValue = `SAT: ${(value as number[])[0]}-${(value as number[])[1]}`
                    break
                  case "actRange":
                    displayValue = `ACT: ${(value as number[])[0]}-${(value as number[])[1]}`
                    break
                  case "weightClassRange":
                    displayValue = `Weight: ${(value as number[])[0]}-${(value as number[])[1]} lbs`
                    break
                  case "rankingRange":
                    displayValue = `Rank: #${(value as number[])[0]}-#${(value as number[])[1]}`
                    break
                  case "searchTerm":
                    displayValue = `Search: "${value}"`
                    break
                  default:
                    displayValue = String(value)
                }

                return (
                  <Badge key={key} variant="secondary" className="gap-1">
                    {displayValue}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => updateFilter(key as keyof AdvancedFilters, undefined)}
                    />
                  </Badge>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

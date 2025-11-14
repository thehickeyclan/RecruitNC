"use client"

import { useState } from "react"
import { Search, Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SearchAndFilterProps {
  years: number[]
  divisions: string[]
  searchTerm: string
  selectedYear: string
  selectedGender: string
  selectedDivision: string
  onSearchChange: (value: string) => void
  onYearChange: (value: string) => void
  onGenderChange: (value: string) => void
  onDivisionChange: (value: string) => void
  totalResults: number
}

export function SearchAndFilter({
  years,
  divisions,
  searchTerm,
  selectedYear,
  selectedGender,
  selectedDivision,
  onSearchChange,
  onYearChange,
  onGenderChange,
  onDivisionChange,
  totalResults,
}: SearchAndFilterProps) {
  const [showFilters, setShowFilters] = useState(false)

  const clearAllFilters = () => {
    onSearchChange("")
    onYearChange("all")
    onGenderChange("all")
    onDivisionChange("all")
  }

  const hasActiveFilters =
    searchTerm ||
    (selectedYear && selectedYear !== "all") ||
    (selectedGender && selectedGender !== "all") ||
    (selectedDivision && selectedDivision !== "all")

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        {/* Real-time Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search athletes, colleges, high schools..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {totalResults} athlete{totalResults !== 1 ? "s" : ""} found
          </span>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 ml-1">Active</span>
            )}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mt-6 pt-6 border-t">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Year Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Graduation Year</label>
              <Select value={selectedYear} onValueChange={onYearChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Gender Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <Select value={selectedGender} onValueChange={onGenderChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Genders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Division Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Division</label>
              <Select value={selectedDivision} onValueChange={onDivisionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {divisions.map((division) => (
                    <SelectItem key={division} value={division}>
                      {division}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={clearAllFilters} className="text-sm">
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

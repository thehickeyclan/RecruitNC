"use client"

import { Search, X, SlidersHorizontal, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

interface AthleteFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  recruitingStatusFilter: string
  onRecruitingStatusChange: (value: string) => void
  yearFilter: string
  onYearChange: (value: string) => void
  uniqueRecruitingStatuses: string[]
  uniqueYears: number[]
  totalCount: number
  filteredCount: number
}

export function AthleteFilters({
  searchTerm,
  onSearchChange,
  recruitingStatusFilter,
  onRecruitingStatusChange,
  yearFilter,
  onYearChange,
  uniqueRecruitingStatuses,
  uniqueYears,
  totalCount,
  filteredCount,
}: AthleteFiltersProps) {
  const hasActiveFilters = searchTerm || recruitingStatusFilter !== "all" || yearFilter !== "all"
  
  const clearFilters = () => {
    onSearchChange("")
    onRecruitingStatusChange("all")
    onYearChange("all")
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
        <Input
          placeholder="Search athletes by name, school, or college..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-12 border-white/10 bg-[#0B2545]/50 pl-12 pr-12 text-base text-white placeholder:text-white/40 focus:border-[#C8A94A] focus:ring-[#C8A94A]/20"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 text-white/40 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={`h-10 gap-2 border-white/10 bg-[#0B2545]/50 text-sm hover:border-white/20 hover:bg-[#0B2545] ${
                recruitingStatusFilter !== "all" 
                  ? "border-[#C8A94A]/50 text-[#C8A94A]" 
                  : "text-white/70"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {recruitingStatusFilter === "all" ? "Status" : recruitingStatusFilter}
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 border-white/10 bg-[#061224]">
            <DropdownMenuLabel className="text-white/50">Recruiting Status</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuRadioGroup value={recruitingStatusFilter} onValueChange={onRecruitingStatusChange}>
              <DropdownMenuRadioItem value="all" className="text-white focus:bg-white/10 focus:text-white">
                All Statuses
              </DropdownMenuRadioItem>
              {uniqueRecruitingStatuses.map((status) => (
                <DropdownMenuRadioItem 
                  key={status} 
                  value={status}
                  className="text-white focus:bg-white/10 focus:text-white"
                >
                  {status}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Year filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={`h-10 gap-2 border-white/10 bg-[#0B2545]/50 text-sm hover:border-white/20 hover:bg-[#0B2545] ${
                yearFilter !== "all" 
                  ? "border-[#C8A94A]/50 text-[#C8A94A]" 
                  : "text-white/70"
              }`}
            >
              {yearFilter === "all" ? "Grad Year" : `Class of ${yearFilter}`}
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48 border-white/10 bg-[#061224]">
            <DropdownMenuLabel className="text-white/50">Graduation Year</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuRadioGroup value={yearFilter} onValueChange={onYearChange}>
              <DropdownMenuRadioItem value="all" className="text-white focus:bg-white/10 focus:text-white">
                All Years
              </DropdownMenuRadioItem>
              {uniqueYears.map((year) => (
                <DropdownMenuRadioItem 
                  key={year} 
                  value={year.toString()}
                  className="text-white focus:bg-white/10 focus:text-white"
                >
                  {year}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-10 gap-1.5 text-sm text-white/50 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
            Clear filters
          </Button>
        )}

        {/* Results count */}
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="border-white/10 bg-white/5 text-sm text-white/60">
            {filteredCount} of {totalCount} athletes
          </Badge>
        </div>
      </div>
    </div>
  )
}

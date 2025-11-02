"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface RankingsFiltersProps {
  onFiltersChange: (filters: {
    graduationYear: string
    gender: string
    search: string
  }) => void
}

export function RankingsFilters({ onFiltersChange }: RankingsFiltersProps) {
  const [graduationYear, setGraduationYear] = useState("2026")
  const [gender, setGender] = useState("Male")
  const [search, setSearch] = useState("")

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = {
      graduationYear: key === "graduationYear" ? value : graduationYear,
      gender: key === "gender" ? value : gender,
      search: key === "search" ? value : search,
    }

    if (key === "graduationYear") setGraduationYear(value)
    if (key === "gender") setGender(value)
    if (key === "search") setSearch(value)

    onFiltersChange(newFilters)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="min-w-[140px]">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Class</label>
            <Select value={graduationYear} onValueChange={(value) => handleFilterChange("graduationYear", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">Class of 2025</SelectItem>
                <SelectItem value="2026">Class of 2026</SelectItem>
                <SelectItem value="2027">Class of 2027</SelectItem>
                <SelectItem value="2028">Class of 2028</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[120px]">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Gender</label>
            <Select value={gender} onValueChange={(value) => handleFilterChange("gender", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by name, school, or club..."
                value={search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

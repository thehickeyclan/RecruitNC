"use client"

import { useState, useEffect } from "react"
import { ChevronDown } from "lucide-react"

interface HighSchool {
  name: string
  logo_url?: string
  division?: string
  aliases?: string[]
}

interface HighSchoolDropdownProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function HighSchoolDropdown({
  value,
  onChange,
  placeholder = "Select high school...",
  className = "",
}: HighSchoolDropdownProps) {
  const [schools, setSchools] = useState<HighSchool[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await fetch("/api/admin/high-schools-from-logos")
        if (response.ok) {
          const data = await response.json()
          setSchools(data.schools || [])
        } else {
          console.error("Failed to fetch high schools from logo mappings")
        }
      } catch (error) {
        console.error("Error fetching high schools:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSchools()
  }, [])

  const filteredSchools = schools.filter((school) => {
    const searchLower = searchTerm.toLowerCase()
    const nameMatch = school.name.toLowerCase().includes(searchLower)
    const aliasMatch = school.aliases?.some((alias) => alias.toLowerCase().includes(searchLower)) || false
    return nameMatch || aliasMatch
  })

  const handleSchoolSelect = (schoolName: string) => {
    onChange(schoolName)
    setIsOpen(false)
    setSearchTerm("")
  }

  if (loading) {
    return <div className={`border rounded-md px-3 py-2 ${className}`}>Loading high schools...</div>
  }

  return (
    <div className={`relative ${className}`}>
      <div
        className="border rounded-md px-3 py-2 cursor-pointer flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? "text-black" : "text-gray-500"}>{value || placeholder}</span>
        <ChevronDown className="w-4 h-4" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2">
            <input
              type="text"
              placeholder="Search high schools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 border rounded text-sm"
              autoFocus
            />
          </div>

          {filteredSchools.map((school) => (
            <div
              key={school.name}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSchoolSelect(school.name)}
            >
              {school.logo_url && (
                <img
                  src={school.logo_url || "/placeholder.svg"}
                  alt={`${school.name} logo`}
                  className="w-6 h-6 object-contain"
                />
              )}
              <div className="flex-1">
                <span>{school.name}</span>
                {school.division && <span className="ml-2 text-xs text-gray-500">({school.division})</span>}
              </div>
            </div>
          ))}

          {filteredSchools.length === 0 && <div className="px-3 py-2 text-gray-500 text-sm">No high schools found</div>}
        </div>
      )}
    </div>
  )
}

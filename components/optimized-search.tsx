"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { useDebounce } from "@/lib/performance-utils"

interface OptimizedSearchProps {
  onSearch: (query: string) => void
  placeholder?: string
  className?: string
}

export function OptimizedSearch({
  onSearch,
  placeholder = "Search athletes...",
  className = "",
}: OptimizedSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")

  // Debounce search to avoid too many API calls
  const debouncedSearch = useDebounce((query: string) => {
    onSearch(query)
  }, 300)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    debouncedSearch(value)
  }

  return (
    <Input
      type="text"
      placeholder={placeholder}
      value={searchTerm}
      onChange={handleInputChange}
      className={className}
    />
  )
}

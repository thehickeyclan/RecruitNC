"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"

interface DivisionPillProps {
  division: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function DivisionPillV2({ division, size = "md", className = "" }: DivisionPillProps) {
  const [color, setColor] = useState<string>("bg-gray-100 text-gray-800")

  useEffect(() => {
    // Determine color based on division
    switch (division) {
      case "Division I":
        setColor("bg-blue-100 text-blue-800 border-blue-200")
        break
      case "Division II":
        setColor("bg-red-100 text-red-800 border-red-200")
        break
      case "Division III":
        setColor("bg-green-100 text-green-800 border-green-200")
        break
      case "NAIA":
        setColor("bg-purple-100 text-purple-800 border-purple-200")
        break
      case "NJCAA":
        setColor("bg-amber-100 text-amber-800 border-amber-200")
        break
      default:
        setColor("bg-gray-100 text-gray-800 border-gray-200")
    }
  }, [division])

  // Determine size classes
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-0.5",
    lg: "text-base px-3 py-1",
  }

  return (
    <Badge variant="outline" className={`font-medium rounded-full ${color} ${sizeClasses[size]} ${className}`}>
      {division}
    </Badge>
  )
}

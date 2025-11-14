"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface SimpleEntityLogoProps {
  name: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function SimpleEntityLogo({ name, size = "md", className = "" }: SimpleEntityLogoProps) {
  // Determine size classes
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  }

  // Use a simple letter fallback
  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      <AvatarFallback>{name ? name.charAt(0).toUpperCase() : "?"}</AvatarFallback>
    </Avatar>
  )
}

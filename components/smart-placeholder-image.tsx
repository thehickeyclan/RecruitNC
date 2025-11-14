"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { getPlaceholderUrl } from "@/lib/placeholder-system"

interface SmartPlaceholderImageProps {
  placeholderKey: string
  alt: string
  width: number
  height: number
  className?: string
}

export function SmartPlaceholderImage({
  placeholderKey,
  alt,
  width,
  height,
  className = "",
}: SmartPlaceholderImageProps) {
  const [imageUrl, setImageUrl] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPlaceholder() {
      try {
        const url = await getPlaceholderUrl(placeholderKey)
        setImageUrl(url)
      } catch (error) {
        console.error("Error loading placeholder:", error)
        setImageUrl("/placeholder.svg")
      } finally {
        setLoading(false)
      }
    }

    loadPlaceholder()
  }, [placeholderKey])

  if (loading) {
    return <div className={`bg-gray-200 animate-pulse ${className}`} style={{ width, height }} />
  }

  return (
    <Image
      src={imageUrl || "/placeholder.svg"}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={(e) => {
        const target = e.target as HTMLImageElement
        target.src = "/placeholder.svg"
      }}
    />
  )
}

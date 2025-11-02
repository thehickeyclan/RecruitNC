"use client"

import Image from "next/image"
import { useState } from "react"

interface AthleteImageProps {
  src?: string | null
  alt: string
  className?: string
  width?: number
  height?: number
  photoUrl?: string | null
  name?: string
  size?: "sm" | "md" | "lg"
}

export function AthleteImage({ src, alt, className, width, height, photoUrl, name, size = "md" }: AthleteImageProps) {
  const [error, setError] = useState(false)
  const fallbackSrc = "/wrestler-silhouette.png"

  // Use photoUrl if provided, otherwise use src
  const imageSrc = photoUrl || src

  // Handle empty strings and null values
  const finalSrc = imageSrc && imageSrc.trim() !== "" ? imageSrc : fallbackSrc

  const handleError = () => {
    setError(true)
  }

  // Size mappings
  const sizeMap = {
    sm: { width: 40, height: 40 },
    md: { width: 300, height: 300 },
    lg: { width: 400, height: 400 },
  }

  const dimensions = sizeMap[size] || sizeMap.md
  const finalWidth = width || dimensions.width
  const finalHeight = height || dimensions.height

  return (
    <Image
      src={error ? fallbackSrc : finalSrc}
      alt={alt || name || "Athlete"}
      width={finalWidth}
      height={finalHeight}
      className={className}
      onError={handleError}
    />
  )
}

// Export as both named and default export
export default AthleteImage

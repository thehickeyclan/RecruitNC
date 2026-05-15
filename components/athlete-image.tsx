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
  fill?: boolean
}

export function AthleteImage({ src, alt, className, width, height, photoUrl, name, size = "md", fill = false }: AthleteImageProps) {
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

  if (fill) {
    return (
      <Image
        src={error ? fallbackSrc : finalSrc}
        alt={alt || name || "Athlete"}
        fill
        className={className}
        onError={handleError}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
      />
    )
  }

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

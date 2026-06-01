"use client"

import Image from "next/image"
import { useState } from "react"

type NewsImageSlotProps = {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  priority?: boolean
  fill?: boolean
  sizes?: string
  label?: string
}

export function NewsImageSlot({
  src,
  alt,
  width,
  height,
  className = "object-cover",
  priority = false,
  fill = false,
  sizes,
  label,
}: NewsImageSlotProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center border-2 border-[#D3B574] bg-[#13294B] text-center ${fill ? "absolute inset-0" : ""}`}
        style={fill ? undefined : { width, height, minHeight: height }}
        role="img"
        aria-label={alt}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-[#D3B574]">Image slot</span>
        {label ? <span className="mt-2 px-4 text-sm text-white/80">{label}</span> : null}
      </div>
    )
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        sizes={sizes ?? "100vw"}
        priority={priority}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={`h-auto w-full ${className}`}
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
    />
  )
}

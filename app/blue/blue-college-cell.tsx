"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

type Props = {
  collegeName: string
}

/** Fetches college logo from logo-mappings API (same source as commitment cards) and shows it next to name. */
export function BlueCollegeCell({ collegeName }: Props) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!collegeName?.trim()) return
    let cancelled = false
    fetch(`/api/logo-mappings/by-entity/college/${encodeURIComponent(collegeName.trim())}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.success || !data?.logo_url) return
        setLogoUrl(data.logo_url)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [collegeName])

  return (
    <span className="inline-flex items-center gap-2">
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt=""
          width={24}
          height={24}
          className="h-6 w-6 rounded object-contain flex-shrink-0"
          unoptimized
        />
      ) : null}
      <span>{collegeName || "—"}</span>
    </span>
  )
}

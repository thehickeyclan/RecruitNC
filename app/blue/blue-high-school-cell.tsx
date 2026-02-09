"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

type Props = {
  schoolName: string
}

/** Fetches high school logo from logo-mappings API and shows it next to name. */
export function BlueHighSchoolCell({ schoolName }: Props) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!schoolName?.trim()) return
    let cancelled = false
    fetch(`/api/logo-mappings/by-entity/highschool/${encodeURIComponent(schoolName.trim())}`, {
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
  }, [schoolName])

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
      <span>{schoolName || "—"}</span>
    </span>
  )
}

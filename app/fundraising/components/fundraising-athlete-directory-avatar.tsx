"use client"

import { useCallback, useEffect, useState } from "react"

const PLACEHOLDER = "/wrestler-silhouette.png"

type Props = {
  photoUrl: string | null | undefined
  /** Tailwind size classes, e.g. h-16 w-16 */
  boxClassName?: string
}

export function FundraisingAthleteDirectoryAvatar({ photoUrl, boxClassName }: Props) {
  const resolved =
    typeof photoUrl === "string" && photoUrl.trim() ? photoUrl.trim() : PLACEHOLDER
  const [src, setSrc] = useState(resolved)

  useEffect(() => {
    setSrc(resolved)
  }, [resolved])

  const onError = useCallback(() => {
    setSrc((cur) => (cur === PLACEHOLDER ? cur : PLACEHOLDER))
  }, [])

  const box = boxClassName ?? "h-16 w-16"

  return (
    <div
      className={`${box} shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#061224]/80 shadow-inner ring-1 ring-white/5`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover object-top"
        loading="lazy"
        decoding="async"
        onError={onError}
      />
    </div>
  )
}

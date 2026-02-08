"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronDown, ChevronUp } from "lucide-react"

const GOLD = "#D3B574"

type Props = {
  imageSrc: string
  imageAlt: string
  name: string
  shortBio: string
  longBio: string
}

export function CoachCard({ imageSrc, imageAlt, name, shortBio, longBio }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <Card className="border-2 border-[#D3B574]/40 overflow-hidden">
      <div className="aspect-[3/4] relative bg-[#03154C]/5">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover"
          unoptimized
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
      <CardContent className="p-5">
        <h3 className="text-lg font-bold text-[#03154C] mb-2">{name}</h3>
        <p className="text-sm text-[#03154C]/90 leading-relaxed mb-1">{shortBio}</p>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 text-sm font-medium mt-2 text-[#D3B574] hover:underline cursor-pointer"
          style={{ color: GOLD }}
        >
          {open ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Read less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Read more
            </>
          )}
        </button>
        {open && (
          <p
            className="text-sm text-[#03154C]/90 leading-relaxed mt-2 pt-2 border-t border-[#D3B574]/30"
            style={{ borderColor: `${GOLD}30` }}
          >
            {longBio}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

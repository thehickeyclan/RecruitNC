"use client"

import { useMemo, useState } from "react"
import { Clapperboard, Camera, Mic2 } from "lucide-react"
import type { CommandCenterScope } from "@/lib/nhsca-duals-command-center"
import {
  athleteMediaCategoryLabel,
  athleteMediaForScope,
  type NhscaDualsAthleteMediaCategory,
  type NhscaDualsAthleteMediaItem,
} from "@/lib/nhsca-duals-2026-athlete-media"
import { galleryPhotosForScope } from "@/lib/nhsca-duals-2026-tournament-gallery"
import type { NhscaDualsResultsSnapshot } from "@/lib/nhsca-duals-live-results/types"
import { NhscaDualsCollapsibleSection } from "@/components/national-team/nhsca-duals-collapsible-section"
import { NhscaDualsTournamentGalleryGrid } from "@/components/national-team/nhsca-duals-2026-tournament-gallery"
import { NhscaDualsTournamentMomentMedia } from "@/components/national-team/nhsca-duals-tournament-moment-media"
import { cn } from "@/lib/utils"

const INITIAL_VISIBLE = 12

const CATEGORY_ORDER: NhscaDualsAthleteMediaCategory[] = ["interview", "highlight", "photo"]

function categoryHeading(category: NhscaDualsAthleteMediaCategory): string {
  if (category === "interview") return "Interviews"
  if (category === "highlight") return "Highlight reels"
  return "Photos"
}

function categoryMoreLabel(category: NhscaDualsAthleteMediaCategory): string {
  if (category === "interview") return "interviews"
  if (category === "highlight") return "highlights"
  return "photos"
}

function teamLabel(team: NhscaDualsAthleteMediaItem["team"]): string | null {
  if (team === "national") return "National"
  if (team === "select") return "Select"
  return null
}

function AthleteMediaCard({ item }: { item: NhscaDualsAthleteMediaItem }) {
  const team = teamLabel(item.team)

  return (
    <figure className="rounded-xl border border-white/10 bg-[#002147]/45 overflow-hidden">
      <NhscaDualsTournamentMomentMedia moment={item} />
      <figcaption className="px-3 py-3 border-t border-white/10 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-[#CBAF5D]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#CBAF5D]">
            {athleteMediaCategoryLabel(item.category)}
          </span>
          {team ? (
            <span className="rounded-md bg-white/8 px-2 py-0.5 text-[10px] font-semibold text-white/60">
              {team}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-white/80 leading-snug">{item.caption}</p>
      </figcaption>
    </figure>
  )
}

function MediaGroup({
  category,
  items,
}: {
  category: NhscaDualsAthleteMediaCategory
  items: NhscaDualsAthleteMediaItem[]
}) {
  const [visible, setVisible] = useState(INITIAL_VISIBLE)

  if (items.length === 0) return null

  const shown = items.slice(0, visible)
  const hasMore = items.length > visible

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {category === "interview" ? (
          <Mic2 className="h-4 w-4 text-[#CBAF5D] shrink-0" aria-hidden />
        ) : category === "highlight" ? (
          <Clapperboard className="h-4 w-4 text-[#CBAF5D] shrink-0" aria-hidden />
        ) : (
          <Camera className="h-4 w-4 text-[#CBAF5D] shrink-0" aria-hidden />
        )}
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#CBAF5D]">
          {categoryHeading(category)}
          <span className="ml-2 text-white/45 tabular-nums">({items.length})</span>
        </h3>
      </div>
      {items.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((item) => (
              <AthleteMediaCard key={item.id} item={item} />
            ))}
          </div>
          {hasMore ? (
            <button
              type="button"
              onClick={() => setVisible((n) => n + INITIAL_VISIBLE)}
              className={cn(
                "w-full min-h-[44px] rounded-xl border border-white/15 bg-white/5 px-4 py-2.5",
                "text-sm font-semibold text-[#CBAF5D] hover:bg-white/10 transition-colors"
              )}
            >
              Show more {categoryMoreLabel(category)} ({items.length - visible} remaining)
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function TeamGallerySection({
  scope,
  snapshot,
}: {
  scope: CommandCenterScope
  snapshot?: NhscaDualsResultsSnapshot | null
}) {
  const galleryCount = galleryPhotosForScope(scope).length
  if (galleryCount === 0) return null

  return (
    <div id="team-gallery" className="scroll-mt-24 space-y-4">
      <div className="flex items-center gap-2">
        <Camera className="h-4 w-4 text-[#CBAF5D] shrink-0" aria-hidden />
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#CBAF5D]">
          Team gallery
          <span className="ml-2 text-white/45 tabular-nums">({galleryCount})</span>
        </h3>
      </div>
      <p className="text-xs text-white/55 -mt-2">NC United wrestlers at Virginia Beach Sports Center</p>
      <NhscaDualsTournamentGalleryGrid scope={scope} snapshot={snapshot} hideHeading />
    </div>
  )
}

export function NhscaDuals2026AthleteMediaSection({
  scope,
  snapshot,
}: {
  scope: CommandCenterScope
  snapshot?: NhscaDualsResultsSnapshot | null
}) {
  const items = useMemo(() => athleteMediaForScope(scope), [scope])
  const galleryCount = galleryPhotosForScope(scope).length
  const totalCount = items.length + galleryCount

  const grouped = useMemo(() => {
    const map: Record<NhscaDualsAthleteMediaCategory, NhscaDualsAthleteMediaItem[]> = {
      interview: [],
      highlight: [],
      photo: [],
    }
    for (const item of items) {
      map[item.category].push(item)
    }
    return map
  }, [items])

  if (totalCount === 0) return null

  return (
    <NhscaDualsCollapsibleSection
      id="media"
      title="Media"
      subtitle="Interviews, highlight reels, portraits, and team gallery photos from Virginia Beach."
      count={totalCount}
      defaultOpen={totalCount <= 6}
      icon={<Clapperboard className="h-5 w-5" aria-hidden />}
      className="mb-10 sm:mb-14 border-[#CBAF5D]/20"
    >
      <div className="space-y-8">
        {CATEGORY_ORDER.map((category) => (
          <MediaGroup key={category} category={category} items={grouped[category]} />
        ))}
        <TeamGallerySection scope={scope} snapshot={snapshot} />
      </div>
    </NhscaDualsCollapsibleSection>
  )
}

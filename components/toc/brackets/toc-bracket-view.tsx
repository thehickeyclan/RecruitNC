"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { HardLink } from "@/components/hard-link"
import { BracketTree } from "@/components/bracket/bracket-tree"
import { TocPatrioticBar, tocDisplayClass, tocMobileCtaClass } from "@/components/toc/toc-theme"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import { isPlaceholderParticipant } from "@/lib/toc/eight-man-de-bracket"
import type { TocBracketDraw } from "@/lib/toc/bracket-types"
import { tocDrawToConsolationBracketTree, tocDrawToWinnersBracketTree } from "@/lib/toc/to-bracket-display"
import { cn } from "@/lib/utils"
import { Share2 } from "lucide-react"

type Props = {
  draw: TocBracketDraw
  allWeights?: number[]
  source?: "locked" | "live" | "personal"
  workspace?: "official" | "personal"
  onDrawUpdated?: () => Promise<void> | void
}

function AthleteAvatar({ name, photoUrl, seed }: { name: string; photoUrl: string | null; seed: number }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0">
      <div className="absolute -top-1 -left-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[#CC0000] text-[10px] font-bold text-white shadow">
        {seed}
      </div>
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={name}
          width={64}
          height={64}
          className="h-14 w-14 sm:h-16 sm:w-16 rounded-sm object-cover border-2 border-white/20"
        />
      ) : (
        <div
          className={cn(
            "flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-sm border-2 border-white/15 bg-[#0B1D3A] text-sm font-bold text-white/80",
            tocDisplayClass(),
          )}
        >
          {initials}
        </div>
      )}
    </div>
  )
}

export function TocBracketView({ draw, allWeights = [...TOC_WEIGHT_CLASSES], source = "live", workspace = "official", onDrawUpdated }: Props) {
  const [highlightedAthleteId, setHighlightedAthleteId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)
  const winnersTree = useMemo(() => tocDrawToWinnersBracketTree(draw), [draw])
  const consolationTree = useMemo(() => tocDrawToConsolationBracketTree(draw), [draw])

  const copyLink = async () => {
    const url = `${window.location.origin}/tournament-of-champions/brackets/${draw.weightClass}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt("Copy bracket link:", url)
    }
  }

  const reorderBracketSlot = async (draggedInvitationId: string, targetSeed: number) => {
    if (reordering) return
    const seedSlots = Array.from({ length: 8 }, (_, index) => {
      const participant = draw.participants.find((p) => p.seed === index + 1 && !isPlaceholderParticipant(p))
      return participant?.invitationId ?? null
    })
    const fromIndex = seedSlots.findIndex((id) => id === draggedInvitationId)
    const toIndex = targetSeed - 1
    if (fromIndex < 0 || toIndex < 0 || toIndex >= seedSlots.length || fromIndex === toIndex) return

    const nextSlots = [...seedSlots]
    const targetInvitationId = nextSlots[toIndex]
    nextSlots[toIndex] = draggedInvitationId
    nextSlots[fromIndex] = targetInvitationId

    setReordering(true)
    try {
      const res = await fetch(workspace === "personal" ? "/api/admin/toc/personal-seeds" : "/api/admin/toc/field/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          workspace === "personal"
            ? { weightClass: draw.weightClass, invitationIds: nextSlots.filter((id): id is string => id != null) }
            : { weightClass: draw.weightClass, seedSlots: nextSlots },
        ),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to reorder bracket")

      if (workspace === "official" && source === "locked") {
        const lockRes = await fetch(`/api/admin/toc/brackets/${draw.weightClass}`, { method: "POST" })
        const lockData = await lockRes.json()
        if (!lockRes.ok) throw new Error(lockData.error || "Seeds saved, but failed to republish locked draw")
      }

      await onDrawUpdated?.()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to reorder bracket")
    } finally {
      setReordering(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#060f1f] text-white">
      <section className="relative bg-[#0B1D3A]">
        <TocPatrioticBar />
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
          <p className="text-[#CC0000] text-xs font-semibold uppercase tracking-[0.22em] mb-3">
            {workspace === "personal" ? "My private seed workspace" : draw.isComplete ? "Official draw" : "Live bracket · field building"}
          </p>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h1 className={cn("text-5xl sm:text-6xl md:text-7xl text-white leading-none", tocDisplayClass())}>
                {draw.weightClass} lbs
              </h1>
              <p className="mt-3 text-white/70 text-sm sm:text-base max-w-xl">
                {draw.isComplete
                  ? "Eight wrestlers. True double elimination. Two mats until the title — then one mat for the champion."
                  : `${draw.confirmedCount ?? 0} of 8 confirmed — open spots show as TBD until the field is set.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {workspace === "official" ? (
                <button type="button" onClick={() => void copyLink()} className={tocMobileCtaClass("secondary")}>
                  <Share2 className="h-4 w-4 mr-2 inline" />
                  Share bracket
                </button>
              ) : (
                <span className={tocMobileCtaClass("secondary")}>Saved to your account</span>
              )}
              <HardLink href="/tournament-of-champions" className={tocMobileCtaClass("ghost")}>
                Event page
              </HardLink>
            </div>
          </div>

          <div className="mt-8 flex gap-2 overflow-x-auto pb-1">
            {allWeights.map((w) => (
              <HardLink
                key={w}
                href={`/tournament-of-champions/brackets/${w}`}
                className={cn(
                  "shrink-0 rounded-sm px-3 py-2 text-sm font-semibold transition-colors",
                  w === draw.weightClass
                    ? "bg-[#CC0000] text-white"
                    : "bg-white/10 text-white/60 hover:bg-white/15 hover:text-white",
                )}
              >
                {w}
              </HardLink>
            ))}
          </div>
        </div>
        <TocPatrioticBar />
      </section>

      <section className="container mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14 space-y-10">
        {workspace === "personal" ? (
          <div className="rounded-sm border border-[#D7B95A]/50 bg-[#D7B95A]/10 px-4 py-3 text-sm text-white/85">
            Drag wrestlers into different bracket positions. Your seed order saves privately and does not change the official TOC draw or another user's workspace.
          </div>
        ) : null}
        {!draw.isComplete ? (
          <div className="rounded-sm border border-[#CC0000]/30 bg-[#CC0000]/10 px-4 py-3 text-sm text-white/85">
            Field building — {draw.confirmedCount ?? 0}/8 wrestlers confirmed. Empty seeds show as TBD in the bracket.
          </div>
        ) : null}

        <div>
          <h2 className={cn("text-2xl sm:text-3xl text-white mb-4", tocDisplayClass())}>Seeds</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
            {draw.participants.map((p) => {
              const open = isPlaceholderParticipant(p)
              return (
                <button
                  key={p.athleteId}
                  type="button"
                  disabled={open}
                  onClick={() => !open && setHighlightedAthleteId((id) => (id === p.athleteId ? null : p.athleteId))}
                  className={cn(
                    "snap-start shrink-0 w-[140px] sm:w-[160px] rounded-sm border p-3 text-center transition-all",
                    open && "border-dashed border-white/15 bg-transparent opacity-70 cursor-default",
                    !open && highlightedAthleteId === p.athleteId
                      ? "border-[#CC0000] bg-[#CC0000]/15 shadow-lg shadow-[#CC0000]/20"
                      : !open && "border-white/10 bg-white/5 hover:border-white/25",
                  )}
                >
                  <div className="flex justify-center mb-2">
                    {open ? (
                      <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-sm border border-dashed border-white/25 text-[10px] uppercase tracking-wide text-white/45">
                        #{p.seed}
                      </div>
                    ) : (
                      <AthleteAvatar name={p.name} photoUrl={p.photoUrl} seed={p.seed} />
                    )}
                  </div>
                  <p className={cn("text-sm text-white leading-tight", !open && tocDisplayClass())}>
                    {open ? "TBD" : p.name}
                  </p>
                  <p className="text-[11px] text-white/50 mt-1 truncate">{open ? "Open" : p.school ?? "—"}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <h2 className={cn("text-2xl sm:text-3xl text-white font-bold mb-2", tocDisplayClass())}>
            Bracket · {draw.weightClass} lbs
          </h2>
          <p className="text-sm text-white/45 mb-4">Winners bracket — scroll horizontally on mobile.</p>
          {reordering ? <p className="text-xs text-[#D7B95A] mb-3">Saving bracket seed order…</p> : null}
          <BracketTree
            tree={winnersTree}
            highlightedCompetitorId={highlightedAthleteId}
            onHighlightCompetitor={setHighlightedAthleteId}
            onReorderSlotDrop={reorderBracketSlot}
            reordering={reordering}
          />
        </div>

        {consolationTree ? (
          <div className="border-t border-white/10 pt-10">
            <h2 className={cn("text-xl sm:text-2xl text-white mb-2", tocDisplayClass())}>Consolation bracket</h2>
            <p className="text-sm text-white/45 mb-4">Back-side bracket — names fill in as results are recorded.</p>
            <BracketTree tree={consolationTree} showChampion={false} />
          </div>
        ) : null}
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-white/45 text-xs">
        NC United Tournament of Champions · {draw.weightClass} lbs {workspace === "personal" ? "private workspace" : "official draw"}
      </footer>
    </div>
  )
}

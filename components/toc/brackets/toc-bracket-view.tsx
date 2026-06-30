"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { HardLink } from "@/components/hard-link"
import { TocPatrioticBar, tocDisplayClass, tocMobileCtaClass } from "@/components/toc/toc-theme"
import { TOC_WEIGHT_CLASSES } from "@/lib/toc/constants"
import { resolveSlotLabel } from "@/lib/toc/eight-man-de-bracket"
import type { TocBracketDraw, TocBracketParticipant, TocBracketBout } from "@/lib/toc/bracket-types"
import { cn } from "@/lib/utils"
import { Share2, Swords, Trophy } from "lucide-react"

type Props = {
  draw: TocBracketDraw
  allWeights?: number[]
}

function participantMap(draw: TocBracketDraw): Map<string, TocBracketParticipant> {
  return new Map(draw.participants.map((p) => [p.athleteId, p]))
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

function FightCard({
  bout,
  participantById,
  highlightedAthleteId,
  onSelectAthlete,
}: {
  bout: TocBracketBout
  participantById: Map<string, TocBracketParticipant>
  highlightedAthleteId: string | null
  onSelectAthlete: (id: string | null) => void
}) {
  const top = resolveSlotLabel(bout.top, participantById)
  const bottom = resolveSlotLabel(bout.bottom, participantById)

  const renderCorner = (
    side: typeof top,
    slot: TocBracketBout["top"],
    align: "top" | "bottom",
  ) => {
    const isAthlete = slot.kind === "athlete"
    const active = isAthlete && highlightedAthleteId === slot.athleteId

    return (
      <button
        type="button"
        disabled={!isAthlete}
        onClick={() => onSelectAthlete(isAthlete ? slot.athleteId : null)}
        className={cn(
          "flex w-full items-center gap-3 p-3 sm:p-4 text-left transition-colors",
          align === "bottom" && "border-t border-white/10",
          isAthlete && "hover:bg-white/5 cursor-pointer",
          !isAthlete && "opacity-80",
          active && "bg-[#CC0000]/20 ring-1 ring-inset ring-[#CC0000]/40",
        )}
      >
        {isAthlete && side.seed != null ? (
          <AthleteAvatar name={side.primary} photoUrl={side.photoUrl ?? null} seed={side.seed} />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm border border-dashed border-white/20 text-[10px] uppercase tracking-wide text-white/50">
            TBD
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className={cn("text-base sm:text-lg text-white truncate", isAthlete && tocDisplayClass())}>{side.primary}</p>
          {side.secondary ? <p className="text-xs text-white/55 truncate">{side.secondary}</p> : null}
        </div>
      </button>
    )
  }

  return (
    <article className="overflow-hidden rounded-sm border border-white/10 bg-[#060f1f]/80 shadow-xl shadow-black/30">
      <div className="flex items-center justify-between bg-[#CC0000] px-3 py-2">
        <span className={cn("text-sm text-white", tocDisplayClass())}>Bout {bout.boutNumber}</span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/85">{bout.roundLabel}</span>
      </div>
      {renderCorner(top, bout.top, "top")}
      <div className="flex items-center justify-center gap-2 bg-[#0B1D3A] py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/45">
        <Swords className="h-3 w-3" /> vs
      </div>
      {renderCorner(bottom, bout.bottom, "bottom")}
    </article>
  )
}

function BoutPill({
  bout,
  participantById,
}: {
  bout: TocBracketBout
  participantById: Map<string, TocBracketParticipant>
}) {
  const top = resolveSlotLabel(bout.top, participantById)
  const bottom = resolveSlotLabel(bout.bottom, participantById)

  return (
    <div className="min-w-[200px] rounded-sm border border-[#0B1D3A]/15 bg-white p-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#CC0000] mb-2">
        Bout {bout.boutNumber} · {bout.roundLabel}
      </p>
      <p className="text-sm font-medium text-[#0B1D3A] truncate">{top.primary}</p>
      <p className="text-xs text-muted-foreground my-1">vs</p>
      <p className="text-sm font-medium text-[#0B1D3A] truncate">{bottom.primary}</p>
    </div>
  )
}

export function TocBracketView({ draw, allWeights = [...TOC_WEIGHT_CLASSES] }: Props) {
  const [tab, setTab] = useState<"draw" | "bracket">("draw")
  const [highlightedAthleteId, setHighlightedAthleteId] = useState<string | null>(null)

  const participantById = useMemo(() => participantMap(draw), [draw])
  const roundOne = useMemo(() => draw.bouts.filter((b) => b.roundLabel === "Round 1"), [draw.bouts])
  const winners = useMemo(() => draw.bouts.filter((b) => b.side === "winners" && b.roundLabel !== "Round 1"), [draw.bouts])
  const losers = useMemo(() => draw.bouts.filter((b) => b.side === "losers"), [draw.bouts])
  const placement = useMemo(() => draw.bouts.filter((b) => b.side === "placement"), [draw.bouts])

  const copyLink = async () => {
    const url = `${window.location.origin}/tournament-of-champions/brackets/${draw.weightClass}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt("Copy bracket link:", url)
    }
  }

  return (
    <div className="min-h-screen bg-[#060f1f] text-white">
      <section className="relative bg-[#0B1D3A]">
        <TocPatrioticBar />
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
          <p className="text-[#CC0000] text-xs font-semibold uppercase tracking-[0.22em] mb-3">Official draw</p>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h1 className={cn("text-5xl sm:text-6xl md:text-7xl text-white leading-none", tocDisplayClass())}>
                {draw.weightClass} lbs
              </h1>
              <p className="mt-3 text-white/70 text-sm sm:text-base max-w-xl">
                Eight wrestlers. True double elimination. Two mats until the title — then one mat for the champion.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void copyLink()} className={tocMobileCtaClass("secondary")}>
                <Share2 className="h-4 w-4 mr-2 inline" />
                Share bracket
              </button>
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

      <div className="sticky top-0 z-20 border-b border-white/10 bg-[#060f1f]/95 backdrop-blur">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 flex gap-1 py-2">
          {(["draw", "bracket"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "rounded-sm px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors",
                tab === key ? "bg-[#CC0000] text-white" : "text-white/60 hover:text-white hover:bg-white/10",
              )}
            >
              {key === "draw" ? "The draw" : "Full bracket"}
            </button>
          ))}
        </div>
      </div>

      {tab === "draw" ? (
        <section className="container mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14 space-y-10">
          <div>
            <h2 className={cn("text-2xl sm:text-3xl text-white mb-4", tocDisplayClass())}>The field</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
              {draw.participants.map((p) => (
                <button
                  key={p.athleteId}
                  type="button"
                  onClick={() => setHighlightedAthleteId((id) => (id === p.athleteId ? null : p.athleteId))}
                  className={cn(
                    "snap-start shrink-0 w-[140px] sm:w-[160px] rounded-sm border p-3 text-center transition-all",
                    highlightedAthleteId === p.athleteId
                      ? "border-[#CC0000] bg-[#CC0000]/15 shadow-lg shadow-[#CC0000]/20"
                      : "border-white/10 bg-white/5 hover:border-white/25",
                  )}
                >
                  <div className="flex justify-center mb-2">
                    <AthleteAvatar name={p.name} photoUrl={p.photoUrl} seed={p.seed} />
                  </div>
                  <p className={cn("text-sm text-white leading-tight", tocDisplayClass())}>{p.name}</p>
                  <p className="text-[11px] text-white/50 mt-1 truncate">{p.school ?? "—"}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-5">
              <Trophy className="h-5 w-5 text-[#CC0000]" />
              <h2 className={cn("text-2xl sm:text-3xl text-white", tocDisplayClass())}>Round 1</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {roundOne.map((bout) => (
                <FightCard
                  key={bout.id}
                  bout={bout}
                  participantById={participantById}
                  highlightedAthleteId={highlightedAthleteId}
                  onSelectAthlete={setHighlightedAthleteId}
                />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="container mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14 space-y-10">
          <div>
            <h2 className={cn("text-xl text-white mb-4", tocDisplayClass())}>Winners bracket</h2>
            <div className="flex gap-3 overflow-x-auto pb-4">
              {winners.map((b) => (
                <BoutPill key={b.id} bout={b} participantById={participantById} />
              ))}
            </div>
          </div>
          <div>
            <h2 className={cn("text-xl text-white mb-4", tocDisplayClass())}>Consolation</h2>
            <div className="flex gap-3 overflow-x-auto pb-4">
              {losers.map((b) => (
                <BoutPill key={b.id} bout={b} participantById={participantById} />
              ))}
            </div>
          </div>
          <div>
            <h2 className={cn("text-xl text-white mb-4", tocDisplayClass())}>Placement</h2>
            <div className="flex gap-3 overflow-x-auto pb-4">
              {placement.map((b) => (
                <BoutPill key={b.id} bout={b} participantById={participantById} />
              ))}
            </div>
          </div>
          <p className="text-sm text-white/45 max-w-2xl">
            Bout results update here during championship weekend. Round 1 names are set from the official seed draw.
          </p>
        </section>
      )}

      <footer className="border-t border-white/10 py-8 text-center text-white/45 text-xs">
        NC United Tournament of Champions · {draw.weightClass} lbs official draw
      </footer>
    </div>
  )
}

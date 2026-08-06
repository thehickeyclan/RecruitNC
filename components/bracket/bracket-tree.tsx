"use client"

import type { DragEvent } from "react"
import Image from "next/image"
import { layoutBracketTree } from "@/lib/bracket/single-elim-layout"
import type { BracketSlotDisplay, BracketTheme, BracketTreeDisplay } from "@/lib/bracket/types"
import { cn } from "@/lib/utils"

const DEFAULT_THEME: Required<BracketTheme> = {
  bg: "transparent",
  slotBg: "#0a1628",
  slotBorder: "rgba(255,255,255,0.12)",
  slotOpenText: "rgba(255,255,255,0.45)",
  slotText: "#ffffff",
  slotSubtext: "rgba(255,255,255,0.45)",
  seedBg: "#CC0000",
  seedOpenBg: "rgba(255,255,255,0.1)",
  connector: "rgba(255,255,255,0.28)",
  roundLabel: "rgba(255,255,255,0.4)",
  highlight: "rgba(204,0,0,0.2)",
}

type Props = {
  tree: BracketTreeDisplay
  theme?: BracketTheme
  highlightedCompetitorId?: string | null
  onHighlightCompetitor?: (id: string | null) => void
  onReorderSlotDrop?: (draggedReorderId: string, targetSeed: number) => void
  reordering?: boolean
  showChampion?: boolean
  selectedWinnerByBout?: Record<number, string>
  onSelectWinner?: (boutNumber: number, competitorId: string) => void
  championName?: string | null
  className?: string
}

function SlotRow({
  slot,
  position,
  slotHeight,
  theme,
  highlightedCompetitorId,
  onHighlightCompetitor,
  onReorderSlotDrop,
  reordering,
  boutNumber,
  selectedWinnerId,
  onSelectWinner,
}: {
  slot: BracketSlotDisplay
  position: "top" | "bottom"
  slotHeight: number
  theme: Required<BracketTheme>
  highlightedCompetitorId?: string | null
  onHighlightCompetitor?: (id: string | null) => void
  onReorderSlotDrop?: (draggedReorderId: string, targetSeed: number) => void
  reordering?: boolean
  boutNumber?: number
  selectedWinnerId?: string | null
  onSelectWinner?: (boutNumber: number, competitorId: string) => void
}) {
  const isOpen = slot.isOpen === true
  const active = !isOpen && slot.competitorId != null && highlightedCompetitorId === slot.competitorId
  const canDrag = !isOpen && Boolean(slot.reorderId) && !reordering
  const canDrop = Boolean(slot.seed) && Boolean(onReorderSlotDrop) && !reordering
  const selectedWinner = !isOpen && slot.competitorId != null && selectedWinnerId === slot.competitorId

  const inner = (
    <>
      <span
        className="flex shrink-0 items-center justify-center rounded-sm text-[10px] font-bold"
        style={{
          width: 22,
          height: 22,
          background: isOpen ? theme.seedOpenBg : theme.seedBg,
          color: isOpen ? theme.slotOpenText : "#fff",
        }}
      >
        {slot.seed ?? "—"}
      </span>
      <span className="min-w-0 flex-1 overflow-hidden">
        <span
          className="block truncate text-xs sm:text-sm leading-tight"
          style={{ color: isOpen ? theme.slotOpenText : theme.slotText, fontStyle: isOpen ? "italic" : "normal" }}
        >
          {slot.name}
        </span>
        {!isOpen && slot.subtitle ? (
          <span className="block truncate text-[10px]" style={{ color: theme.slotSubtext }}>
            {slot.subtitle}
          </span>
        ) : null}
      </span>
      {!isOpen && slot.photoUrl ? (
        <Image
          src={slot.photoUrl}
          alt=""
          width={26}
          height={26}
          className="h-[26px] w-[26px] shrink-0 rounded-sm object-cover"
          style={{ border: `1px solid ${theme.slotBorder}` }}
        />
      ) : null}
      {selectedWinner ? <span className="shrink-0 text-sm font-black text-emerald-400">✓</span> : null}
    </>
  )

  const style = {
    height: slotHeight,
    background: selectedWinner ? "rgba(16,185,129,0.16)" : active ? theme.highlight : "transparent",
    borderBottomColor: selectedWinner ? "rgba(52,211,153,0.5)" : active ? "rgba(204,0,0,0.45)" : theme.slotBorder,
  }

  const className = cn(
    "flex w-full items-center gap-2 px-2.5 border-0 border-b",
    position === "top" ? "" : "border-b-0",
    !isOpen && onHighlightCompetitor && slot.competitorId && "cursor-pointer hover:brightness-110",
    !isOpen && onSelectWinner && slot.competitorId && boutNumber != null && "cursor-pointer hover:brightness-110",
    canDrag && "cursor-move",
    canDrop && "data-[drag-over=true]:bg-[#CC0000]/15 data-[drag-over=true]:brightness-110",
  )

  const dragProps = canDrop
    ? {
        draggable: canDrag,
        onDragStart: (event: DragEvent<HTMLElement>) => {
          if (!slot.reorderId) return
          event.dataTransfer.effectAllowed = "move"
          event.dataTransfer.setData("text/plain", slot.reorderId)
        },
        onDragOver: (event: DragEvent<HTMLElement>) => {
          event.preventDefault()
          event.currentTarget.dataset.dragOver = "true"
          event.dataTransfer.dropEffect = "move"
        },
        onDragLeave: (event: DragEvent<HTMLElement>) => {
          delete event.currentTarget.dataset.dragOver
        },
        onDrop: (event: DragEvent<HTMLElement>) => {
          event.preventDefault()
          delete event.currentTarget.dataset.dragOver
          const draggedReorderId = event.dataTransfer.getData("text/plain")
          if (draggedReorderId && slot.seed) onReorderSlotDrop?.(draggedReorderId, slot.seed)
        },
        onDragEnd: (event: DragEvent<HTMLElement>) => {
          delete event.currentTarget.dataset.dragOver
        },
      }
    : {}

  if (!isOpen && slot.competitorId && (onHighlightCompetitor || (onSelectWinner && boutNumber != null))) {
    return (
      <button
        type="button"
        className={className}
        style={style}
        onClick={() => {
          if (onSelectWinner && boutNumber != null) onSelectWinner(boutNumber, slot.competitorId!)
          else onHighlightCompetitor?.(active ? null : slot.competitorId!)
        }}
        {...dragProps}
      >
        {inner}
      </button>
    )
  }

  return (
    <div className={className} style={style} {...dragProps}>
      {inner}
    </div>
  )
}

/**
 * Flo/Track-style horizontal bracket tree — any power-of-2 size (4, 8, 16, 32, 64).
 * SVG connectors + positioned match boxes.
 */
export function BracketTree({
  tree,
  theme: themeProp,
  highlightedCompetitorId,
  onHighlightCompetitor,
  onReorderSlotDrop,
  reordering = false,
  showChampion = true,
  selectedWinnerByBout,
  onSelectWinner,
  championName,
  className,
}: Props) {
  const theme = { ...DEFAULT_THEME, ...themeProp }
  const layout = layoutBracketTree(tree)

  return (
    <div className={cn("overflow-x-auto", className)} style={{ background: theme.bg }}>
      <div className="relative" style={{ width: layout.width, height: layout.height, minWidth: "100%" }}>
        {/* Round labels — sit in the reserved band above match geometry */}
        {layout.roundLabels.map((rl) => (
          <p
            key={rl.roundIndex}
            className="absolute text-[10px] font-semibold uppercase tracking-[0.18em] text-center -translate-x-1/2"
            style={{ left: rl.x, top: 8, color: theme.roundLabel, width: layout.matchWidth }}
          >
            {rl.label}
          </p>
        ))}

        {/* Connectors — same coordinate space as match.centerY */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={layout.width}
          height={layout.height}
          aria-hidden
        >
          {layout.connectors.map((c) => (
            <path
              key={c.id}
              d={c.path}
              fill="none"
              stroke={theme.connector}
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          ))}
        </svg>

        {/* Matches — bout label is an in-card header, never floating above the box */}
        {layout.matches.map((match) => (
          <div
            key={match.id}
            className="absolute flex flex-col overflow-hidden rounded-sm border"
            style={{
              left: match.x,
              top: match.y,
              width: match.width,
              height: match.height,
              borderColor: theme.slotBorder,
              background: theme.slotBg,
            }}
          >
            <div
              className="flex shrink-0 items-center px-2.5 text-[9px] font-semibold uppercase tracking-wider"
              style={{
                height: layout.boutHeaderHeight,
                color: theme.roundLabel,
                borderBottom: `1px solid ${theme.slotBorder}`,
                background: "rgba(255,255,255,0.04)",
              }}
            >
              {match.boutNumber != null ? `Bout ${match.boutNumber}` : "\u00a0"}
            </div>
            <SlotRow
              slot={match.top}
              position="top"
              slotHeight={layout.slotHeight}
              theme={theme}
              highlightedCompetitorId={highlightedCompetitorId}
              onHighlightCompetitor={onHighlightCompetitor}
              onReorderSlotDrop={match.roundIndex === 0 ? onReorderSlotDrop : undefined}
              reordering={reordering}
              boutNumber={match.boutNumber}
              selectedWinnerId={match.boutNumber != null ? selectedWinnerByBout?.[match.boutNumber] : null}
              onSelectWinner={onSelectWinner}
            />
            <SlotRow
              slot={match.bottom}
              position="bottom"
              slotHeight={layout.slotHeight}
              theme={theme}
              highlightedCompetitorId={highlightedCompetitorId}
              onHighlightCompetitor={onHighlightCompetitor}
              onReorderSlotDrop={match.roundIndex === 0 ? onReorderSlotDrop : undefined}
              reordering={reordering}
              boutNumber={match.boutNumber}
              selectedWinnerId={match.boutNumber != null ? selectedWinnerByBout?.[match.boutNumber] : null}
              onSelectWinner={onSelectWinner}
            />
          </div>
        ))}

        {showChampion && layout.matches.length > 0 ? (() => {
          const finalMatch = layout.matches[layout.matches.length - 1]
          return (
            <div
              className="absolute flex flex-col items-center justify-center rounded-sm border px-3 py-4 text-center -translate-y-1/2"
              style={{
                left: finalMatch.x + finalMatch.width + 16,
                top: finalMatch.centerY,
                borderColor: "rgba(204,0,0,0.35)",
                background: "rgba(204,0,0,0.08)",
                minWidth: 72,
              }}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-[#CC0000]">Champ</span>
              <span className="text-[10px] mt-1" style={{ color: theme.slotOpenText }}>
                {championName ?? "TBD"}
              </span>
            </div>
          )
        })() : null}
      </div>
    </div>
  )
}

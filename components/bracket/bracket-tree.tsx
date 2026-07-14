"use client"

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
  showChampion?: boolean
  className?: string
}

function SlotRow({
  slot,
  position,
  slotHeight,
  theme,
  highlightedCompetitorId,
  onHighlightCompetitor,
}: {
  slot: BracketSlotDisplay
  position: "top" | "bottom"
  slotHeight: number
  theme: Required<BracketTheme>
  highlightedCompetitorId?: string | null
  onHighlightCompetitor?: (id: string | null) => void
}) {
  const isOpen = slot.isOpen === true
  const active = !isOpen && slot.competitorId != null && highlightedCompetitorId === slot.competitorId

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
    </>
  )

  const style = {
    height: slotHeight,
    background: active ? theme.highlight : "transparent",
    borderBottomColor: active ? "rgba(204,0,0,0.45)" : theme.slotBorder,
  }

  const className = cn(
    "flex w-full items-center gap-2 px-2.5 border-0 border-b",
    position === "top" ? "" : "border-b-0",
    !isOpen && onHighlightCompetitor && slot.competitorId && "cursor-pointer hover:brightness-110",
  )

  if (!isOpen && onHighlightCompetitor && slot.competitorId) {
    return (
      <button
        type="button"
        className={className}
        style={style}
        onClick={() => onHighlightCompetitor(active ? null : slot.competitorId!)}
      >
        {inner}
      </button>
    )
  }

  return (
    <div className={className} style={style}>
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
  showChampion = true,
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
            />
            <SlotRow
              slot={match.bottom}
              position="bottom"
              slotHeight={layout.slotHeight}
              theme={theme}
              highlightedCompetitorId={highlightedCompetitorId}
              onHighlightCompetitor={onHighlightCompetitor}
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
                TBD
              </span>
            </div>
          )
        })() : null}
      </div>
    </div>
  )
}

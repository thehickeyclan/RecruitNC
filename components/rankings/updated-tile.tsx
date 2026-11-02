"use client"

import { useEffect, useState, type ReactNode } from "react"

/**
 * A class tile that lights green after its board is republished, until this visitor opens it
 * (Matt, 30 October 2026). "Seen" is per browser: the last publish time the visitor opened.
 * A board older than two weeks is never news, so first-time visitors aren't shown a wall of green.
 */
const FRESH_MS = 14 * 24 * 60 * 60 * 1000
const seenKey = (board: string) => `rankings-seen:${board}`

function readSeen(board: string): string | null {
  try {
    return window.localStorage.getItem(seenKey(board))
  } catch {
    return null
  }
}

export function markBoardSeen(board: string, publishedAt: string) {
  try {
    window.localStorage.setItem(seenKey(board), publishedAt)
  } catch {
    // Private windows and blocked storage just keep showing the badge.
  }
}

/** Every board this tile covers is news when any one was published since the visitor last opened it. */
export function useUpdatedSince(boards: ReadonlyArray<{ board: string; publishedAt: string | null }>): boolean {
  const [updated, setUpdated] = useState(false)
  const signature = boards.map((b) => `${b.board}@${b.publishedAt ?? ""}`).join("|")
  useEffect(() => {
    setUpdated(
      boards.some(({ board, publishedAt }) => {
        if (!publishedAt) return false
        const at = new Date(publishedAt).getTime()
        if (!Number.isFinite(at) || Date.now() - at > FRESH_MS) return false
        const seen = readSeen(board)
        return !seen || new Date(seen).getTime() < at
      }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])
  return updated
}

export function UpdatedTile({
  href,
  boards,
  className,
  children,
}: {
  href: string
  boards: ReadonlyArray<{ board: string; publishedAt: string | null }>
  className: string
  children: ReactNode
}) {
  const updated = useUpdatedSince(boards)
  return (
    <a
      href={href}
      onClick={() => boards.forEach(({ board, publishedAt }) => publishedAt && markBoardSeen(board, publishedAt))}
      className={`relative ${className} ${updated ? "!border-emerald-400 shadow-[0_0_0_1px_rgba(52,211,153,0.6),0_0_24px_rgba(52,211,153,0.25)]" : ""}`}
    >
      {updated ? (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-400 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-[#061224]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#061224]" aria-hidden />
          Updated
        </span>
      ) : null}
      {children}
    </a>
  )
}

/** Opening a board counts as seeing it, however the visitor got there. */
export function MarkBoardSeen({ board, publishedAt }: { board: string; publishedAt: string | null }) {
  useEffect(() => {
    if (publishedAt) markBoardSeen(board, publishedAt)
  }, [board, publishedAt])
  return null
}

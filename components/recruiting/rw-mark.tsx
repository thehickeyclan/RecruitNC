/**
 * The RecruitWrestlers monogram: a white R and a blue W (Matt's brand board, 15 October 2026),
 * redrawn as vector paths so it is sharp at any size. `tone="mono"` draws both letters in the
 * current text colour, for a one-colour use (an icon on gold, a light background).
 */
export function RwMark({ className = "", tone = "brand", title = "RecruitWrestlers" }: { className?: string; tone?: "brand" | "mono"; title?: string }) {
  const r = tone === "mono" ? "currentColor" : "#FFFFFF"
  const w = tone === "mono" ? "currentColor" : "var(--rw-blue, #1F6BFF)"
  return (
    <svg viewBox="0 0 1180 400" className={className} role="img" aria-label={title}>
      <path
        fill={r}
        fillRule="evenodd"
        d="M80 10 H505 C565 10 605 52 605 112 C605 168 575 210 528 230 L560 388 H440 L355 240 H262 L180 388 H20 L172 145 L145 105 Z M145 105 H455 C470 105 478 115 478 125 C478 137 470 145 455 145 H172 Z"
      />
      <path fill={w} d="M552 262 L628 172 L672 240 L760 100 H818 L880 215 L1020 10 H1170 L895 388 H785 L754 298 L722 388 H628 Z" />
    </svg>
  )
}

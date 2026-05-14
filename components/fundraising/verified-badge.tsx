import { CheckCircle } from "lucide-react"

type VerifiedBadgeProps = {
  tooltipText?: string
}

/** Small trust signal for live NC United athlete gift pages — icon only; `title` for desktop hover. */
export function VerifiedBadge({ tooltipText = "Official NC United gift page" }: VerifiedBadgeProps) {
  return (
    <span title={tooltipText} className="inline-flex shrink-0 items-center align-middle">
      <CheckCircle className="h-4 w-4 text-emerald-500" aria-hidden />
      <span className="sr-only">{tooltipText}</span>
    </span>
  )
}

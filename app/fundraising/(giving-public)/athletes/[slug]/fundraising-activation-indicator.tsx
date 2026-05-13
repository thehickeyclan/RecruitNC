import {
  fundraisingWiringLooksReadyForNonAdminEdits,
  type FundraisingWiringAdminSnapshot,
} from "@/lib/fundraising/fundraising-wiring-status"
import { cn } from "@/lib/utils"

type Props = {
  wiringSnapshot: FundraisingWiringAdminSnapshot
}

/** Green/red wiring status — staff-only on the public gift URL so donors and families never see internal activation messaging. */
export function FundraisingActivationIndicator({ wiringSnapshot }: Props) {
  const activated = fundraisingWiringLooksReadyForNonAdminEdits(wiringSnapshot)

  return (
    <div
      className={cn(
        "mt-6 flex items-start gap-3 rounded-xl border px-4 py-3 sm:items-center sm:py-3.5",
        activated ? "border-emerald-500/45 bg-emerald-950/30" : "border-red-500/45 bg-red-950/30",
      )}
      role="status"
      aria-label={activated ? "Activated" : "Not activated"}
    >
      <span
        className={cn(
          "mt-1 h-3 w-3 shrink-0 rounded-full sm:mt-0",
          activated ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.75)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]",
        )}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="font-[family-name:var(--font-fundraising-display)] text-sm font-black uppercase tracking-wide text-white">
          {activated ? "Activated" : "Not activated"}
        </p>
        <p className="mt-1 text-xs leading-snug text-white/72">
          {activated
            ? "Connected to Profile digital wallet and parent."
            : "Not connected to Profile digital wallet and parent yet."}
        </p>
      </div>
    </div>
  )
}

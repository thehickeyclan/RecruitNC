import type { CoachCapFlag } from "@/lib/toc/coach-designation"

/**
 * Wrestlers carrying more corner coaches than the cap allows.
 *
 * The one thing on the coaches page that cannot wait for somebody to scroll, so it sits above
 * the numbers — and says nothing at all when there is nothing to say, because a warning that is
 * always on screen stops being a warning.
 *
 * Two blocks rather than one, because a breach and a warning are not the same thing and a
 * single red box counting only the breaches while listing both reads as a miscount.
 *
 * The reasons need different words too. Over the cap on a single athlete record is always a
 * mistake. One name across several records usually means a duplicated profile, but sometimes
 * means two wrestlers who share a name — telling somebody to decline a coach without saying so
 * would send them after the wrong thing.
 */
export function CoachCapBanner({ flags, max }: { flags: CoachCapFlag[]; max: number }) {
  const breached = flags.filter((flag) => flag.reason !== "would-exceed")
  const warned = flags.filter((flag) => flag.reason === "would-exceed")

  if (breached.length === 0 && warned.length === 0) return null

  return (
    <div className="mt-5 flex flex-col gap-3 print:hidden">
      {breached.length > 0 ? (
        <section className="rounded-xl border border-rnc-red bg-rnc-red/10 p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-red-300">
            {breached.length} wrestler{breached.length === 1 ? " has" : "s have"} more than {max} approved
            coaches
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {breached.map((flag) => (
              <CapFlagRow key={rowKey(flag)} flag={flag} tone="text-red-300" />
            ))}
          </ul>
        </section>
      ) : null}

      {warned.length > 0 ? (
        <section className="rounded-xl border border-rnc-gold/40 bg-rnc-gold/5 p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-rnc-gold">
            {warned.length} wrestler{warned.length === 1 ? "" : "s"} would go over {max} if you approve what is
            pending
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {warned.map((flag) => (
              <CapFlagRow key={rowKey(flag)} flag={flag} tone="text-rnc-gold" />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function rowKey(flag: CoachCapFlag): string {
  return `${flag.reason}-${flag.athleteName}-${flag.athleteIds.join(",")}`
}

function CapFlagRow({ flag, tone }: { flag: CoachCapFlag; tone: string }) {
  return (
    <li className="text-sm">
      <p className="font-semibold text-white">
        {flag.athleteName}
        {flag.weightClass ? ` (${flag.weightClass})` : ""}{" "}
        <span className="font-normal text-slate-300">
          — {flag.approved.length} approved
          {flag.pending.length > 0 ? `, ${flag.pending.length} pending` : ""}
        </span>
      </p>
      <p className="mt-0.5 text-xs text-slate-300">
        Approved: {flag.approved.join(", ") || "none"}
        {flag.pending.length > 0 ? ` · Pending: ${flag.pending.join(", ")}` : ""}
      </p>
      <p className={`mt-1 text-xs ${tone}`}>
        {flag.reason === "over"
          ? "Over the cap on one athlete record — decline one before the check-in list prints."
          : flag.reason === "duplicate"
            ? `One name across ${flag.athleteIds.length} athlete records. Either the profile is duplicated, or these are two wrestlers who share a name — check which before declining anybody.`
            : "Approving a coach clears them for every wrestler they corner, so check this one before you do."}
      </p>
    </li>
  )
}

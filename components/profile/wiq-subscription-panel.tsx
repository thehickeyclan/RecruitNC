"use client"

import { ExternalLink, Info } from "lucide-react"
import type { ParentWiqSubscription } from "@/lib/blue-wiq-for-parent"

/**
 * A WrestlingIQ subscription, shown to the parent who pays it.
 *
 * Read-only on purpose. NC United's original Blue families were never migrated off WrestlingIQ —
 * asking them to re-enter card details is itself a churn moment — so their billing lives in a
 * system this app cannot write to. Everything here is what we last imported; the one action
 * offered is the link to the place where changes actually happen.
 *
 * A Pause or Cancel button here would be the worst kind of wrong: it would look like it worked.
 */

/** Where a WrestlingIQ parent manages their subscription. */
export const WRESTLINGIQ_PARENT_URL = "https://www.wrestlingiq.com/"

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
}

function StatusPill({ sub }: { sub: ParentWiqSubscription }) {
  const { label, className } = sub.comped
    ? { label: "Scholarship", className: "bg-sky-100 text-sky-800 border-sky-300" }
    : sub.status === "active"
      ? { label: "Active", className: "bg-green-500/10 text-green-300 border-green-500/30" }
      : sub.status === "past_due"
        ? { label: "Payment due", className: "bg-amber-500/10 text-amber-200 border-amber-500/30" }
        : sub.current
          ? { label: "Cancelled — access until " + formatDate(sub.activeUntil), className: "bg-amber-500/10 text-amber-200 border-amber-500/30" }
          : { label: "Ended", className: "bg-muted text-foreground border-border" }

  return <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}>{label}</span>
}

export function WiqSubscriptionPanel({ subscriptions }: { subscriptions: ParentWiqSubscription[] }) {
  if (!subscriptions.length) return null

  return (
    <div className="rounded-lg border border-[#D3B574]/40 bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold text-foreground">NC United Blue subscription</h3>
        <span className="text-xs font-medium text-muted-foreground">Billed through WrestlingIQ</span>
      </div>

      <div className="space-y-4">
        {subscriptions.map((sub) => (
          <div key={sub.id} className="rounded-md border border-border bg-muted p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-foreground">{sub.athleteName}</span>
              <StatusPill sub={sub} />
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Member since</dt>
                <dd className="font-medium text-foreground">{formatDate(sub.memberSince)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Monthly</dt>
                <dd className="font-medium text-foreground">
                  {sub.comped ? "No charge" : (sub.amountFormatted ?? "—")}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {sub.status === "active" ? "Next payment" : "Access until"}
                </dt>
                <dd className="font-medium text-foreground">
                  {formatDate(sub.status === "active" ? sub.nextDueAt : sub.activeUntil)}
                </dd>
              </div>
              {sub.discountCode ? (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Discount</dt>
                  <dd className="font-medium text-foreground">{sub.discountCode}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        ))}
      </div>

      {/*
        Said plainly. A parent who expects a Cancel button and cannot find one will assume the
        page is broken; a parent told where to go will go there.
      */}
      <div className="mt-4 flex items-start gap-2 rounded-md border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <p>
            Your membership is billed through <strong>WrestlingIQ</strong>, so changes — pausing,
            cancelling, or updating your card — are made there rather than here. The details above are
            from our most recent sync.
          </p>
          <a
            href={WRESTLINGIQ_PARENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 font-semibold underline underline-offset-2 hover:text-blue-100"
          >
            Manage in WrestlingIQ
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </div>
    </div>
  )
}

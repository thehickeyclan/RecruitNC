"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { FundraisingAthleteIndexRow } from "@/lib/fundraising/athlete-fundraising-profiles"
import { submitFundraisingActivationRequestAction } from "@/app/actions/fundraising/fundraising-activation-actions"
import { HardLink } from "@/components/hard-link"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

type Props = {
  rows: FundraisingAthleteIndexRow[]
  /** Latest activation status per fundraising slug (lowercase), from server */
  activationStatusBySlug: Record<string, string>
}

function digitsSlug(slug: string): string {
  return slug.trim().toLowerCase()
}

export function PlaybookFundraisingRequestSection({ rows, activationStatusBySlug }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [busySlug, setBusySlug] = useState<string | null>(null)
  const [optimisticPending, setOptimisticPending] = useState<Record<string, boolean>>({})

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase()
    if (!t) return rows
    return rows.filter((r) => {
      const hay = `${r.displayName} ${r.code} ${r.sublabel ?? ""} ${r.hrefSlug}`.toLowerCase()
      return hay.includes(t)
    })
  }, [rows, query])

  const statusFor = (hrefSlug: string): string => {
    const k = digitsSlug(hrefSlug)
    if (optimisticPending[k]) return "pending"
    return activationStatusBySlug[k] ?? "none"
  }

  const requestAccess = async (row: FundraisingAthleteIndexRow) => {
    const slugKey = digitsSlug(row.hrefSlug)
    const st = statusFor(row.hrefSlug)
    if (st === "pending" || st === "approved" || busySlug) return

    setBusySlug(slugKey)
    try {
      const res = await submitFundraisingActivationRequestAction({
        fundraisingSlug: row.hrefSlug,
        athleteId: row.athleteId,
      })
      if (!res.ok) {
        toast({
          title: "Request not sent",
          description: res.error ?? "Try again.",
          variant: "destructive",
        })
        return
      }
      setOptimisticPending((prev) => ({ ...prev, [slugKey]: true }))
      toast({
        title: "Request submitted",
        description: "NC United staff will review and link your login when ready.",
      })
      router.refresh()
    } finally {
      setBusySlug(null)
    }
  }

  return (
    <section
      id="fundraising-page-request"
      className="scroll-mt-28 rounded-xl border border-[#C8A94A]/40 bg-[#0B2545]/65 px-4 py-6 sm:px-7 sm:py-8"
      aria-labelledby="fundraising-page-request-heading"
    >
      <p className="font-[family-name:var(--font-fundraising-display)] text-[10px] font-bold uppercase tracking-[0.22em] text-[#C8A94A]">
        Next step · Staff wiring
      </p>
      <h2
        id="fundraising-page-request-heading"
        className="font-[family-name:var(--font-fundraising-display)] mt-3 text-xl font-black uppercase leading-snug tracking-tight text-white sm:text-2xl"
      >
        Request access to your athlete&apos;s gift page
      </h2>
      <p className="mt-4 text-base leading-relaxed text-white/82">
        You need a <strong className="text-white/95">RecruitNC account</strong> (athlete or parent). After skimming this playbook, find your wrestler
        below and tap <strong className="text-white/95">Request staff link</strong>. That notifies admins — same queue as the{" "}
        <strong className="text-white/95">Request activation</strong> button on the public gift page. No separate checklist here.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-white/65">
        New accounts: use{" "}
        <HardLink href="/auth/signup?returnTo=%2Ffundraising%2Fplaybook%2Fmembers" className="font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
          Sign up
        </HardLink>{" "}
        — athlete and parent profiles require a <strong className="text-white/80">cell number</strong> on registration.
      </p>

      <label htmlFor="playbook-fundraising-athlete-search" className="mt-6 block text-xs font-bold uppercase tracking-wide text-white/55">
        Search roster / gift-page slug
      </label>
      <input
        id="playbook-fundraising-athlete-search"
        name="playbook-fundraising-athlete-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Name, school, or NCU code…"
        autoComplete="off"
        spellCheck={false}
        className="mt-2 w-full max-w-lg min-h-12 rounded-lg border border-white/15 bg-[#061224]/90 px-4 py-3 text-base text-white shadow-inner placeholder:text-white/40 focus:border-[#C8A94A]/70 focus:outline-none focus:ring-2 focus:ring-[#C8A94A]/35"
      />
      <p className="mt-2 text-xs text-white/45 tabular-nums">
        {filtered.length === rows.length
          ? `${rows.length} athlete${rows.length === 1 ? "" : "s"} listed`
          : `${filtered.length} of ${rows.length} shown`}
      </p>

      <ul className="mt-6 space-y-3">
        {filtered.length === 0 ? (
          <li className="rounded-lg border border-white/10 bg-black/20 px-4 py-6 text-sm text-white/60">No matches — try another spelling or code.</li>
        ) : (
          filtered.slice(0, 80).map((row) => {
            const slugKey = digitsSlug(row.hrefSlug)
            const st = statusFor(row.hrefSlug)
            const busy = busySlug === slugKey
            const giftHref = `/fundraising/athletes/${encodeURIComponent(row.hrefSlug)}`

            return (
              <li
                key={`${row.athleteId}-${row.hrefSlug}`}
                className="flex flex-col gap-3 rounded-lg border border-white/12 bg-black/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-[family-name:var(--font-fundraising-display)] text-sm font-bold uppercase tracking-wide text-white">{row.displayName}</p>
                  <p className="mt-1 font-mono text-[11px] text-white/50">{row.code}</p>
                  {row.sublabel ? <p className="mt-1 text-xs text-white/55">{row.sublabel}</p> : null}
                  <p className="mt-2">
                    <HardLink href={giftHref} className="text-xs font-semibold text-[#C8A94A] underline-offset-4 hover:underline">
                      Open gift page →
                    </HardLink>
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                  {st === "approved" ? (
                    <span className="rounded-md border border-emerald-500/35 bg-emerald-950/40 px-3 py-2 text-center text-xs font-semibold text-emerald-100">
                      Approved — use Profile → Fundraise
                    </span>
                  ) : st === "pending" ? (
                    <span className="rounded-md border border-amber-500/35 bg-amber-950/35 px-3 py-2 text-center text-xs font-semibold text-amber-100">
                      Request pending review
                    </span>
                  ) : (
                    <>
                      <Button
                        type="button"
                        disabled={busy}
                        onClick={() => void requestAccess(row)}
                        className="min-h-11 bg-[#C8A94A] font-semibold text-[#061224] hover:bg-[#b89740]"
                      >
                        {busy ? "Sending…" : "Request staff link"}
                      </Button>
                      {st === "rejected" ? (
                        <span className="text-center text-[11px] text-white/50 sm:text-right">
                          Previous request declined — tap above to send again.
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
              </li>
            )
          })
        )}
      </ul>
      {filtered.length > 80 ? (
        <p className="mt-4 text-xs text-white/50">Showing first 80 matches — narrow your search for faster browsing.</p>
      ) : null}

    </section>
  )
}

"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import { ChevronDown } from "lucide-react"
import { HardLink } from "@/components/hard-link"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { formatUsdWhole } from "@/app/fundraising/components/FundraisingHero"
import type { AthleteOwnerThankYouRow, AthleteOwnerThankYouRowWithAck } from "@/lib/fundraising/athlete-public-stats"

type Props = {
  athleteId: string
  fundraisingSlug: string
  /** When false, only the private supporter contact table is shown (e.g. bio is edited elsewhere on the page). */
  showBioEditor?: boolean
  canEditStory: boolean
  initialBio: string
  donorRows: AthleteOwnerThankYouRowWithAck[]
}

export function FundraisingOwnerPanel({
  athleteId,
  fundraisingSlug,
  showBioEditor = true,
  canEditStory,
  initialBio,
  donorRows,
}: Props) {
  const router = useRouter()
  const [bio, setBio] = useState(initialBio)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyThankLedger, setBusyThankLedger] = useState<string | null>(null)
  const [thankAckError, setThankAckError] = useState<string | null>(null)
  const [managerPanelOpen, setManagerPanelOpen] = useState(false)

  const saveBio = useCallback(async () => {
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch(`/api/athletes/${encodeURIComponent(athleteId)}/fundraising-bio`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not save.")
        return
      }
      setMessage("Saved.")
      router.refresh()
    } catch {
      setError("Network error.")
    } finally {
      setSaving(false)
    }
  }, [athleteId, bio, router])

  const persistThankAck = useCallback(
    async (ledgerKey: string, thanked: boolean) => {
      setBusyThankLedger(ledgerKey)
      setThankAckError(null)
      try {
        const res = await fetch(`/api/athletes/${encodeURIComponent(athleteId)}/fundraising-thank-you-acks`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ledgerKey, thanked }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Could not update thank-you flag.")
        }
        router.refresh()
      } catch (e) {
        setThankAckError(e instanceof Error ? e.message : "Could not update thank-you flag.")
      } finally {
        setBusyThankLedger(null)
      }
    },
    [athleteId, router],
  )

  const thankedCount = donorRows.filter((r) => r.thanked).length

  return (
    <Collapsible open={managerPanelOpen} onOpenChange={setManagerPanelOpen} className="mt-10 rounded-xl border border-[#C8A94A]/35 bg-[#0B2545]/50">
      <div className="p-5 sm:p-6">
        <CollapsibleTrigger
          type="button"
          className="flex w-full items-start justify-between gap-3 rounded-lg text-left outline-none ring-[#C8A94A]/40 transition hover:bg-white/[0.04] focus-visible:ring-2 sm:-m-1 sm:p-1"
        >
          <div className="min-w-0 flex-1">
            <p className="font-[family-name:var(--font-fundraising-display)] text-[11px] font-bold uppercase tracking-[0.2em] text-[#C8A94A]">
              Managers only — not public
            </p>
            <h2 className="font-[family-name:var(--font-fundraising-display)] mt-2 text-lg font-black uppercase tracking-tight text-white">
              {showBioEditor ? "Manage this fundraising page" : "Supporters to thank (private)"}
            </h2>
            <p className="mt-1 text-xs text-white/45">
              Tap to expand — story editor &amp; supporter contacts stay hidden until you open this (still never visible to donors).
            </p>
          </div>
          <ChevronDown
            className={cn("mt-1 h-6 w-6 shrink-0 text-[#C8A94A] transition-transform duration-200", managerPanelOpen && "rotate-180")}
            aria-hidden
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="overflow-hidden">
          <div className="space-y-10 pt-6">
            <p className="text-sm leading-relaxed text-white/65">
              Only linked parents, this athlete on their own account, or NC United staff can open this. Visitors never see it. Use
              supporter contact info for personal thank-yous only — don&apos;t add people to lists or share their details.
            </p>

            {showBioEditor && canEditStory ? (
              <div className="border-t border-white/10 pt-8">
                <label htmlFor="fundraising-story" className="block text-sm font-semibold text-white/90">
                  What I&apos;m raising for
                </label>
                <p className="mt-1 text-xs text-white/50">
                  Shown on your public gift page (
                  <HardLink
                    href={`/fundraising/athletes/${fundraisingSlug}`}
                    className="text-[#C8A94A] underline-offset-2 hover:underline"
                  >
                    /fundraising/athletes/{fundraisingSlug}
                  </HardLink>
                  ).
                </p>
                <textarea
                  id="fundraising-story"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={5}
                  className="mt-3 w-full resize-y rounded-lg border border-white/20 bg-[#061224] px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-[#C8A94A] focus:outline-none focus:ring-1 focus:ring-[#C8A94A]/50"
                  placeholder="e.g. This season I'm raising for travel and Fargo expenses — thank you for helping me compete."
                  maxLength={6000}
                />
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void saveBio()}
                    disabled={saving}
                    className="rounded-md bg-[#C8A94A] px-4 py-2 text-sm font-bold uppercase tracking-wide text-[#061224] hover:bg-[#d4b75c] disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save message"}
                  </button>
                  {message ? <span className="text-sm text-emerald-400/90">{message}</span> : null}
                  {error ? <span className="text-sm text-red-400/90">{error}</span> : null}
                </div>
              </div>
            ) : showBioEditor ? (
              <div className="border-t border-white/10 pt-8">
                <p className="text-sm text-white/65">
                To edit the &quot;what I&apos;m raising for&quot; message on this page, NC United needs an active gift-page profile
                linked to your account. Contact{" "}
                  <a href="mailto:info@ncwrestlingunited.com" className="text-[#C8A94A] hover:underline">
                    info@ncwrestlingunited.com
                  </a>{" "}
                  if this page should be editable.
                </p>
              </div>
            ) : null}

            <div className="border-t border-white/10 pt-8">
              <h3 className="font-[family-name:var(--font-fundraising-display)] text-sm font-bold uppercase tracking-wide text-white">
                Supporters (recent gifts, hub reporting window)
              </h3>
              <p className="mt-1 text-xs text-white/50">
                Email comes from checkout. Phone shows only if the donor entered it when paying — many rows will show “—”.
              </p>
              {donorRows.length > 0 ? (
                <p className="mt-2 text-xs text-white/55">
                  Thanked {thankedCount} / {donorRows.length}. Check the box after you reach out — only managers see this list.
                </p>
              ) : null}
              {thankAckError ? <p className="mt-2 text-sm text-red-400/90">{thankAckError}</p> : null}
              {donorRows.length === 0 ? (
                <p className="mt-4 text-sm text-white/55">No gifts in this list yet for the current hub reporting window.</p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="border-b border-white/10 bg-black/25 text-[11px] uppercase tracking-wide text-white/50">
                      <tr>
                        <th className="px-2 py-2 font-semibold text-center">Thanked</th>
                        <th className="px-3 py-2 font-semibold">Date</th>
                        <th className="px-3 py-2 font-semibold">Name</th>
                        <th className="px-3 py-2 font-semibold">Email</th>
                        <th className="px-3 py-2 font-semibold">Phone</th>
                        <th className="px-3 py-2 font-semibold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {donorRows.map((r, i) => (
                        <tr key={`${r.ledgerKey}-${i}`} className="text-white/85">
                          <td className="px-2 py-2.5 text-center align-middle">
                            <input
                              type="checkbox"
                              className="h-4 w-4 cursor-pointer rounded border-white/35 bg-[#061224] text-[#C8A94A] accent-[#C8A94A] focus:ring-2 focus:ring-[#C8A94A]/40 disabled:cursor-not-allowed disabled:opacity-50"
                              checked={r.thanked}
                              disabled={busyThankLedger === r.ledgerKey}
                              onChange={(e) => void persistThankAck(r.ledgerKey, e.target.checked)}
                              aria-label={
                                r.thanked
                                  ? `Marked thanked for ${r.donorName ?? "supporter"}`
                                  : `Mark thanked for ${r.donorName ?? "supporter"}`
                              }
                            />
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-xs tabular-nums text-white/45">
                            {r.createdIso
                              ? new Date(r.createdIso).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>
                          <td className="max-w-[140px] truncate px-3 py-2.5" title={r.donorName ?? ""}>
                            {r.donorName ?? "—"}
                          </td>
                          <td className="max-w-[200px] truncate px-3 py-2.5" title={emailTooltip(r)}>
                            {r.donorEmail ?? r.notificationEmail ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-white/70">{r.donorPhone ?? "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-[#C8A94A] tabular-nums">
                            {formatUsdWhole(r.amountCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function emailTooltip(r: AthleteOwnerThankYouRow): string {
  if (r.donorEmail && r.notificationEmail && r.donorEmail !== r.notificationEmail) {
    return `${r.donorEmail} · alt: ${r.notificationEmail}`
  }
  return r.donorEmail ?? r.notificationEmail ?? ""
}

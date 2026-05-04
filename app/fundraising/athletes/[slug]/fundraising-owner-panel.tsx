"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import { HardLink } from "@/components/hard-link"
import { formatUsdWhole } from "@/app/fundraising/components/FundraisingHero"
import type { AthleteOwnerThankYouRow } from "@/lib/fundraising/athlete-public-stats"

type Props = {
  athleteId: string
  fundraisingSlug: string
  canEditStory: boolean
  initialBio: string
  donorRows: AthleteOwnerThankYouRow[]
  lookbackDays: number
}

export function FundraisingOwnerPanel({
  athleteId,
  fundraisingSlug,
  canEditStory,
  initialBio,
  donorRows,
  lookbackDays,
}: Props) {
  const router = useRouter()
  const [bio, setBio] = useState(initialBio)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="mt-10 space-y-10 rounded-xl border border-[#C8A94A]/35 bg-[#0B2545]/50 p-5 sm:p-6">
      <div>
        <p className="font-[family-name:var(--font-fundraising-display)] text-[11px] font-bold uppercase tracking-[0.2em] text-[#C8A94A]">
          Account linked in admin
        </p>
        <h2 className="font-[family-name:var(--font-fundraising-display)] mt-2 text-lg font-black uppercase tracking-tight text-white">
          Manage this fundraising page
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/65">
          Only RecruitNC accounts staff connected to this athlete (same link as Family / Fundraise) see this block. Use supporter
          contact info to say thank you personally — don&apos;t add people to lists or share their details outside that.
        </p>
      </div>

      {canEditStory ? (
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
      ) : (
        <div className="border-t border-white/10 pt-8">
          <p className="text-sm text-white/65">
            To edit the &quot;what I&apos;m raising for&quot; message on this URL, NC United needs an active fundraising profile
            linked to your RecruitNC account. Contact{" "}
            <a href="mailto:info@ncwrestlingunited.com" className="text-[#C8A94A] hover:underline">
              info@ncwrestlingunited.com
            </a>{" "}
            if this page should be editable.
          </p>
        </div>
      )}

      <div className="border-t border-white/10 pt-8">
        <h3 className="font-[family-name:var(--font-fundraising-display)] text-sm font-bold uppercase tracking-wide text-white">
          Supporters ({lookbackDays}-day campaign window)
        </h3>
        <p className="mt-1 text-xs text-white/50">
          Email comes from checkout. Phone appears only if the donor entered it in Stripe — many rows will show “—”.
        </p>
        {donorRows.length === 0 ? (
          <p className="mt-4 text-sm text-white/55">No credited gifts in this window yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-white/10 bg-black/25 text-[11px] uppercase tracking-wide text-white/50">
                <tr>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Phone</th>
                  <th className="px-3 py-2 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {donorRows.map((r, i) => (
                  <tr key={`${r.createdIso}-${i}`} className="text-white/85">
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
  )
}

function emailTooltip(r: AthleteOwnerThankYouRow): string {
  if (r.donorEmail && r.notificationEmail && r.donorEmail !== r.notificationEmail) {
    return `${r.donorEmail} · alt: ${r.notificationEmail}`
  }
  return r.donorEmail ?? r.notificationEmail ?? ""
}

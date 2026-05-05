"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"

type Props = {
  displayName: string
  athleteId: string
  /** True when athlete_fundraising_profiles row exists (required to save bio). */
  hasFundraisingProfile: boolean
  /** Linked parent or athlete account (parent_athlete_links). */
  canEdit: boolean
  initialBio: string
}

export function FundraisingAthleteMessageSection({
  displayName,
  athleteId,
  hasFundraisingProfile,
  canEdit,
  initialBio,
}: Props) {
  const router = useRouter()
  const firstName = (displayName.split(/\s+/).filter(Boolean)[0] ?? displayName).trim()
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

  const trimmed = bio.trim()
  const showPublicMessage = trimmed.length > 0

  return (
    <section className="mt-8 rounded-xl border border-[#C8A94A]/30 bg-[#0B2545]/45 px-4 py-5 sm:px-6 sm:py-6">
      <h2 className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]">
        A note from {firstName}
      </h2>

      {canEdit && hasFundraisingProfile ? (
        <>
          <p className="mt-2 text-xs leading-relaxed text-white/50">
            This message appears at the top of your gift page. You and your linked parent account can update it anytime.
          </p>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={5}
            className="mt-4 w-full resize-y rounded-lg border border-white/18 bg-[#061224] px-3 py-2.5 text-sm leading-relaxed text-white/90 placeholder:text-white/35 focus:border-[#C8A94A] focus:outline-none focus:ring-1 focus:ring-[#C8A94A]/45"
            placeholder={`Thanks for supporting my season — even a small gift helps with travel and training.`}
            maxLength={6000}
            aria-label="Message for your fundraising page"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void saveBio()}
              disabled={saving}
              className="rounded-md bg-[#C8A94A] px-4 py-2 text-sm font-bold uppercase tracking-wide text-[#061224] hover:bg-[#d4b75c] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save note"}
            </button>
            {message ? <span className="text-sm text-emerald-400/90">{message}</span> : null}
            {error ? <span className="text-sm text-red-400/90">{error}</span> : null}
          </div>
        </>
      ) : canEdit && !hasFundraisingProfile ? (
        <p className="mt-3 text-sm leading-relaxed text-white/65">
          A fundraising profile is needed to save a note here. Contact{" "}
          <a href="mailto:info@ncwrestlingunited.com" className="text-[#C8A94A] underline-offset-2 hover:underline">
            info@ncwrestlingunited.com
          </a>
          .
        </p>
      ) : showPublicMessage ? (
        <p className="mt-4 text-base leading-relaxed text-white/85">{trimmed}</p>
      ) : (
        <p className="mt-4 text-sm italic text-white/50">
          We&apos;ll share a personal note from {firstName} here when it&apos;s added — scroll down to give anytime.
        </p>
      )}
    </section>
  )
}

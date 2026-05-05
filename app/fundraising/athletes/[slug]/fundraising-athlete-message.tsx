"use client"

import { Pencil } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

type Props = {
  displayName: string
  athleteId: string
  /** True when athlete_fundraising_profiles row exists (required to save bio). */
  hasFundraisingProfile: boolean
  /** Linked parent/athlete or RecruitNC admin (`user_profiles.is_admin`). */
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
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setBio(initialBio)
  }, [initialBio])

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
      setEditing(false)
      router.refresh()
    } catch {
      setError("Network error.")
    } finally {
      setSaving(false)
    }
  }, [athleteId, bio, router])

  const cancelEdit = useCallback(() => {
    setEditing(false)
    setBio(initialBio)
    setMessage(null)
    setError(null)
  }, [initialBio])

  const trimmed = bio.trim()
  const showPublicMessage = trimmed.length > 0
  const showPencil = canEdit && hasFundraisingProfile

  return (
    <section className="mt-8 rounded-xl border border-[#C8A94A]/30 bg-[#0B2545]/45 px-4 py-5 sm:px-6 sm:py-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-[family-name:var(--font-fundraising-display)] text-xs font-bold uppercase tracking-[0.2em] text-[#C8A94A]">
          A note from {firstName}
        </h2>
        {showPencil && !editing ? (
          <button
            type="button"
            onClick={() => {
              setEditing(true)
              setMessage(null)
              setError(null)
            }}
            className="-mr-1 -mt-0.5 flex shrink-0 items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-[#C8A94A] hover:border-[#C8A94A]/50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A94A]/60"
            aria-label="Edit note from athlete"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Edit
          </button>
        ) : null}
      </div>

      {canEdit && !hasFundraisingProfile ? (
        <p className="mt-3 text-sm leading-relaxed text-white/65">
          A fundraising profile is needed to save a note here. Contact{" "}
          <a href="mailto:info@ncwrestlingunited.com" className="text-[#C8A94A] underline-offset-2 hover:underline">
            info@ncwrestlingunited.com
          </a>
          .
        </p>
      ) : showPencil && editing ? (
        <>
          <p className="mt-2 text-xs leading-relaxed text-white/50">
            This message appears at the top of your gift page. Only you, your linked family account, and NC United admins can
            change it.
          </p>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={5}
            className="mt-4 w-full resize-y rounded-lg border border-white/18 bg-[#061224] px-3 py-2.5 text-sm leading-relaxed text-white/90 placeholder:text-white/35 focus:border-[#C8A94A] focus:outline-none focus:ring-1 focus:ring-[#C8A94A]/45"
            placeholder="Thanks for supporting my season — even a small gift helps with travel and training."
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
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="rounded-md border border-white/25 px-4 py-2 text-sm font-semibold text-white/85 hover:bg-white/10 disabled:opacity-50"
            >
              Cancel
            </button>
            {message ? <span className="text-sm text-emerald-400/90">{message}</span> : null}
            {error ? <span className="text-sm text-red-400/90">{error}</span> : null}
          </div>
        </>
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

"use client"

import { useEffect, useState } from "react"
import { Search } from "lucide-react"

/**
 * The family's switch for whether this profile can be found in search engines (lib/profile-search.ts).
 * Shown only to the wrestler's own family and staff; the API checks the same.
 */
export function SearchVisibilityToggle({ athleteId, firstName, className = "" }: { athleteId: string; firstName: string; className?: string }) {
  const [hidden, setHidden] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    void fetch(`/api/athletes/${encodeURIComponent(athleteId)}/search-visibility`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { hidden?: boolean } | null) => setHidden(d ? d.hidden === true : null))
      .catch(() => setHidden(null))
  }, [athleteId])
  if (hidden === null) return null
  const flip = async () => {
    setSaving(true)
    const res = await fetch(`/api/athletes/${encodeURIComponent(athleteId)}/search-visibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: !hidden }),
    }).catch(() => null)
    if (res?.ok) setHidden(!hidden)
    setSaving(false)
  }
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#0f1c2e] p-4 text-sm text-white ${className}`}>
      <Search className="h-4 w-4 shrink-0 text-[#D3B574]" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-bold">{hidden ? `${firstName}'s profile is hidden from Google` : `College coaches can find ${firstName} on Google`}</p>
        <p className="text-white/60">
          Search engines see only the public profile: name, school, class and results. Never the photo, GPA, phone or email.
        </p>
      </div>
      <button
        type="button"
        onClick={flip}
        disabled={saving}
        className="rounded-lg border border-white/20 px-3 py-2 text-xs font-bold hover:bg-white/5 disabled:opacity-50"
      >
        {saving ? "Saving…" : hidden ? "Let coaches find it" : "Hide from Google"}
      </button>
    </div>
  )
}

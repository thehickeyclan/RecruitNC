"use client"

import { useEffect, useState } from "react"

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
    <p className={`text-xs text-muted-foreground ${className}`}>
      {hidden ? `${firstName}'s profile is hidden from Google.` : `College coaches can find ${firstName} on Google.`}{" "}
      Search engines see only name, school, class and results, never the photo, GPA, phone or email.{" "}
      <button type="button" onClick={flip} disabled={saving} className="underline hover:text-foreground disabled:opacity-50">
        {saving ? "Saving…" : hidden ? "Let coaches find it" : "Hide from Google"}
      </button>
    </p>
  )
}

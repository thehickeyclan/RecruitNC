"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { HardLink } from "@/components/hard-link"

const SIZES = ["YS", "YM", "YL", "S", "M", "L", "XL", "2XL", "3XL"]

type RosterRow = {
  id: string
  event_slug: string
  athlete_first_name: string
  athlete_last_name: string
  athlete_email: string
  parent_email: string | null
  high_school: string | null
  graduation_year: string | null
  primary_weight: string | null
  shirt_size: string | null
  singlet_size: string | null
  shorts_size: string | null
  updated_at: string | null
}

type EventData = {
  eventSlug: string
  eventName: string
  roster: RosterRow[]
}

function SizeCell({
  regId,
  field,
  value,
  onSaved,
}: {
  regId: string
  field: "shirt_size" | "singlet_size" | "shorts_size"
  value: string
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = useCallback(
    (newVal: string) => {
      setLocalValue(newVal)
      setSaving(true)
      fetch(`/api/national-team/registrations/${regId}/size/open`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newVal || null }),
      })
        .then((r) => {
          if (r.ok) onSaved()
        })
        .finally(() => setSaving(false))
    },
    [regId, field, onSaved]
  )

  return (
    <td className="py-2 px-2">
      <div className="flex items-center gap-1">
        <select
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          disabled={saving}
          className="rounded border border-gray-300 bg-white px-2 py-1 text-sm min-w-[72px]"
        >
          <option value="">—</option>
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {saving && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
      </div>
    </td>
  )
}

export default function NHSCADuals2026GearPage() {
  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetch("/api/national-team/hub/open")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load")
        return r.json()
      })
      .then((data) => setEvents(data.events ?? []))
      .catch(() => setError("Could not load roster."))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading && events.length === 0) {
    return (
      <div className="min-h-screen bg-[#0B2545] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#D3B574]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B2545] py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-white">NHSCA Duals 2026 — Gear sizes</h1>
          <HardLink
            href="/national-team"
            className="text-[#D3B574] hover:underline text-sm"
          >
            ← National Team
          </HardLink>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-4">
              <p className="text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        <Card className="border-white/20 bg-white/5 text-white">
          <CardHeader>
            <CardTitle className="text-lg">NHSCA Duals 2026</CardTitle>
            <p className="text-sm text-white/80">
              View roster and update gear sizes. No login required. Do not share this link publicly.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {events.map((ev) => (
              <div key={ev.eventSlug}>
                <h2 className="text-lg font-semibold text-[#D3B574] mb-3">{ev.eventName}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-white/20 text-white/80">
                        <th className="py-2 px-2 font-medium">Athlete</th>
                        <th className="py-2 px-2 font-medium">Parent email</th>
                        <th className="py-2 px-2 font-medium">Singlet</th>
                        <th className="py-2 px-2 font-medium">Shorts</th>
                        <th className="py-2 px-2 font-medium">Shirt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ev.roster.map((r) => (
                        <tr key={r.id} className="border-b border-white/10">
                          <td className="py-2 px-2">
                            {r.athlete_first_name} {r.athlete_last_name}
                          </td>
                          <td className="py-2 px-2 text-white/90">{r.parent_email ?? "—"}</td>
                          <SizeCell
                            regId={r.id}
                            field="singlet_size"
                            value={r.singlet_size ?? ""}
                            onSaved={load}
                          />
                          <SizeCell
                            regId={r.id}
                            field="shorts_size"
                            value={r.shorts_size ?? ""}
                            onSaved={load}
                          />
                          <SizeCell
                            regId={r.id}
                            field="shirt_size"
                            value={r.shirt_size ?? ""}
                            onSaved={load}
                          />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

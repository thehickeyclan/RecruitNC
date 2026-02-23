"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Loader2, ExternalLink } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

type AwardRow = {
  id?: string
  athlete_id?: string
  year?: number
  name?: string
  athletes?: { name: string | null } | null
}

/** RecruitNC athlete profile URL (by id). */
const profileHref = (athleteId: string) => `/unified-profile/${athleteId}`

export default function TriciaSaundersAwardPage() {
  const [rows, setRows] = useState<AwardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nameToId, setNameToId] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        setError(null)
        const [awardRes, athletesRes] = await Promise.all([
          supabase.from("tricia_saunders_award").select("id, athlete_id, year, athletes(name)").order("year", { ascending: false }),
          supabase.from("athletes").select("id, name"),
        ])
        if (cancelled) return
        if (awardRes.error) {
          if (awardRes.error.code === "42P01") {
            setError("Table tricia_saunders_award not found. Migrate from Legacy NC or create the table in Supabase.")
          } else {
            setError(awardRes.error.message)
          }
          return
        }
        const awardData = (awardRes.data ?? []) as AwardRow[]
        setRows(awardData)
        const map: Record<string, string> = {}
        for (const a of athletesRes.data ?? []) {
          const row = a as { id: string; name: string | null }
          if (row.name?.trim()) map[row.name.trim()] = row.id
        }
        setNameToId(map)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="mb-6 text-3xl font-bold text-[#13294B]">Tricia Saunders Award</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            NC Tricia Saunders Award winners
          </CardTitle>
          <CardDescription>
            Honoring outstanding female wrestlers from North Carolina.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#13294B]" />
            </div>
          ) : error ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm">
              {error}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground">No award records yet. Add data in Supabase or migrate from Legacy NC.</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((r, i) => {
                const displayName = r.athletes?.name ?? r.name ?? "—"
                const athleteId = r.athlete_id ?? (displayName !== "—" ? nameToId[displayName.trim()] : null)
                return (
                  <li key={r.id ?? i} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
                    <span className="font-medium">{displayName}</span>
                    <span className="flex items-center gap-2">
                      {r.year != null && <span className="text-muted-foreground">{r.year}</span>}
                      {athleteId ? (
                        <Button variant="outline" size="sm" asChild className="gap-1">
                          <Link href={profileHref(athleteId)}>
                            View profile <ExternalLink className="h-3 w-3" />
                          </Link>
                        </Button>
                      ) : null}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

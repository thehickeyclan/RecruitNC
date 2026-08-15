"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CalendarDays, Car, ExternalLink, Loader2, RefreshCw, Search, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Rsvp = {
  id: string
  athlete_id: string
  athlete_name: string
  weight_class: string | null
  high_school: string | null
  wrestling_club: string | null
  attending_saturday: boolean
  attending_sunday: boolean
  open_to_carpool: boolean
  created_at: string
  updated_at: string
}

const attendanceLabel = (rsvp: Rsvp) => {
  if (rsvp.attending_saturday && rsvp.attending_sunday) return "Both days"
  if (rsvp.attending_saturday) return "Saturday"
  return "Sunday"
}

export default function WeekendWarsAdminPage() {
  const [rows, setRows] = useState<Rsvp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/weekend-wars", { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Unable to load RSVPs")
      setRows(data.rsvps ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load RSVPs")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const summary = useMemo(
    () => ({
      total: rows.length,
      saturday: rows.filter((row) => row.attending_saturday).length,
      sunday: rows.filter((row) => row.attending_sunday).length,
      both: rows.filter((row) => row.attending_saturday && row.attending_sunday).length,
      carpool: rows.filter((row) => row.open_to_carpool).length,
    }),
    [rows],
  )

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return rows
    return rows.filter((row) =>
      [row.athlete_name, row.weight_class, row.high_school, row.wrestling_club]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    )
  }, [query, rows])

  return (
    <div className="min-h-screen bg-[#061427] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" className="text-white/70 hover:bg-white/10 hover:text-white" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D3B574]">August 29–30</p>
              <h1 className="mt-1 text-3xl font-black">Weekend Wars RSVPs</h1>
              <p className="mt-1 text-sm text-white/50">Member attendance, profile details, and carpool interest</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white" asChild>
              <Link href="/weekend-wars" target="_blank">
                Open form <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Total athletes", value: summary.total, icon: Users },
            { label: "Saturday", value: summary.saturday, icon: CalendarDays },
            { label: "Sunday", value: summary.sunday, icon: CalendarDays },
            { label: "Both days", value: summary.both, icon: CalendarDays },
            { label: "Open to carpool", value: summary.carpool, icon: Car },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="border-white/10 bg-[#0B1D3A] text-white">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-white/45">{label}</p>
                  <p className="mt-1 text-3xl font-black">{loading ? "—" : value}</p>
                </div>
                <Icon className="h-6 w-6 text-[#D3B574]" />
              </CardContent>
            </Card>
          ))}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">{error}</div>
        ) : null}

        <Card className="border-white/10 bg-[#0B1D3A] text-white">
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Attendance roster</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, school, club…"
                className="border-white/15 bg-white/5 pl-9 text-white placeholder:text-white/30"
              />
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loading && rows.length === 0 ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[#D3B574]" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-white/45">
                {query ? "No RSVPs match that search." : "No athletes have RSVP'd yet."}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/50">Athlete</TableHead>
                    <TableHead className="text-white/50">Weight</TableHead>
                    <TableHead className="text-white/50">High school</TableHead>
                    <TableHead className="text-white/50">Club</TableHead>
                    <TableHead className="text-white/50">Attending</TableHead>
                    <TableHead className="text-white/50">Carpool</TableHead>
                    <TableHead className="text-white/50">Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-bold text-white">{row.athlete_name}</TableCell>
                      <TableCell className="text-white/70">{row.weight_class || "—"}</TableCell>
                      <TableCell className="text-white/70">{row.high_school || "—"}</TableCell>
                      <TableCell className="text-white/70">{row.wrestling_club || "—"}</TableCell>
                      <TableCell>
                        <Badge className="bg-[#D3B574] text-[#061427] hover:bg-[#D3B574]">{attendanceLabel(row)}</Badge>
                      </TableCell>
                      <TableCell>
                        {row.open_to_carpool ? (
                          <Badge className="bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/20">Yes</Badge>
                        ) : (
                          <span className="text-white/35">No</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-white/45">
                        {new Date(row.updated_at || row.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Loader2, Trophy } from "lucide-react"
import type { BlueMember2026Row, BlueMembers2026Stats } from "@/app/api/admin/blue/members-2026/route"

const defaultStats: BlueMembers2026Stats = {
  totalMembers: 0,
  stateChamps2026: 0,
  statePlacers2026: 0,
  stateQualifiers2026: 0,
  stateChampsAllTime: 0,
  statePlacersAllTime: 0,
  stateQualifiersAllTime: 0,
  twoXStateChamps: 0,
  threeXStateChamps: 0,
  fourXStateChamps: 0,
  allAmericans: 0,
  super32Placers: 0,
  nhscaRecordWins: 0,
  nhscaRecordLosses: 0,
  super32RecordWins: 0,
  super32RecordLosses: 0,
}

const ACTIVE_GRAD_YEARS = [2030, 2029, 2028, 2027, 2026]
const PRIOR_GRAD_YEARS = [2025, 2024, 2023, 2022, 2021]

type StatsScope = "allTime" | "2026"

export default function AdminBlueMembers2026Page() {
  const [rows2026, setRows2026] = useState<BlueMember2026Row[]>([])
  const [rowsAllYears, setRowsAllYears] = useState<BlueMember2026Row[]>([])
  const [statsAllTime, setStatsAllTime] = useState<BlueMembers2026Stats>(defaultStats)
  const [stats2026, setStats2026] = useState<BlueMembers2026Stats>(defaultStats)
  const [scope, setScope] = useState<StatsScope>("allTime")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gradYears, setGradYears] = useState<number[]>(() => [...ACTIVE_GRAD_YEARS])

  const stats = scope === "allTime" ? statsAllTime : stats2026
  const rows = scope === "allTime" ? rowsAllYears : rows2026

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)
    const q = gradYears.length ? `?gradYears=${gradYears.join(",")}` : ""
    fetch(`/api/admin/blue/members-2026${q}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
          setRows2026([])
          setRowsAllYears([])
          setStatsAllTime(defaultStats)
          setStats2026(defaultStats)
        } else {
          setRows2026(data.rows2026 ?? [])
          setRowsAllYears(data.rowsAllYears ?? [])
          setStatsAllTime(data.statsAllTime ?? defaultStats)
          setStats2026(data.stats2026 ?? defaultStats)
        }
      })
      .catch(() => {
        setError("Failed to load")
        setRows2026([])
        setRowsAllYears([])
        setStatsAllTime(defaultStats)
        setStats2026(defaultStats)
      })
      .finally(() => setLoading(false))
  }, [gradYears])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleGradYear = (y: number) => {
    setGradYears((prev) =>
      prev.includes(y) ? prev.filter((yr) => yr !== y) : [...prev, y].sort((a, b) => b - a)
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/blue">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#13294B]">Blue members – 2026 NCHSAA placement</h1>
            <p className="text-sm text-gray-600">Active Blue program members (default: class of 2026 and on). Add prior years with the filter below. Data from <code className="rounded bg-gray-200 px-1">wrestling_nchsaa_results</code>.</p>
          </div>
        </div>

        <Card className="mb-6 border border-gray-200">
          <CardContent className="pt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Include graduation years</p>
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm text-gray-600">Active (2026+):</span>
              {ACTIVE_GRAD_YEARS.map((y) => (
                <label key={y} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gradYears.includes(y)}
                    onChange={() => toggleGradYear(y)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{y}</span>
                </label>
              ))}
              <span className="text-sm text-gray-400 mx-1">|</span>
              <span className="text-sm text-gray-600">Prior:</span>
              {PRIOR_GRAD_YEARS.map((y) => (
                <label key={y} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gradYears.includes(y)}
                    onChange={() => toggleGradYear(y)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{y}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {!loading && !error && (
          <>
            <div className="mb-4 flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Stats:</span>
              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setScope("allTime")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${scope === "allTime" ? "bg-[#13294B] text-white shadow" : "text-gray-600 hover:text-gray-900"}`}
                >
                  All-time
                </button>
                <button
                  type="button"
                  onClick={() => setScope("2026")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${scope === "2026" ? "bg-[#13294B] text-white shadow" : "text-gray-600 hover:text-gray-900"}`}
                >
                  This year&apos;s results
                </button>
              </div>
            </div>
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
            <Card className="border-t-4 border-t-[#03154C]">
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Blue members</p>
                <p className="text-2xl font-bold text-[#13294B]">{stats.totalMembers}</p>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-amber-500">
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{scope === "allTime" ? "State titles (all-time)" : "State champs (this year)"}</p>
                <p className="text-2xl font-bold text-amber-600">{scope === "allTime" ? stats.stateChampsAllTime : stats.stateChamps2026}</p>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-blue-500">
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{scope === "allTime" ? "State placements (all-time)" : "State placers (this year)"}</p>
                <p className="text-2xl font-bold text-blue-600">{scope === "allTime" ? stats.statePlacersAllTime : stats.statePlacers2026}</p>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-gray-500">
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{scope === "allTime" ? "State qualifiers SQ (all-time)" : "State qualifiers SQ (this year)"}</p>
                <p className="text-2xl font-bold text-gray-700">{scope === "allTime" ? stats.stateQualifiersAllTime : stats.stateQualifiers2026}</p>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-amber-400">
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">2× State champs (all-time)</p>
                <p className="text-2xl font-bold text-amber-600">{stats.twoXStateChamps}</p>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-amber-600">
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">3× State champs (all-time)</p>
                <p className="text-2xl font-bold text-amber-700">{stats.threeXStateChamps}</p>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-amber-700">
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">4× State champs (all-time)</p>
                <p className="text-2xl font-bold text-amber-800">{stats.fourXStateChamps}</p>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-purple-500">
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">NHSCA All-Americans {scope === "2026" ? "(this year)" : "(all-time)"}</p>
                <p className="text-2xl font-bold text-purple-600">{stats.allAmericans}</p>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-emerald-600">
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Super32 placers {scope === "2026" ? "(this year)" : "(all-time)"}</p>
                <p className="text-2xl font-bold text-emerald-700">{stats.super32Placers}</p>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-indigo-500">
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">NHSCA record {scope === "2026" ? "(this year)" : "(all-time)"}</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {stats.nhscaRecordWins}-{stats.nhscaRecordLosses}
                </p>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-teal-600">
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Super32 record {scope === "2026" ? "(this year)" : "(all-time)"}</p>
                <p className="text-2xl font-bold text-teal-700">
                  {stats.super32RecordWins}-{stats.super32RecordLosses}
                </p>
              </CardContent>
            </Card>
          </div>
          </>
        )}

        <Card className="border-t-4 border-t-[#03154C]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[#D3B574]" />
              Blue member list — NCHSAA {scope === "allTime" ? "all years" : "2026 only"}
            </CardTitle>
            <CardDescription>
              One row per member per weight. Placer (Champion/2nd/3rd/4th) shown when they placed; SQ when qualifier only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#13294B]" />
              </div>
            ) : error ? (
              <div className="py-6 px-4 rounded-lg bg-red-50 border border-red-200">
                <p className="font-medium text-red-800">{error}</p>
              </div>
            ) : rows.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No Blue members found, or no 2026 NCHSAA data.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Grad</TableHead>
                      <TableHead className="font-semibold">High school</TableHead>
                      <TableHead className="font-semibold">Weight</TableHead>
                      <TableHead className="font-semibold">Year</TableHead>
                      <TableHead className="font-semibold">Classification</TableHead>
                      <TableHead className="font-semibold">State weight</TableHead>
                      <TableHead className="font-semibold">Placement</TableHead>
                      <TableHead className="font-semibold">State school</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={`${r.athlete_id}-${r.state_classification}-${r.state_weight}-${r.state_year}-${i}`}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/admin/blue/members/${encodeURIComponent(r.athlete_id)}`}
                            className="text-[#13294B] hover:underline font-medium"
                          >
                            {r.member_name}
                          </Link>
                        </TableCell>
                        <TableCell>{r.grad_year ?? "—"}</TableCell>
                        <TableCell>{r.high_school}</TableCell>
                        <TableCell>{r.profile_weight}</TableCell>
                        <TableCell>{r.state_year ?? "—"}</TableCell>
                        <TableCell>{r.state_classification}</TableCell>
                        <TableCell>{r.state_weight}</TableCell>
                        <TableCell>
                          <span className={
                            r.placement === "Champion" ? "font-semibold text-amber-600" :
                            r.placement === "SQ" ? "text-gray-600" : ""
                          }>
                            {r.placement}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-600">{r.state_school}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

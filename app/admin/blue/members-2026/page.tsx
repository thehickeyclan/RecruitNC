"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Loader2, Trophy } from "lucide-react"
import type { BlueMember2026Row } from "@/app/api/admin/blue/members-2026/route"

export default function AdminBlueMembers2026Page() {
  const [rows, setRows] = useState<BlueMember2026Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/admin/blue/members-2026", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.error) {
          setError(data.error)
          setRows([])
        } else {
          setError(null)
          setRows(data.rows ?? [])
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load")
          setRows([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

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
            <p className="text-sm text-gray-600">Members (active subscription or athlete Blue flag) and their 2026 state result</p>
          </div>
        </div>

        <Card className="border-t-4 border-t-[#03154C]">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[#D3B574]" />
              Blue member list with 2026 NCHSAA placement
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
                      <TableRow key={`${r.member_name}-${r.state_classification}-${r.state_weight}-${i}`}>
                        <TableCell className="font-medium">{r.member_name}</TableCell>
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

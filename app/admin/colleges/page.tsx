"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdminHeader } from "@/components/admin-header"
import { Loader2, ArrowLeft } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { COLLEGE_DIVISION_OPTIONS } from "@/types/college"

const DIVISION_VALUES = [...COLLEGE_DIVISION_OPTIONS, ""] as const

function normalizeDivisionValue(division: string | null | undefined): string {
  if (division == null || division === "") return ""
  return DIVISION_VALUES.includes(division as any) ? division : ""
}

type CollegeRow = {
  id: string
  name: string
  division: string
  slug?: string | null
  logo_url?: string | null
  created_at?: string
  updated_at?: string
}

export default function AdminCollegesPage() {
  const [colleges, setColleges] = useState<CollegeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadColleges()
  }, [])

  async function loadColleges() {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/colleges", { cache: "no-store" })
      const data = await res.json()
      if (data.success && Array.isArray(data.colleges)) {
        setColleges(data.colleges)
      } else {
        toast({ title: "Error", description: data.error || "Failed to load colleges", variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to load colleges", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  async function updateDivision(id: string, division: string) {
    try {
      setSavingId(id)
      const res = await fetch(`/api/admin/colleges/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ division }),
      })
      const data = await res.json()
      if (data.success) {
        setColleges((prev) => prev.map((c) => (c.id === id ? { ...c, division } : c)))
        toast({ title: "Saved", description: "Division updated." })
      } else {
        toast({ title: "Error", description: data.error || "Failed to update", variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <AdminHeader />
      <h1 className="text-2xl font-bold mb-2">Colleges (divisions)</h1>
      <p className="text-sm text-muted-foreground mb-4">Set division for each college. This is the source of truth for the app.</p>
      <div className="mb-4">
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Admin
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Colleges table</CardTitle>
          <p className="text-sm text-muted-foreground">
            These rows are from the <code className="bg-muted px-1 rounded">colleges</code> table. Athletes link via{" "}
            <code className="bg-muted px-1 rounded">college_id</code>; division is shown from here everywhere in the app.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {colleges.map((college) => (
                <div
                  key={college.id}
                  className="flex flex-wrap items-center gap-4 py-3 border-b last:border-0"
                >
                  <div className="min-w-[200px] font-medium">{college.name}</div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Division</Label>
                    <Select
                      value={normalizeDivisionValue(college.division)}
                      onValueChange={(value) => updateDivision(college.id, value)}
                      disabled={savingId === college.id}
                    >
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Select division" />
                      </SelectTrigger>
                      <SelectContent>
                        {COLLEGE_DIVISION_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                        <SelectItem value="">— None —</SelectItem>
                      </SelectContent>
                    </Select>
                    {savingId === college.id && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
              {colleges.length === 0 && !loading && (
                <p className="text-muted-foreground py-8">No colleges in the table yet. Run the migration in docs/COLLEGES-MIGRATION.md.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

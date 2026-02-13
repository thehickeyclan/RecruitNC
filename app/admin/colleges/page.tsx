"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdminHeader } from "@/components/admin-header"
import { Loader2, ArrowLeft, Plus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { COLLEGE_DIVISION_OPTIONS } from "@/types/college"

const NONE_VALUE = "__none__" // Radix Select forbids value=""

function normalizeDivisionValue(division: string | null | undefined): string {
  if (division == null || division === "") return NONE_VALUE
  return COLLEGE_DIVISION_OPTIONS.includes(division as any) ? division : NONE_VALUE
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
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDivision, setNewDivision] = useState("")
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

  async function addCollege() {
    const name = newName.trim()
    if (!name) {
      toast({ title: "Error", description: "Enter a college name", variant: "destructive" })
      return
    }
    try {
      setAdding(true)
      const res = await fetch("/api/admin/colleges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, division: newDivision }),
      })
      const data = await res.json()
      if (data.success && data.college) {
        setColleges((prev) => [...prev, data.college].sort((a, b) => a.name.localeCompare(b.name)))
        setNewName("")
        setNewDivision("")
        toast({ title: "Added", description: `${name} is now in the college list and will appear in the dropdown on admin profiles.` })
      } else {
        toast({ title: "Error", description: data.error || "Failed to add college", variant: "destructive" })
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to add college", variant: "destructive" })
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <AdminHeader />
      <h1 className="text-2xl font-bold mb-2">Colleges (divisions)</h1>
      <p className="text-sm text-muted-foreground mb-4">Add colleges and set division. The list here is the same one used in the college dropdown on admin profiles (College tab).</p>
      <div className="mb-4">
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Admin
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add new college</CardTitle>
          <p className="text-sm text-muted-foreground">New colleges will appear in the College dropdown when editing athlete profiles.</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2 min-w-[200px]">
              <Label htmlFor="new-college-name">College name</Label>
              <Input
                id="new-college-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Ferrum College"
                disabled={adding}
              />
            </div>
            <div className="space-y-2 min-w-[200px]">
              <Label htmlFor="new-college-division">Division</Label>
              <Select value={newDivision || NONE_VALUE} onValueChange={(v) => setNewDivision(v === NONE_VALUE ? "" : v)} disabled={adding}>
                <SelectTrigger id="new-college-division" className="w-[220px]">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {COLLEGE_DIVISION_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                  <SelectItem value={NONE_VALUE}>— None —</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addCollege} disabled={adding || !newName.trim()}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Add college
            </Button>
          </div>
        </CardContent>
      </Card>

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
                      onValueChange={(value) => updateDivision(college.id, value === NONE_VALUE ? "" : value)}
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
                        <SelectItem value={NONE_VALUE}>— None —</SelectItem>
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

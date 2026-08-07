"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, RefreshCw, Upload, UserCheck, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type Coach = {
  id: string
  coach_name: string
  college_program: string
  state: string | null
  email: string
  mobile_phone: string | null
  attendance: string | null
  staff_count: number | null
  status: string
  source: string
  created_at: string
  registered_at: string | null
}
const STATUSES = ["contact", "invited", "registered", "confirmed", "declined"]
type RosterView = "registered" | "all" | "outreach"

function parseCsv(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line, index) => {
      const cells = line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
      if (index === 0 && cells.some((cell) => /email/i.test(cell))) return []
      const [coachName, collegeProgram, state, email, mobilePhone] = cells
      return coachName && collegeProgram && email ? [{ coachName, collegeProgram, state, email, mobilePhone }] : []
    })
}

export default function TocCollegeCoachesAdminPage() {
  const [rows, setRows] = useState<Coach[]>([])
  const [csv, setCsv] = useState("")
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [rosterView, setRosterView] = useState<RosterView>("registered")
  const load = useCallback(async () => {
    setLoading(true)
    const response = await fetch("/api/admin/toc/college-coaches")
    const payload = await response.json()
    setRows(payload.coaches ?? [])
    setLoading(false)
  }, [])
  useEffect(() => {
    void load()
  }, [load])
  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/admin/toc/college-coaches", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
    void load()
  }
  const importContacts = async () => {
    const contacts = parseCsv(csv)
    const response = await fetch("/api/admin/toc/college-coaches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contacts }),
    })
    const payload = await response.json()
    setMessage(response.ok ? `${payload.imported} contacts imported or updated.` : payload.error)
    if (response.ok) {
      setCsv("")
      void load()
    }
  }
  const registeredRows = rows.filter((row) => row.source === "registration" || Boolean(row.registered_at))
  const outreachRows = rows.filter((row) => row.source !== "registration" && !row.registered_at)
  const visibleRows = rosterView === "registered" ? registeredRows : rosterView === "outreach" ? outreachRows : rows

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/toc">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">College coaches</h1>
            <p className="text-sm text-muted-foreground">{registeredRows.length} registered · {outreachRows.length} outreach contacts</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/messaging">Open Messenger</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import coach list</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">Paste CSV in this order: coach name, college/program, state, email, mobile number. Header row is optional.</p>
          <Textarea rows={5} value={csv} onChange={(event) => setCsv(event.target.value)} placeholder={"Coach Name,College/Program,State,Email,Mobile\nJane Smith,Example College,NC,jane@example.edu,555-555-5555"} />
          <div className="mt-3 flex items-center gap-3">
            <Button size="sm" onClick={() => void importContacts()} disabled={!csv.trim()}>
              <Upload className="mr-2 h-4 w-4" />
              Import contacts
            </Button>
            {message ? <p className="text-sm">{message}</p> : null}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setRosterView("registered")}
          className={`rounded-xl border p-4 text-left transition-colors ${rosterView === "registered" ? "border-emerald-500 bg-emerald-50" : "bg-card hover:bg-muted/50"}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Form submissions</p>
              <p className="text-3xl font-bold">{registeredRows.length}</p>
              <p className="mt-1 text-sm">College coaches who registered</p>
            </div>
            <UserCheck className="h-8 w-8 text-emerald-600" />
          </div>
        </button>
        <button
          type="button"
          onClick={() => setRosterView("outreach")}
          className={`rounded-xl border p-4 text-left transition-colors ${rosterView === "outreach" ? "border-blue-500 bg-blue-50" : "bg-card hover:bg-muted/50"}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Outreach directory</p>
              <p className="text-3xl font-bold">{outreachRows.length}</p>
              <p className="mt-1 text-sm">Imported contacts who have not registered</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </button>
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">
              {rosterView === "registered" ? "Registered college coaches" : rosterView === "outreach" ? "Outreach directory" : "All college coaches"}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Showing {visibleRows.length} record{visibleRows.length === 1 ? "" : "s"}</p>
          </div>
          <div className="flex rounded-lg border p-1">
            {(["registered", "outreach", "all"] as const).map((view) => (
              <Button key={view} type="button" size="sm" variant={rosterView === view ? "default" : "ghost"} onClick={() => setRosterView(view)} className="capitalize">
                {view}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <Loader2 className="mx-auto my-10 h-7 w-7 animate-spin" />
          ) : (
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Coach</th>
                  <th className="p-3">Program</th>
                  <th className="p-3">State</th>
                  <th className="p-3">Attendance</th>
                  <th className="p-3">Staff</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visibleRows.map((row) => (
                  <tr key={row.id}>
                    <td className="p-3">
                      <p className="font-medium">{row.coach_name}</p>
                      <a className="text-xs text-blue-700 hover:underline" href={`mailto:${row.email}`}>
                        {row.email}
                      </a>
                      {row.mobile_phone ? <p className="text-xs text-muted-foreground">{row.mobile_phone}</p> : null}
                    </td>
                    <td className="p-3 font-medium">{row.college_program}</td>
                    <td className="p-3 font-semibold">{row.state ?? "—"}</td>
                    <td className="p-3 capitalize">{row.attendance?.replace("both", "Fri + Sat") ?? "—"}</td>
                    <td className="p-3">{row.staff_count ?? "—"}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${row.source === "registration" || row.registered_at ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                        {row.source === "registration" || row.registered_at ? "Form registration" : "Imported contact"}
                      </span>
                    </td>
                    <td className="p-3">
                      <Select value={row.status} onValueChange={(value) => void updateStatus(row.id, value)}>
                        <SelectTrigger className="h-8 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-muted-foreground">
                      {rosterView === "registered" ? "No college coaches have submitted the registration form yet." : "No contacts in this view."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

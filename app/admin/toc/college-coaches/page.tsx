"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, RefreshCw, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type Coach = {
  id: string
  coach_name: string
  college_program: string
  email: string
  mobile_phone: string | null
  attendance: string | null
  staff_count: number | null
  status: string
  source: string
  created_at: string
}
const STATUSES = ["contact", "invited", "registered", "confirmed", "declined"]

function parseCsv(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line, index) => {
      const cells = line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
      if (index === 0 && cells.some((cell) => /email/i.test(cell))) return []
      const [coachName, collegeProgram, email, mobilePhone] = cells
      return coachName && collegeProgram && email ? [{ coachName, collegeProgram, email, mobilePhone }] : []
    })
}

export default function TocCollegeCoachesAdminPage() {
  const [rows, setRows] = useState<Coach[]>([])
  const [csv, setCsv] = useState("")
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
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
            <p className="text-sm text-muted-foreground">{rows.length} contacts · registration and outreach roster</p>
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
          <p className="mb-3 text-sm text-muted-foreground">Paste CSV in this order: coach name, college/program, email, mobile number. Header row is optional.</p>
          <Textarea rows={5} value={csv} onChange={(event) => setCsv(event.target.value)} placeholder={"Coach Name,College/Program,Email,Mobile\nJane Smith,Example College,jane@example.edu,555-555-5555"} />
          <div className="mt-3 flex items-center gap-3">
            <Button size="sm" onClick={() => void importContacts()} disabled={!csv.trim()}>
              <Upload className="mr-2 h-4 w-4" />
              Import contacts
            </Button>
            {message ? <p className="text-sm">{message}</p> : null}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coach roster</CardTitle>
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
                  <th className="p-3">Attendance</th>
                  <th className="p-3">Staff</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="p-3">
                      <p className="font-medium">{row.coach_name}</p>
                      <a className="text-xs text-blue-700 hover:underline" href={`mailto:${row.email}`}>
                        {row.email}
                      </a>
                      {row.mobile_phone ? <p className="text-xs text-muted-foreground">{row.mobile_phone}</p> : null}
                    </td>
                    <td className="p-3 font-medium">{row.college_program}</td>
                    <td className="p-3 capitalize">{row.attendance?.replace("both", "Fri + Sat") ?? "—"}</td>
                    <td className="p-3">{row.staff_count ?? "—"}</td>
                    <td className="p-3 capitalize">{row.source}</td>
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
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

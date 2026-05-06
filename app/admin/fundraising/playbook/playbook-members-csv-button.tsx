"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"

export type PlaybookVisitRow = {
  id: string
  user_id: string
  visited_at: string
  referrer: string | null
  user_name: string | null
  user_email: string | null
  user_role: string | null
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function PlaybookMembersCsvButton({ rows }: { rows: PlaybookVisitRow[] }) {
  const csv = useMemo(() => {
    const header = ["visited_at", "user_id", "user_name", "user_email", "user_role", "referrer"]
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          csvEscape(r.visited_at),
          csvEscape(r.user_id),
          csvEscape(r.user_name ?? ""),
          csvEscape(r.user_email ?? ""),
          csvEscape(r.user_role ?? ""),
          csvEscape(r.referrer ?? ""),
        ].join(","),
      ),
    ]
    return lines.join("\n")
  }, [rows])

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `playbook-members-visits-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }}
    >
      Export CSV
    </Button>
  )
}

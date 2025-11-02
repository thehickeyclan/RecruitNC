"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

type LogItem = {
  id: string
  user_id: string
  event_type: string
  event_data: { action?: "green" | "red"; targetType?: string; targetId?: string; pageTitle?: string }
  page_url: string
  created_at: string
}

export default function ActionLogPage() {
  const supabase = createClient()
  const [items, setItems] = useState<LogItem[]>([])
  const [error, setError] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)

  async function load() {
    setLoading(true)
    setError("")
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) {
        setError("Please sign in as admin.")
        setItems([])
        return
      }
      const res = await fetch("/api/admin/action-logs", {
        headers: { authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || "Failed to load logs")
        setItems([])
        return
      }
      setItems(json.items || [])
    } catch (e: any) {
      setError(e?.message || "Network error")
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Action Logs</h1>
        <Button onClick={load} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {error && (
        <div className="mt-4 text-sm bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left border-b">
            <tr>
              <th className="py-2 pr-4">Time</th>
              <th className="py-2 pr-4">User</th>
              <th className="py-2 pr-4">Action</th>
              <th className="py-2 pr-4">Target</th>
              <th className="py-2 pr-4">Page URL</th>
              <th className="py-2 pr-4">Title</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b last:border-0">
                <td className="py-2 pr-4 whitespace-nowrap">{new Date(it.created_at).toLocaleString()}</td>
                <td className="py-2 pr-4 font-mono text-xs">{it.user_id}</td>
                <td className="py-2 pr-4">{it.event_data?.action}</td>
                <td className="py-2 pr-4">
                  {it.event_data?.targetType}/{it.event_data?.targetId}
                </td>
                <td className="py-2 pr-4 max-w-[360px] truncate">
                  <a className="underline" href={it.page_url} target="_blank" rel="noreferrer">
                    {it.page_url}
                  </a>
                </td>
                <td className="py-2 pr-4 max-w-[300px] truncate">{it.event_data?.pageTitle || ""}</td>
              </tr>
            ))}
            {items.length === 0 && !error && (
              <tr>
                <td className="py-6 text-muted-foreground" colSpan={6}>
                  No action_click rows found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}

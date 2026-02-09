"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, CheckCircle, AlertCircle, Database, ArrowLeft, List } from "lucide-react"

export default function SetupCollegeMappingsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; seeded?: number; count?: number } | null>(null)
  const [missing, setMissing] = useState<string[] | null>(null)
  const [missingLoading, setMissingLoading] = useState(false)
  const { toast } = useToast()

  async function loadMissing() {
    setMissingLoading(true)
    setMissing(null)
    try {
      const res = await fetch("/api/college-division-mappings/missing")
      const data = await res.json()
      if (res.ok) setMissing(data.missing ?? [])
      else toast({ title: "Error", description: data.error ?? "Failed to load", variant: "destructive" })
    } finally {
      setMissingLoading(false)
    }
  }

  useEffect(() => {
    loadMissing()
  }, [])

  async function runSetup() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch("/api/setup-college-mappings-table", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setResult({ success: false, message: data.error || "Request failed" })
        toast({ title: "Error", description: data.error || "Request failed", variant: "destructive" })
        return
      }
      setResult({
        success: true,
        message: data.message || "Done",
        seeded: data.seeded,
        count: data.count,
      })
      toast({ title: "Success", description: data.message })
      loadMissing()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error"
      setResult({ success: false, message: msg })
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-xl mx-auto">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-[#13294B] hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Link>

        <Card className="border-t-4 border-t-[#13294B]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-6 w-6 text-[#13294B]" />
              College division mappings
            </CardTitle>
            <CardDescription>
              Division is read <strong>only</strong> from <code className="text-xs bg-gray-100 px-1 rounded">college_division_mappings</code> — no other table, no cluster.
              Add every college that appears in commits to that one table in Supabase. Below: colleges in your DB that are missing from the table (they show as Unknown).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={runSetup}
              disabled={loading}
              className="bg-[#13294B] hover:bg-[#1a3a5c]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running…
                </>
              ) : (
                "Seed college division mappings"
              )}
            </Button>

            {result && (
              <div
                className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                  result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                }`}
              >
                {result.success ? (
                  <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">{result.message}</p>
                  {result.seeded != null && <p className="mt-1">Seeded {result.seeded} rows.</p>}
                  {result.count != null && result.seeded == null && (
                    <p className="mt-1">Table already has {result.count} rows.</p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t">
              <p className="font-medium text-gray-700 flex items-center gap-2">
                <List className="h-4 w-4" />
                Colleges in commits not in <code className="bg-gray-100 px-1 rounded">college_division_mappings</code> (add these in Supabase)
              </p>
              {missingLoading && <p className="text-sm text-gray-500 mt-2">Loading…</p>}
              {!missingLoading && missing && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded border bg-gray-50 p-2 text-sm">
                  {missing.length === 0 ? (
                    <p className="text-green-700">None — every college from athlete records is in the table.</p>
                  ) : (
                    <ul className="list-disc list-inside space-y-0.5 text-gray-700">
                      {missing.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Supabase → Table Editor → college_division_mappings → add a row for each with <code className="bg-gray-100 px-1 rounded">college_name</code> exactly as shown and <code className="bg-gray-100 px-1 rounded">division</code> = NCAA Division I, NCAA Division II, NCAA Division III, NAIA, or NJCAA.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

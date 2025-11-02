"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function RunSyncPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; rowsUpdated?: number; error?: string; hint?: string } | null>(
    null,
  )

  async function runSync() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch("/api/run-script/sync-athlete-divisions", {
        method: "POST",
      })
      const json = await res.json()
      setResult(json)
    } catch (e: any) {
      setResult({ ok: false, error: e?.message ?? "Unknown error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Sync Athlete Divisions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This updates athletes.division from logo_mappings (college) using aliases and canonicalization.
          </p>
          <div className="flex gap-3">
            <Button onClick={runSync} disabled={loading}>
              {loading ? "Running…" : "Run Sync Now"}
            </Button>
          </div>

          {result && (
            <div
              className={`mt-4 rounded-md border p-4 ${
                result.ok ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-800"
              }`}
            >
              {result.ok ? (
                <p>
                  Sync complete. Rows updated: <strong>{result.rowsUpdated ?? 0}</strong>
                </p>
              ) : (
                <>
                  <p className="font-medium">Sync failed</p>
                  {result.error && <p className="mt-1 text-sm">{result.error}</p>}
                  {result.hint && <p className="mt-2 text-xs opacity-80">{result.hint}</p>}
                  <p className="mt-2 text-xs opacity-80">
                    If the function is missing, open scripts/create-sync-function.sql in your Supabase SQL Editor, run
                    it, then click “Run Sync Now” again.
                  </p>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

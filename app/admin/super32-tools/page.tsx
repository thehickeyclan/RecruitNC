"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AdminHeader } from "@/components/admin-header"
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react"

const YEARS = [2022, 2023, 2024] as const

export default function Super32ToolsPage() {
  const [running, setRunning] = useState<number | null>(null)
  const [result, setResult] = useState<{ year: number; success: boolean; message: string } | null>(null)

  const handleReconcile = async (year: number) => {
    if (
      !confirm(
        `Nuclear reconcile ${year}: This will DELETE all Super32 rows for ${year} and re-insert only from scripts/super32-nc-records-${year}.csv. Continue?`
      )
    ) {
      return
    }

    setRunning(year)
    setResult(null)

    try {
      const res = await fetch("/api/debug/super32-nuclear-reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ year }),
      })
      const data = await res.json()

      if (res.ok) {
        setResult({
          year,
          success: true,
          message: data.message ?? `Reconciled ${data.inserted ?? 0} rows for ${year}.`,
        })
      } else {
        setResult({
          year,
          success: false,
          message: data.error ?? data.details ?? "Reconcile failed",
        })
      }
    } catch (e) {
      setResult({
        year,
        success: false,
        message: e instanceof Error ? e.message : "Request failed",
      })
    } finally {
      setRunning(null)
    }
  }

  return (
    <div className="space-y-6">
      <AdminHeader title="Super32 Data Tools" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Nuclear Reconcile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            For a chosen year, <strong>delete all</strong> Super32 rows in the DB and re-insert <strong>only</strong> from
            the verified CSV. Use this when you want the DB to match the CSV exactly — no wrong rows on kids&apos;
            profiles (e.g. Adair Panama, Aiden Gore). High school is resolved from the athletes table.
          </p>
          <div className="flex flex-wrap gap-3">
            {YEARS.map((year) => (
              <Button
                key={year}
                variant="default"
                onClick={() => handleReconcile(year)}
                disabled={running !== null}
              >
                {running === year ? "Running…" : `Reconcile ${year}`}
              </Button>
            ))}
          </div>
          {result && (
            <div
              className={`flex items-start gap-2 rounded-md p-3 text-sm ${
                result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
              }`}
            >
              {result.success ? (
                <CheckCircle className="h-5 w-5 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0" />
              )}
              <span>{result.message}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compare (before/after)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            See how the DB differs from the CSV for a year (only in CSV, only in DB, field differences):
          </p>
          <ul className="text-sm list-disc list-inside space-y-1">
            <li>
              <a href="/api/debug/compare-super32-2022" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Compare 2022
              </a>
            </li>
            <li>
              <a href="/api/debug/compare-super32-2023" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Compare 2023
              </a>
            </li>
            <li>
              <a href="/api/debug/compare-super32-2024" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Compare 2024
              </a>
            </li>
            <li>
              <a href="/api/debug/compare-super32-2025" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Compare 2025
              </a>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

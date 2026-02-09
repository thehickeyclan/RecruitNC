"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, CheckCircle, AlertCircle, Database, ArrowLeft } from "lucide-react"

export default function SetupCollegeMappingsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; seeded?: number; count?: number } | null>(null)
  const { toast } = useToast()

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
              Seed or fix the <code className="text-xs bg-gray-100 px-1 rounded">college_division_mappings</code> table so Blue alumni
              show the correct division. Safe to run more than once — when the table has data, this upserts the canonical list
              (Roanoke → DIII, Lander, Presbyterian, Gardner-Webb, etc.) so wrong divisions get corrected.
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

            <div className="mt-6 pt-4 border-t text-sm text-gray-600 space-y-2">
              <p className="font-medium text-gray-700">How to update divisions</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click the button above to apply the built-in list (fixes Roanoke, Lander, Presbyterian, Mount Union, Gardner-Webb, etc.).</li>
                <li>To fix other schools or add new ones: Supabase Dashboard → Table Editor → <code className="bg-gray-100 px-1 rounded">college_division_mappings</code>. Edit the <code className="bg-gray-100 px-1 rounded">division</code> column or add rows. Use exactly: <strong>NCAA Division I</strong>, <strong>NCAA Division II</strong>, <strong>NCAA Division III</strong>, <strong>NAIA</strong>, or <strong>NJCAA</strong>. <code className="bg-gray-100 px-1 rounded">college_name</code> should match what appears in athlete records (e.g. &quot;Gardner-Webb&quot; or &quot;Gardner Webb&quot; — add both if needed).</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

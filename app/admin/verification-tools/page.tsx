"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

export default function VerificationToolsPage() {
  const [athleteId, setAthleteId] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function resetVerification() {
    if (!athleteId.trim()) {
      toast({ title: "Athlete ID required", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/reset-athlete-verification/${encodeURIComponent(athleteId)}`, {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          title: "Reset failed",
          description:
            data?.error ||
            data?.details?.updateError ||
            data?.details?.logError ||
            "Unable to reset verification",
          variant: "destructive",
        })
        return
      }
      toast({
        title: "Verification reset",
        description: "Athlete is now unverified. Test the confirm flow as a new user.",
      })
    } catch (e: any) {
      toast({ title: "Network error", description: e?.message || "Please try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Verification Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Admin-only utility to simulate a fresh profile by clearing confirmation and un-verifying an athlete.
            </p>
            <div className="flex items-center gap-3">
              <Input
                placeholder="Athlete ID (UUID)"
                value={athleteId}
                onChange={(e) => setAthleteId(e.target.value)}
                className="flex-1"
              />
              <Button onClick={resetVerification} disabled={loading} className="bg-rose-600 hover:bg-rose-700 text-white">
                {loading ? "Resetting..." : "Reset Verification"}
              </Button>
            </div>
            {athleteId && (
              <p className="text-xs text-gray-500">
                After reset, test at{" "}
                <Link href={`/athletes/${athleteId}`} className="underline text-gray-600">
                  /athletes/{athleteId}
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>How to test like a new user</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <ol className="list-decimal pl-4 space-y-1">
              <li>Enter the Athlete ID and click “Reset Verification”.</li>
              <li>Open the athlete page. It should show as Unverified.</li>
              <li>Sign out if you’re logged in, then sign in as a test user.</li>
              <li>Click “Confirm Profile”. It should succeed and show as verified.</li>
              <li>You can always click “Request Edit” from the profile.</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

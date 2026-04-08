"use client"

import { useEffect, useState } from "react"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { HardLink } from "@/components/hard-link"
import { ArrowLeft, ClipboardCopy, Coins } from "lucide-react"

const LS_LEADERBOARD = "recruitnc_admin_fundraising_spartan2026_leaderboard"
const LS_NOTES = "recruitnc_admin_fundraising_spartan2026_notes"

export default function AdminFundraisingPage() {
  const [leaderboard, setLeaderboard] = useState("")
  const [notes, setNotes] = useState("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      setLeaderboard(localStorage.getItem(LS_LEADERBOARD) ?? "")
      setNotes(localStorage.getItem(LS_NOTES) ?? "")
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem(LS_LEADERBOARD, leaderboard)
    } catch {
      /* ignore */
    }
  }, [leaderboard, mounted])

  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem(LS_NOTES, notes)
    } catch {
      /* ignore */
    }
  }, [notes, mounted])

  const publicBase =
    typeof window !== "undefined" ? `${window.location.origin}/spartan` : "https://recruitnc.com/spartan"

  const copyTemplate = () => {
    const t = `Your personal fundraising link (share this — gifts count toward your total):\n${publicBase}?athlete=NCU-LASTNAME-YY\n\nReplace LASTNAME and YY with your grad year (two digits). Example: ${publicBase}?athlete=NCU-SMITH-28`
    void navigator.clipboard.writeText(t)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <HardLink href="/admin">
              <ArrowLeft className="h-4 w-4" />
            </HardLink>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-[#003366] md:text-3xl">
              <Coins className="h-8 w-8 text-[#C8102E]" />
              Fundraising
            </h1>
            <p className="text-muted-foreground mt-1">
              Campaign tools, Stripe export hints, and scratchpads (saved in this browser only).
            </p>
          </div>
        </div>

        <AdminHeader />

        <Tabs defaultValue="spartan-2026" className="mt-6 w-full">
          <TabsList>
            <TabsTrigger value="spartan-2026">Spartan 2026</TabsTrigger>
            <TabsTrigger value="future" disabled>
              Future campaigns
            </TabsTrigger>
          </TabsList>

          <TabsContent value="spartan-2026" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>How dollars attach to a kid</CardTitle>
                <CardDescription>
                  We do not use retail &quot;promo codes.&quot; Use a <strong>fundraising code</strong> (same format as the
                  public link): <code className="rounded bg-muted px-1">?athlete=NCU-LASTNAME-YY</code>. Stripe Checkout
                  stores it as metadata <code className="rounded bg-muted px-1">athlete_code</code> /{" "}
                  <code className="rounded bg-muted px-1">fundraising_code</code> on each payment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <ul className="list-inside list-disc space-y-2">
                  <li>
                    <strong className="text-foreground">Race donation:</strong> donor picks a distance → metadata{" "}
                    <code className="text-xs">race_entry_requested=true</code>,{" "}
                    <code className="text-xs">fundraising_type=race_donation</code>.
                  </li>
                  <li>
                    <strong className="text-foreground">Fundraising-only (no race):</strong> donor leaves distance as
                    &quot;general support&quot; → <code className="text-xs">race_entry_requested=false</code>,{" "}
                    <code className="text-xs">fundraising_type=gift_only</code> — still counts toward a kid if{" "}
                    <code className="text-xs">athlete_code</code> is set.
                  </li>
                  <li>
                    Roll up totals in Stripe: Payments → filter metadata{" "}
                    <code className="text-xs">spartan_campaign=fayetteville_2026</code> → export CSV → pivot on{" "}
                    <code className="text-xs">athlete_code</code>. (Automated leaderboard DB is a follow-up.)
                  </li>
                </ul>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={copyTemplate}>
                    <ClipboardCopy className="mr-2 h-4 w-4" />
                    Copy athlete link template
                  </Button>
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a href="/spartan" target="_blank" rel="noopener noreferrer">
                      Open public /spartan
                    </a>
                  </Button>
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a
                      href="https://dashboard.stripe.com/payments"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Stripe Payments
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leaderboard scratchpad</CardTitle>
                <CardDescription>
                  Paste totals from Excel/Stripe here for announcements (saved locally in this browser).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={leaderboard}
                  onChange={(e) => setLeaderboard(e.target.value)}
                  placeholder="e.g. NCU-JONES-26 — $1,240&#10;NCU-LEE-27 — $890&#10;..."
                  className="min-h-[180px] font-mono text-sm"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
                <CardDescription>Internal reminders, who to thank, export schedule, etc.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[120px] text-sm"
                  placeholder="Notes…"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { AdminHeader } from "@/components/admin-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { HardLink } from "@/components/hard-link"
import { ArrowLeft, ClipboardCopy, Coins, RefreshCw } from "lucide-react"

type SpartanDonationRow = {
  sessionId: string
  createdIso: string
  createdUnix: number
  amountCents: number
  currency: string
  donorEmail: string | null
  donorName: string | null
  donorListPublic: boolean
  raceParticipant: boolean
  fundraisingType: "race_donation" | "gift_only"
  athleteCode: string | null
  attribution: "athlete" | "general_nc_united"
  tierPreference: string
}

type SpartanAthleteAggregate = {
  athleteCode: string
  totalCents: number
  donationCount: number
  raceSignupCount: number
}

const LS_LEADERBOARD = "recruitnc_admin_fundraising_spartan2026_leaderboard"
const LS_NOTES = "recruitnc_admin_fundraising_spartan2026_notes"

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currency || "usd").toUpperCase(),
    }).format(cents / 100)
  } catch {
    return `$${(cents / 100).toFixed(2)}`
  }
}

export default function AdminFundraisingPage() {
  const [leaderboard, setLeaderboard] = useState("")
  const [notes, setNotes] = useState("")
  const [mounted, setMounted] = useState(false)

  const [donations, setDonations] = useState<SpartanDonationRow[] | null>(null)
  const [byAthlete, setByAthlete] = useState<SpartanAthleteAggregate[] | null>(null)
  const [generalTotalCents, setGeneralTotalCents] = useState(0)
  const [donationsLoading, setDonationsLoading] = useState(false)
  const [donationsError, setDonationsError] = useState<string | null>(null)
  const [athleteFilter, setAthleteFilter] = useState("")
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "athlete" | "amount">("date-desc")
  const [adminView, setAdminView] = useState<"all" | "byAthlete">("all")

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
    const t = `Optional /spartan bookmark (opens the page ready to give):\n${publicBase}?athlete=NCU-LASTNAME-YY\n\nReplace LASTNAME and YY with grad year (two digits). Donors search and select the athlete by name at checkout — that’s what credits the gift. Example: ${publicBase}?athlete=NCU-SMITH-28`
    void navigator.clipboard.writeText(t)
  }

  const loadDonations = async () => {
    setDonationsLoading(true)
    setDonationsError(null)
    try {
      const res = await fetch("/api/admin/spartan-donations?days=120")
      const j = (await res.json()) as {
        error?: string
        donations?: SpartanDonationRow[]
        byAthlete?: SpartanAthleteAggregate[]
        generalTotalCents?: number
      }
      if (!res.ok) throw new Error(j.error || "Could not load donations")
      setDonations(j.donations ?? [])
      setByAthlete(j.byAthlete ?? [])
      setGeneralTotalCents(typeof j.generalTotalCents === "number" ? j.generalTotalCents : 0)
    } catch (e) {
      setDonationsError(e instanceof Error ? e.message : "Load failed")
      setDonations(null)
      setByAthlete(null)
      setGeneralTotalCents(0)
    } finally {
      setDonationsLoading(false)
    }
  }

  const filteredDonations = useMemo(() => {
    const list = donations ?? []
    const q = athleteFilter.trim().toLowerCase()
    const filtered = q
      ? list.filter((d) => (d.athleteCode ?? "").toLowerCase().includes(q))
      : list
    const sorted = [...filtered]
    if (sortBy === "date-desc") sorted.sort((a, b) => b.createdUnix - a.createdUnix)
    else if (sortBy === "date-asc") sorted.sort((a, b) => a.createdUnix - b.createdUnix)
    else if (sortBy === "athlete")
      sorted.sort((a, b) => {
        const ac = (a.athleteCode ?? "").toLowerCase()
        const bc = (b.athleteCode ?? "").toLowerCase()
        if (ac !== bc) return ac.localeCompare(bc)
        return b.createdUnix - a.createdUnix
      })
    else sorted.sort((a, b) => b.amountCents - a.amountCents || b.createdUnix - a.createdUnix)
    return sorted
  }, [donations, athleteFilter, sortBy])

  const filteredTotalCents = useMemo(
    () => filteredDonations.reduce((s, d) => s + d.amountCents, 0),
    [filteredDonations],
  )

  const filteredByAthlete = useMemo(() => {
    const list = byAthlete ?? []
    const q = athleteFilter.trim().toLowerCase()
    if (!q) return list
    return list.filter((a) => a.athleteCode.toLowerCase().includes(q))
  }, [byAthlete, athleteFilter])

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
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
              Live Stripe donation list (admin), export hints, and scratchpads (saved in this browser only).
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
                  Donors credit an athlete by <strong>searching and selecting their name</strong> on the Spartan checkout
                  form (not by &quot;using a link&quot; alone). Optional bookmark URL{" "}
                  <code className="rounded bg-muted px-1">?athlete=NCU-LASTNAME-YY</code> can open the page ready to give.
                  Stripe stores <code className="rounded bg-muted px-1">athlete_code</code> /{" "}
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
                  <li>
                    <strong className="text-foreground">Who is &quot;running&quot; vs donation-only:</strong>{" "}
                    <code className="text-xs">race_entry_requested=true</code> + <code className="text-xs">tier_preference</code>{" "}
                    means they went through the <em>entry-code</em> path (intend to race).{" "}
                    <code className="text-xs">race_entry_requested=false</code> /{" "}
                    <code className="text-xs">fundraising_type=gift_only</code> means support only. RecruitNC does not know
                    who physically starts on race day — that lives with Spartan after they issue codes.
                  </li>
                </ul>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={copyTemplate}>
                    <ClipboardCopy className="mr-2 h-4 w-4" />
                    Copy bookmark template
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
                <CardTitle>Donations (Stripe)</CardTitle>
                <CardDescription>
                  Paid Checkout sessions with <code className="rounded bg-muted px-1 text-xs">spartan_campaign=fayetteville_2026</code>.
                  <strong className="text-foreground"> Race path</strong> = race / entry flow;{" "}
                  <strong className="text-foreground">Give only</strong> = no race entry.{" "}
                  <strong className="text-foreground">Public list</strong> = donor opted in to show name on the public page.
                  Use <strong className="text-foreground">By athlete</strong> for per–athlete totals.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-3">
                  <Button type="button" onClick={loadDonations} disabled={donationsLoading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${donationsLoading ? "animate-spin" : ""}`} />
                    {donations === null ? "Load donations" : "Refresh"}
                  </Button>
                  <div className="grid gap-1.5">
                    <Label htmlFor="admin-view">View</Label>
                    <select
                      id="admin-view"
                      className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
                      value={adminView}
                      onChange={(e) => setAdminView(e.target.value as "all" | "byAthlete")}
                      disabled={donations === null}
                    >
                      <option value="all">All gifts (detail)</option>
                      <option value="byAthlete">Totals by athlete</option>
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="athlete-filter">Filter by athlete code</Label>
                    <Input
                      id="athlete-filter"
                      placeholder="e.g. NCU-SMITH-28"
                      value={athleteFilter}
                      onChange={(e) => setAthleteFilter(e.target.value)}
                      className="w-[220px]"
                      disabled={donations === null}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="sort-donations">Sort</Label>
                    <select
                      id="sort-donations"
                      className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
                      value={sortBy}
                      onChange={(e) =>
                        setSortBy(e.target.value as "date-desc" | "date-asc" | "athlete" | "amount")
                      }
                      disabled={donations === null || adminView === "byAthlete"}
                    >
                      <option value="date-desc">Date (newest)</option>
                      <option value="date-asc">Date (oldest)</option>
                      <option value="athlete">Athlete code (A–Z)</option>
                      <option value="amount">Amount (high → low)</option>
                    </select>
                  </div>
                </div>
                {donationsError && (
                  <p className="text-destructive text-sm" role="alert">
                    {donationsError}
                  </p>
                )}
                {donations !== null && (
                  <p className="text-muted-foreground text-sm">
                    Showing <strong className="text-foreground">{filteredDonations.length}</strong> of{" "}
                    <strong className="text-foreground">{donations.length}</strong> payments — filtered total{" "}
                    <strong className="text-foreground">{formatMoney(filteredTotalCents, "usd")}</strong>
                  </p>
                )}
                {donations !== null && adminView === "all" && filteredDonations.length > 0 && (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Donor</TableHead>
                          <TableHead>Public list</TableHead>
                          <TableHead>Race path</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Athlete</TableHead>
                          <TableHead>Fund</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDonations.map((d) => (
                          <TableRow key={d.sessionId}>
                            <TableCell className="whitespace-nowrap font-mono text-xs">
                              {new Date(d.createdIso).toLocaleString()}
                            </TableCell>
                            <TableCell className="font-medium">{formatMoney(d.amountCents, d.currency)}</TableCell>
                            <TableCell>
                              <div className="max-w-[200px]">
                                <div className="truncate text-sm">{d.donorName ?? "—"}</div>
                                <div className="text-muted-foreground truncate text-xs">{d.donorEmail ?? "—"}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {d.donorListPublic !== false ? (
                                <Badge variant="outline" className="text-[10px]">
                                  Public
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  Anonymous
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {d.raceParticipant ? (
                                <Badge variant="default" className="text-[10px]">
                                  Race / entry
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px]">
                                  Not race path
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {d.fundraisingType === "race_donation" ? (
                                <Badge variant="outline" className="text-[10px]">
                                  Race donation
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">
                                  Give only
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{d.athleteCode ?? "—"}</TableCell>
                            <TableCell className="text-xs">
                              {d.attribution === "athlete" ? "Athlete" : "NC United (general)"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {donations !== null && adminView === "byAthlete" && byAthlete && filteredByAthlete.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-muted-foreground text-sm">
                      General fund (no athlete code) in window:{" "}
                      <strong className="text-foreground">{formatMoney(generalTotalCents, "usd")}</strong>
                    </p>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Athlete code</TableHead>
                            <TableHead>Total raised</TableHead>
                            <TableHead>Gifts</TableHead>
                            <TableHead>Race signups</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredByAthlete.map((a) => (
                            <TableRow key={a.athleteCode}>
                              <TableCell className="font-mono text-xs">{a.athleteCode}</TableCell>
                              <TableCell className="font-medium">{formatMoney(a.totalCents, "usd")}</TableCell>
                              <TableCell>{a.donationCount}</TableCell>
                              <TableCell>{a.raceSignupCount}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
                {donations !== null && adminView === "byAthlete" && byAthlete && filteredByAthlete.length === 0 && (
                  <p className="text-muted-foreground text-sm">No athlete-coded gifts in this window.</p>
                )}
                {donations !== null && donations.length === 0 && !donationsLoading && (
                  <p className="text-muted-foreground text-sm">No paid Spartan sessions in the last 120 days.</p>
                )}
                {donations !== null && donations.length > 0 && filteredDonations.length === 0 && !donationsLoading && (
                  <p className="text-muted-foreground text-sm">No rows match this athlete filter.</p>
                )}
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

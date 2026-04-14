"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2 } from "lucide-react"
import type { BlueSignupRow } from "@/app/api/admin/blue/subscriptions/route"
import { BlueAdminAuthBanner, isBlueAuthError } from "@/components/blue-admin-auth-banner"
import { HardLink } from "@/components/hard-link"

const BLUE_DATA_RETRY_MS = 2000

export default function AdminBlueRegistrationsPipelinePage() {
  const [signups, setSignups] = useState<BlueSignupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [signupFilter, setSignupFilter] = useState<"all" | "paid" | "pending">("all")
  const [signupsError, setSignupsError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [membershipsError, setMembershipsError] = useState<string | null>(null)
  const { isLoading: authLoading } = useAuth()
  const retryCountRef = useRef(0)

  const filteredSignups =
    signupFilter === "paid"
      ? signups.filter((s) => s.status === "paid")
      : signupFilter === "pending"
        ? signups.filter((s) => s.status !== "paid")
        : signups

  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    setLoadError(null)

    const load = () => {
      if (!cancelled) setLoading(true)
      fetch("/api/admin/blue/subscriptions", { credentials: "include" })
        .then((r) => {
          if (!r.ok) {
            const msg =
              r.status === 401
                ? "Not signed in."
                : r.status === 403
                  ? "Admin access required."
                  : `Could not load (${r.status}).`
            throw new Error(msg)
          }
          return r.json()
        })
        .then((data) => {
          if (cancelled) return
          if (data?.error) {
            setLoadError(data.error)
            return
          }
          setSignups(data.signups ?? [])
          setSignupsError(data.signupsError ?? null)
          setMembershipsError(data.membershipsError ?? null)
        })
        .catch((err) => {
          if (!cancelled) {
            const msg = err?.message ?? "Could not load."
            setLoadError(msg)
            setSignups([])
            if (isBlueAuthError(msg) && retryCountRef.current < 1) {
              retryCountRef.current += 1
              setTimeout(load, BLUE_DATA_RETRY_MS)
            }
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    load()
    return () => {
      cancelled = true
    }
  }, [authLoading])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#03154C]">Registration pipeline</h2>
        <p className="text-sm text-slate-600">
          Everyone who submitted the Blue registration form. Paid indicates checkout completed.
        </p>
      </div>

      {loadError && isBlueAuthError(loadError) && (
        <BlueAdminAuthBanner returnTo="/admin/blue/subscriptions/registrations" />
      )}
      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="font-medium text-red-800">Could not load data</p>
          <p className="mt-1 text-sm text-red-700">{loadError}</p>
          {(loadError === "Not signed in." || loadError?.includes("401") || loadError === "Admin access required.") && (
            <p className="mt-3">
              <a href="/auth/signin?returnTo=/admin/blue/subscriptions/registrations" className="font-medium text-[#03154C] underline">
                Sign in again
              </a>
            </p>
          )}
        </div>
      )}

      {(membershipsError || (signupsError && signupsError.includes("does not exist"))) && !loading && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800">Setup required</CardTitle>
            <CardDescription className="text-amber-700">
              Create the Blue tables in Supabase if needed. Run the SQL in the docs (Supabase → SQL Editor).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-amber-800">
            {membershipsError && <p>• {membershipsError}</p>}
            {signupsError && signupsError.includes("blue_signups") && <p>• {signupsError}</p>}
          </CardContent>
        </Card>
      )}

      <Card className="border-[#03154C]/10 shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#03154C]">All registrations</CardTitle>
          <CardDescription>Raw intake from the Blue signup flow</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#03154C]" />
              <p className="text-sm text-slate-600">Loading…</p>
            </div>
          ) : loadError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>
          ) : signupsError ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{signupsError}</div>
          ) : signups.length === 0 ? (
            <p className="py-8 text-center text-slate-500">No signups yet.</p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                <Button
                  variant={signupFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSignupFilter("all")}
                  className={signupFilter === "all" ? "bg-[#03154C] hover:bg-[#03154C]/90" : ""}
                >
                  All ({signups.length})
                </Button>
                <Button
                  variant={signupFilter === "paid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSignupFilter("paid")}
                  className={signupFilter === "paid" ? "bg-[#03154C] hover:bg-[#03154C]/90" : ""}
                >
                  Paid ({signups.filter((s) => s.status === "paid").length})
                </Button>
                <Button
                  variant={signupFilter === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSignupFilter("pending")}
                  className={signupFilter === "pending" ? "bg-[#03154C] hover:bg-[#03154C]/90" : ""}
                >
                  Pending ({signups.filter((s) => s.status !== "paid").length})
                </Button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="sticky left-0 z-10 min-w-[120px] bg-slate-50 font-semibold shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                        Athlete
                      </TableHead>
                      <TableHead>Grad year</TableHead>
                      <TableHead>High school</TableHead>
                      <TableHead>Club</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>T-shirt</TableHead>
                      <TableHead>Athlete cell</TableHead>
                      <TableHead>Parent email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Signed up</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSignups.map((s) => (
                      <TableRow key={s.id} className="hover:bg-slate-50/50">
                        <TableCell className="sticky left-0 z-10 bg-white text-sm font-medium shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                          {[s.athlete_first_name, s.athlete_last_name].filter(Boolean).join(" ") || "—"}
                        </TableCell>
                        <TableCell className="text-sm">{s.athlete_graduation_year ?? "—"}</TableCell>
                        <TableCell className="text-sm">{s.athlete_high_school || "—"}</TableCell>
                        <TableCell className="text-sm">{s.athlete_wrestling_club || "—"}</TableCell>
                        <TableCell className="text-sm">{s.athlete_weight_class || "—"}</TableCell>
                        <TableCell className="text-sm">{s.tshirt_size || "—"}</TableCell>
                        <TableCell className="text-sm">{s.athlete_cell_phone || "—"}</TableCell>
                        <TableCell className="text-sm">{s.parent_email || "—"}</TableCell>
                        <TableCell>
                          <span className={s.status === "paid" ? "font-medium text-green-700" : "font-medium text-amber-700"}>
                            {s.status === "paid" ? "Paid" : "Pending"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <HardLink href={`/admin/blue/signups/${s.id}`} className="text-sm font-medium text-[#03154C] hover:underline">
                            View details
                          </HardLink>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

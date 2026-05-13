"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { AdminHeader } from "@/components/admin-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { HardLink } from "@/components/hard-link"
import { ArrowLeft, Link2, Loader2, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type RecruitNcProfile = {
  user_id: string
  email: string | null
  guild_parent_user_id: string | null
}

type GuildParent = {
  id: string
  email: string | null
  role: string | null
}

type LinkedRosterRow = {
  userId: string
  email: string | null
  guildParentUserId: string | null
  appliedToGuildCents: number
  pendingCents: number
  appliedTransferCount: number
  pendingTransferCount: number
  failedTransferCount: number
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

export default function AdminGuildParentLinkPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [linking, setLinking] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<RecruitNcProfile[] | null>(null)
  const [guildParents, setGuildParents] = useState<GuildParent[] | null>(null)
  const [guildConfigured, setGuildConfigured] = useState<boolean | null>(null)
  const [guildLookupError, setGuildLookupError] = useState<string | null>(null)
  const [roster, setRoster] = useState<LinkedRosterRow[] | null>(null)
  const [rosterLoading, setRosterLoading] = useState(true)
  const [rosterErr, setRosterErr] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading || !user || !isAdmin) return
    let cancelled = false
    void (async () => {
      setRosterLoading(true)
      setRosterErr(null)
      try {
        const res = await fetch("/api/admin/guild-parent-linked-roster", { credentials: "include", cache: "no-store" })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error((data as { error?: string }).error || "Failed to load roster")
        }
        const rows = ((data as { roster?: LinkedRosterRow[] }).roster ?? []).slice()
        rows.sort((a, b) => {
          const d = b.appliedToGuildCents - a.appliedToGuildCents
          if (d !== 0) return d
          return (a.email ?? "").localeCompare(b.email ?? "")
        })
        if (!cancelled) setRoster(rows)
      } catch (e) {
        if (!cancelled) setRosterErr(e instanceof Error ? e.message : "Error")
      } finally {
        if (!cancelled) setRosterLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authLoading, user, isAdmin])

  const lookup = useCallback(async () => {
    const q = email.trim()
    if (!q || !q.includes("@")) {
      toast({ title: "Enter an email", variant: "destructive" })
      return
    }
    setLoading(true)
    setGuildLookupError(null)
    try {
      const res = await fetch(`/api/admin/guild-parent-link?email=${encodeURIComponent(q)}`, {
        credentials: "include",
        cache: "no-store",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "Lookup failed")
      }
      setProfiles((data as { recruitNcProfiles?: RecruitNcProfile[] }).recruitNcProfiles ?? [])
      setGuildParents((data as { guildParentUsers?: GuildParent[] }).guildParentUsers ?? [])
      setGuildConfigured(Boolean((data as { guildSupabaseConfigured?: boolean }).guildSupabaseConfigured))
      const gle = (data as { guildLookupError?: string | null }).guildLookupError
      setGuildLookupError(gle ?? null)
    } catch (e) {
      toast({
        title: "Lookup failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
      setProfiles(null)
      setGuildParents(null)
    } finally {
      setLoading(false)
    }
  }, [email, toast])

  const linkPair = useCallback(
    async (recruitNcUserId: string, guildParentUserId: string) => {
      const key = `${recruitNcUserId}:${guildParentUserId}`
      setLinking(key)
      try {
        const res = await fetch("/api/admin/guild-parent-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ recruitNcUserId, guildParentUserId }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error((data as { error?: string }).error || "Link failed")
        }
        toast({ title: "Linked", description: "guild_parent_user_id saved on RecruitNC." })
        await lookup()
        const r = await fetch("/api/admin/guild-parent-linked-roster", { credentials: "include", cache: "no-store" })
        const rd = await r.json().catch(() => ({}))
        if (r.ok) {
          const rows = ((rd as { roster?: LinkedRosterRow[] }).roster ?? []).slice()
          rows.sort((a, b) => {
            const d = b.appliedToGuildCents - a.appliedToGuildCents
            if (d !== 0) return d
            return (a.email ?? "").localeCompare(b.email ?? "")
          })
          setRoster(rows)
        }
      } catch (e) {
        toast({
          title: "Could not link",
          description: e instanceof Error ? e.message : "Error",
          variant: "destructive",
        })
      } finally {
        setLinking(null)
      }
    },
    [lookup, toast],
  )

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      window.location.href = `/auth/signin?redirectTo=${encodeURIComponent("/admin/guild-parent-link")}`
      return
    }
    if (!isAdmin) {
      window.location.href = "/"
    }
  }, [user, isAdmin, authLoading])

  if (authLoading || !user || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>
  }

  return (
    <div className="min-h-screen bg-gray-50/80">
      <AdminHeader />
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <HardLink href="/admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Admin home
            </HardLink>
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Guild parent link (email)</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Linked parents</CardTitle>
            <CardDescription>
              RecruitNC accounts with <code className="text-xs">guild_parent_user_id</code> set, and totals from{" "}
              <code className="text-xs">guild_credit_allocations</code>.{" "}
              <span className="text-[#B31B1B] font-medium">Applied</span> means the transfer reached Guild (
              <code className="text-xs">guild_applied</code>). See every row on{" "}
              <HardLink href="/admin/guild-credit-allocations" className="underline font-medium">
                Guild credit allocations
              </HardLink>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rosterErr && <p className="text-sm text-destructive mb-3">{rosterErr}</p>}
            {rosterLoading ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading roster…
              </p>
            ) : !roster || roster.length === 0 ? (
              <p className="text-sm text-muted-foreground">No linked parents yet. Use lookup below to set Guild ids.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>RecruitNC email</TableHead>
                      <TableHead>Guild parent user id</TableHead>
                      <TableHead className="text-right">Applied to Guild</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-right text-muted-foreground"># applied</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roster.map((r) => (
                      <TableRow key={r.userId}>
                        <TableCell className="font-medium">{r.email ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs break-all max-w-[220px]">
                          {r.guildParentUserId ?? "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-800 font-semibold">
                          {money(r.appliedToGuildCents)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.pendingCents)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {r.appliedTransferCount}
                          {r.failedTransferCount > 0 ? (
                            <span className="text-destructive ml-1">({r.failedTransferCount} failed)</span>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Match by email</CardTitle>
            <CardDescription>
              Finds RecruitNC <code className="text-xs">user_profiles</code> and Wrestling Guild{" "}
              <code className="text-xs">public.users</code> with the same email and{" "}
              <code className="text-xs">role = parent</code>. Linking sets{" "}
              <code className="text-xs">guild_parent_user_id</code> for Fundraise → Guild credits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="guild-link-email">Parent email (both systems)</Label>
                <Input
                  id="guild-link-email"
                  type="email"
                  placeholder="parent@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void lookup()}
                />
              </div>
              <Button type="button" onClick={() => void lookup()} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ml-2">Lookup</span>
              </Button>
            </div>

            {guildConfigured === false && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                Guild lookup is off until you set{" "}
                <span className="font-mono text-xs">GUILD_SUPABASE_URL</span> and{" "}
                <span className="font-mono text-xs">GUILD_SUPABASE_SERVICE_ROLE_KEY</span> (Wrestling Guild project
                service role) on this deployment. RecruitNC rows will still load below.
              </p>
            )}

            {profiles && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">RecruitNC</h3>
                {(profiles ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No user_profiles with that email.</p>
                ) : (
                  <ul className="text-sm border rounded-md divide-y bg-white">
                    {profiles.map((p) => (
                      <li key={p.user_id} className="px-3 py-2 space-y-1">
                        <div className="font-mono text-xs text-muted-foreground break-all">{p.user_id}</div>
                        <div>{p.email}</div>
                        <div className="text-xs">
                          Current <code>guild_parent_user_id</code>:{" "}
                          {p.guild_parent_user_id ? (
                            <span className="font-mono break-all">{p.guild_parent_user_id}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {profiles && guildParents !== null && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">Guild (parent role only)</h3>
                {guildConfigured === false ? (
                  <p className="text-sm text-muted-foreground">
                    Wrestling Guild was not queried. After you add{" "}
                    <code className="text-xs">GUILD_SUPABASE_URL</code> and{" "}
                    <code className="text-xs">GUILD_SUPABASE_SERVICE_ROLE_KEY</code> on this Vercel project and redeploy,
                    run <strong>Lookup</strong> again to load matching parent rows.
                  </p>
                ) : guildLookupError ? (
                  <p className="text-sm text-destructive">Could not query Guild: {guildLookupError}</p>
                ) : guildParents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No Guild user with <code className="text-xs">role = parent</code> for that email. If they only have
                    admin/coach, use a Guild parent account or adjust roles in Guild.
                  </p>
                ) : (
                  <ul className="text-sm border rounded-md divide-y bg-white">
                    {guildParents.map((g) => (
                      <li key={g.id} className="px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <div className="font-mono text-xs break-all">{g.id}</div>
                          <div>{g.email}</div>
                          <div className="text-xs text-muted-foreground">role: {g.role}</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(profiles ?? []).map((p) => (
                            <Button
                              key={p.user_id}
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={linking !== null}
                              onClick={() => void linkPair(p.user_id, g.id)}
                            >
                              {linking === `${p.user_id}:${g.id}` ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Link2 className="h-3 w-3" />
                              )}
                              <span className="ml-1">Link to this RecruitNC user</span>
                            </Button>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              <HardLink href="/admin/guild-credit-allocations" className="underline">
                Guild credit allocations
              </HardLink>{" "}
              (full ledger of each transfer)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import type { ReactNode } from "react"
import { notFound } from "next/navigation"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { fetchAdminCrmUserHub, type AdminCrmUserHubPayload, type CrmSection } from "@/lib/admin-crm-user-hub"
import { recordCrmHubView, fetchCrmAdminAssignees } from "@/lib/crm-hub-mutations"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { HardLink } from "@/components/hard-link"
import { CrmHubInteractive } from "@/components/admin/crm-hub-interactive"
import { ArrowLeft, AlertCircle } from "lucide-react"

export const dynamic = "force-dynamic"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function formatMoneyCents(cents: number): string {
  return `$${(Number(cents) / 100).toFixed(2)}`
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function assigneeLabelFromList(assignees: { user_id: string; label: string }[], id: string | null | undefined): string {
  if (!id) return "—"
  return assignees.find((a) => a.user_id === id)?.label ?? `${id.slice(0, 8)}…`
}

function SectionShell({
  title,
  description,
  section,
  children,
}: {
  title: string
  description?: string
  section: CrmSection<unknown>
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {!section.ok ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Could not load</AlertTitle>
            <AlertDescription className="font-mono text-xs">{section.error}</AlertDescription>
          </Alert>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

function ProfileSummary({ profile }: { profile: Record<string, unknown> | null }) {
  if (!profile) {
    return <p className="text-sm text-muted-foreground">No row in user_profiles for this account.</p>
  }
  const pick = (k: string) => {
    const v = profile[k]
    if (v === null || v === undefined || v === "") return "—"
    if (typeof v === "boolean") return v ? "Yes" : "No"
    return String(v)
  }
  const rows: [string, string][] = [
    ["full_name", pick("full_name")],
    ["email", pick("email")],
    ["role", pick("role")],
    ["cell_phone", pick("cell_phone")],
    ["is_admin", pick("is_admin")],
    ["athlete_id", pick("athlete_id")],
    ["guild_parent_user_id", pick("guild_parent_user_id")],
    ["verified_coach", pick("verified_coach")],
    ["school_id", pick("school_id")],
    ["created_at", pick("created_at")],
  ]
  return (
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex flex-col gap-0.5 border-b border-border/60 pb-2 sm:border-0 sm:pb-0">
          <dt className="text-muted-foreground font-medium">{k}</dt>
          <dd className="font-mono text-xs break-all">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function HubBody({
  payload,
  assignees,
  actorLabels,
}: {
  payload: AdminCrmUserHubPayload
  assignees: { user_id: string; label: string }[]
  actorLabels: Record<string, string>
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm space-y-2">
        <p>
          <span className="text-muted-foreground">Snapshot at:</span>{" "}
          <span className="font-mono">{formatWhen(payload.generatedAt)}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Email used for order / NT email match:</span>{" "}
          <span className="font-mono">{payload.emailUsedForLookup ?? "—"}</span>
        </p>
        {payload.crmSettings.ok && payload.crmSettings.data ? (
          <>
            <p>
              <span className="text-muted-foreground">Assigned:</span>{" "}
              {assigneeLabelFromList(assignees, payload.crmSettings.data.assigned_admin_user_id)}
            </p>
            <p>
              <span className="text-muted-foreground">Priority:</span>{" "}
              {payload.crmSettings.data.priority ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Last touched:</span>{" "}
              {formatWhen(payload.crmSettings.data.last_touched_at)}
            </p>
          </>
        ) : null}
        {!payload.crmSettings.ok ? (
          <p className="text-amber-800 dark:text-amber-200 text-xs">{payload.crmSettings.error}</p>
        ) : null}
      </div>

      <CrmHubInteractive
        contactUserId={payload.userId}
        assignees={assignees}
        settingsInitial={
          payload.crmSettings.ok
            ? {
                assigned_admin_user_id: payload.crmSettings.data?.assigned_admin_user_id ?? null,
                priority: payload.crmSettings.data?.priority ?? null,
              }
            : null
        }
      />

      <SectionShell title="Activity log" description="Hub views, notes, and triage changes (latest first)." section={payload.crmAuditRecent}>
        {payload.crmAuditRecent.ok &&
          (payload.crmAuditRecent.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Actor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payload.crmAuditRecent.data.map((ev) => (
                    <TableRow key={ev.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{formatWhen(ev.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ev.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{actorLabels[ev.actor_user_id] ?? ev.actor_user_id.slice(0, 8) + "…"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
      </SectionShell>

      <SectionShell title="Notes" description="Staff notes for this contact." section={payload.crmNotes}>
        {payload.crmNotes.ok &&
          (payload.crmNotes.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          ) : (
            <ul className="space-y-3">
              {payload.crmNotes.data.map((n) => (
                <li key={n.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-1">
                    {n.pinned ? <Badge variant="secondary">Pinned</Badge> : null}
                    <span className="font-mono">{formatWhen(n.created_at)}</span>
                    <span>by {actorLabels[n.author_user_id] ?? n.author_user_id.slice(0, 8) + "…"}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{n.body}</p>
                </li>
              ))}
            </ul>
          ))}
      </SectionShell>

      <SectionShell title="Auth (Supabase)" description="Sign-in identity — read only." section={payload.auth}>
        {payload.auth.ok && (
          <div className="space-y-2 text-sm">
            {!payload.auth.data ? (
              <p className="text-muted-foreground">No auth user returned for this id.</p>
            ) : (
              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(
                  [
                    ["Email", payload.auth.data.email],
                    ["Phone", payload.auth.data.phone],
                    ["Created", formatWhen(payload.auth.data.createdAt)],
                    ["Last sign-in", formatWhen(payload.auth.data.lastSignInAt)],
                    ["Confirmed", formatWhen(payload.auth.data.confirmedAt)],
                    ["Anonymous", payload.auth.data.isAnonymous ? "Yes" : "No"],
                  ] as const
                ).map(([label, val]) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <dt className="text-muted-foreground font-medium">{label}</dt>
                    <dd className="font-mono text-xs break-all">{val ?? "—"}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}
      </SectionShell>

      <SectionShell title="Profile" description="user_profiles row — key fields." section={payload.profile}>
        {payload.profile.ok && <ProfileSummary profile={payload.profile.data} />}
      </SectionShell>

      <SectionShell title="Linked athletes" description="parent_athlete_links → athletes." section={payload.linkedAthletes}>
        {payload.linkedAthletes.ok &&
          (payload.linkedAthletes.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">None.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Athlete</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payload.linkedAthletes.data.map((a) => (
                    <TableRow key={a.athleteId}>
                      <TableCell className="font-medium">{a.name ?? "—"}</TableCell>
                      <TableCell>{a.profileVerified ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right">
                        <HardLink href={`/view-profile?id=${encodeURIComponent(a.athleteId)}`} className="text-primary text-sm underline-offset-4 hover:underline">
                          Profile
                        </HardLink>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
      </SectionShell>

      <SectionShell title="Orders (email + account id)" description="Matches customer_email and/or recruitnc_user_id on orders when the SQL migration is applied." section={payload.orders}>
        {payload.orders.ok && (
          <div className="space-y-2">
            {payload.orders.data.note ? (
              <p className="text-sm text-amber-800 dark:text-amber-200">{payload.orders.data.note}</p>
            ) : null}
            {payload.orders.data.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">None.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payload.orders.data.rows.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">{formatWhen(o.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{o.status ?? "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{o.channel ?? "—"}</TableCell>
                        <TableCell className="text-xs">{o.matchSource ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{o.total != null ? `$${Number(o.total).toFixed(2)}` : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </SectionShell>

      <SectionShell title="Blue memberships" section={payload.blueMemberships}>
        {payload.blueMemberships.ok &&
          (payload.blueMemberships.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">None.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Athlete</TableHead>
                    <TableHead>Stripe sub</TableHead>
                    <TableHead>Started</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payload.blueMemberships.data.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <Badge variant="outline">{m.status ?? "—"}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{m.athlete_id ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[180px] truncate" title={m.stripe_subscription_id ?? ""}>
                        {m.stripe_subscription_id ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{formatWhen(m.started_at ?? m.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
      </SectionShell>

      <SectionShell title="Guild credit allocations" section={payload.guildAllocations}>
        {payload.guildAllocations.ok &&
          (payload.guildAllocations.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">None.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Athlete</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payload.guildAllocations.data.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{formatWhen(g.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{g.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{g.campaign}</TableCell>
                      <TableCell className="font-mono text-xs">{g.athlete_id}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{formatMoneyCents(g.amount_cents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
      </SectionShell>

      <SectionShell title="National team registrations" section={payload.nationalTeamRegistrations}>
        {payload.nationalTeamRegistrations.ok &&
          (payload.nationalTeamRegistrations.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">None.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Matched by</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payload.nationalTeamRegistrations.data.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.event_slug ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.status ?? "—"}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{r.matchSource}</TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{formatWhen(r.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
      </SectionShell>

      <SectionShell title="Drop-in requests" section={payload.dropInRequests}>
        {payload.dropInRequests.ok &&
          (payload.dropInRequests.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">None.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Wrestler</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payload.dropInRequests.data.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.wrestler_name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{d.payment_status ?? "—"}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{formatWhen(d.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
      </SectionShell>

      <SectionShell title="Blue signups" section={payload.blueSignups}>
        {payload.blueSignups.ok &&
          (payload.blueSignups.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">None.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Parent email</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead className="text-right">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payload.blueSignups.data.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Badge variant="outline">{s.status ?? "—"}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs break-all">{s.parent_email ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{formatWhen(s.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <HardLink href={`/admin/blue/signups/${encodeURIComponent(s.id)}`} className="text-primary text-sm underline-offset-4 hover:underline">
                          Open
                        </HardLink>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
      </SectionShell>
    </div>
  )
}

export default async function AdminUserCrmHubPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId: raw } = await params
  const userId = raw?.trim() ?? ""
  if (!UUID_REGEX.test(userId)) {
    notFound()
  }

  const gate = await requireAdmin()
  if (!gate.ok) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 md:p-8">
        <div className="mx-auto max-w-lg">
          <Card className="border-amber-500 border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-900">
                <AlertCircle className="h-5 w-5" />
                Access denied
              </CardTitle>
              <CardDescription>CRM hub is restricted to staff admins.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{gate.error}</p>
              <Button variant="outline" asChild>
                <a href="/admin/users-dashboard">Back to user management</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const admin = createAdminClient()
  const supabaseAuth = await createClient()
  const {
    data: { user: actor },
  } = await supabaseAuth.auth.getUser()

  let payload: AdminCrmUserHubPayload
  try {
    if (actor?.id) {
      await recordCrmHubView(admin, userId, actor.id)
    }
    payload = await fetchAdminCrmUserHub(admin, userId)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[admin/users/.../crm]", msg)
    return (
      <div className="min-h-screen bg-muted/30 p-4 md:p-8">
        <div className="mx-auto max-w-lg">
          <Card className="border-destructive/50 border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">Could not load hub</CardTitle>
              <CardDescription>Something went wrong building the snapshot.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-mono text-xs break-all text-muted-foreground">{msg}</p>
              <Button variant="outline" asChild>
                <a href="/admin/users-dashboard">Back to user management</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const assigneesResult = await fetchCrmAdminAssignees(admin)
  const assignees = assigneesResult.ok ? assigneesResult.rows : []

  const actorIds = new Set<string>()
  if (payload.crmAuditRecent.ok) {
    for (const ev of payload.crmAuditRecent.data) {
      actorIds.add(ev.actor_user_id)
    }
  }
  if (payload.crmNotes.ok) {
    for (const n of payload.crmNotes.data) {
      actorIds.add(n.author_user_id)
    }
  }

  const actorLabels: Record<string, string> = {}
  for (const a of assignees) {
    actorLabels[a.user_id] = a.label
  }
  if (actorIds.size > 0) {
    const { data: profs } = await admin
      .from("user_profiles")
      .select("user_id, full_name")
      .in("user_id", [...actorIds])
    for (const p of profs ?? []) {
      const row = p as { user_id: string; full_name: string | null }
      const name = (row.full_name || "").trim()
      actorLabels[row.user_id] = name || `${row.user_id.slice(0, 8)}…`
    }
  }

  const displayEmail =
    (payload.profile.ok && payload.profile.data && typeof payload.profile.data.email === "string"
      ? payload.profile.data.email
      : null) ??
    (payload.auth.ok && payload.auth.data?.email) ??
    "—"

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Button variant="outline" size="icon" asChild className="shrink-0">
              <a href="/admin/users-dashboard" aria-label="Back to user management">
                <ArrowLeft className="h-4 w-4" />
              </a>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">CRM hub</h1>
              <p className="mt-1 text-muted-foreground text-sm md:text-base">
                Read-only snapshot · <span className="font-mono">{userId}</span>
              </p>
              <p className="mt-1 text-sm">
                <span className="text-muted-foreground">Account:</span>{" "}
                <span className="font-medium">{displayEmail}</span>
              </p>
            </div>
          </div>
          <HardLink href="/admin/users-dashboard" className="text-sm text-primary underline-offset-4 hover:underline self-start sm:self-center">
            User management →
          </HardLink>
        </div>

        <HubBody payload={payload} assignees={assignees} actorLabels={actorLabels} />
      </div>
    </div>
  )
}

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
import { CrmHubLayout } from "@/components/admin/crm-hub-layout"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  AlertCircle,
  User,
  Users,
  ShoppingBag,
  ShieldCheck,
  Sparkles,
  Flag,
  Clock,
  Mail,
  Phone,
  ExternalLink,
  Building2,
  StickyNote,
} from "lucide-react"

export const dynamic = "force-dynamic"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function formatMoneyCents(cents: number): string {
  return `$${(Number(cents) / 100).toFixed(2)}`
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
  } catch {
    return iso
  }
}

function formatRelativeDay(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return formatWhen(iso)
  }
}

function assigneeLabelFromList(assignees: { user_id: string; label: string }[], id: string | null | undefined): string {
  if (!id) return "—"
  return assignees.find((a) => a.user_id === id)?.label ?? `${id.slice(0, 8)}…`
}

function matchSourceLabel(src: string | undefined): string {
  if (src === "recruitnc_user_id") return "Signed-in checkout"
  if (src === "customer_email") return "Email match"
  return "—"
}

function priorityBadgeClass(p: string | null | undefined): string {
  switch (p) {
    case "urgent":
      return "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
    case "high":
      return "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
    case "low":
      return "border-muted-foreground/25 bg-muted/50 text-muted-foreground"
    case "normal":
      return "border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-200"
    default:
      return ""
  }
}

function SectionCRM({
  title,
  description,
  icon: Icon,
  section,
  children,
}: {
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  section: CrmSection<unknown>
  children: ReactNode
}) {
  return (
    <Card className="overflow-hidden border-border/60 shadow-sm">
      <CardHeader className="border-b border-border/40 bg-gradient-to-r from-muted/40 to-transparent pb-4">
        <div className="flex items-start gap-3">
          {Icon ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
            {description ? <CardDescription className="mt-1 text-xs leading-relaxed">{description}</CardDescription> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        {!section.ok ? (
          <Alert variant="destructive" className="border-destructive/40">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Could not load this section</AlertTitle>
            <AlertDescription className="font-mono text-xs">{section.error}</AlertDescription>
          </Alert>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

function EmptyQuiet({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  )
}

function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="absolute right-3 top-3 rounded-lg bg-muted/80 p-2 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  )
}

function ProfileFields({ profile }: { profile: Record<string, unknown> | null }) {
  if (!profile) {
    return <EmptyQuiet>No RecruitNC profile row yet — data below uses auth where possible.</EmptyQuiet>
  }
  const pick = (k: string) => {
    const v = profile[k]
    if (v === null || v === undefined || v === "") return null
    if (typeof v === "boolean") return v ? "Yes" : "No"
    return String(v)
  }
  const rows: [string, string | null][] = [
    ["Full name", pick("full_name")],
    ["Email", pick("email")],
    ["Role", pick("role")],
    ["Phone", pick("cell_phone")],
    ["Platform admin", pick("is_admin")],
    ["Primary athlete ID", pick("athlete_id")],
    ["Guild parent ID", pick("guild_parent_user_id")],
    ["Verified coach", pick("verified_coach")],
    ["School ID", pick("school_id")],
    ["Profile created", pick("created_at")],
  ].filter(([, v]) => v != null && v !== "—")

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map(([label, val]) => (
        <div key={label} className="rounded-xl border border-border/50 bg-muted/15 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-sm font-medium break-words text-foreground">{val}</p>
        </div>
      ))}
    </div>
  )
}

function DataTableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <div className="overflow-x-auto">{children}</div>
    </div>
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
  const athCount = payload.linkedAthletes.ok ? payload.linkedAthletes.data.length : 0
  const ordCount = payload.orders.ok ? payload.orders.data.rows.length : 0
  const blueCount = payload.blueMemberships.ok ? payload.blueMemberships.data.length : 0
  const guildCount = payload.guildAllocations.ok ? payload.guildAllocations.data.length : 0
  const ntCount = payload.nationalTeamRegistrations.ok ? payload.nationalTeamRegistrations.data.length : 0
  const noteCount = payload.crmNotes.ok ? payload.crmNotes.data.length : 0

    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile label="Linked athletes" value={athCount} icon={Users} />
        <StatTile label="Orders (matched)" value={ordCount} icon={ShoppingBag} />
        <StatTile label="Blue memberships" value={blueCount} icon={ShieldCheck} />
        <StatTile label="Guild allocations" value={guildCount} icon={Sparkles} />
        <StatTile label="National team" value={ntCount} icon={Flag} />
        <StatTile label="Staff notes" value={noteCount} icon={StickyNote} />
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Session sync</CardTitle>
          <CardDescription>How this snapshot was resolved (for matching store & event records).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary" className="font-normal">
            Updated {formatWhen(payload.generatedAt)}
          </Badge>
          <Badge variant="outline" className="max-w-full truncate font-mono font-normal">
            {payload.emailUsedForLookup ?? "No email on file"}
          </Badge>
          {payload.crmSettings.ok && payload.crmSettings.data?.last_touched_at ? (
            <Badge variant="outline" className="font-normal">
              Last touched {formatRelativeDay(payload.crmSettings.data.last_touched_at)}
            </Badge>
          ) : null}
        </CardContent>
      </Card>

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

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCRM title="Account" description="Supabase Auth — sign-in identity (read only)." icon={User} section={payload.auth}>
          {payload.auth.ok &&
            (!payload.auth.data ? (
              <EmptyQuiet>No auth user for this id.</EmptyQuiet>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["Email", payload.auth.data.email, Mail],
                    ["Phone", payload.auth.data.phone, Phone],
                    ["Account created", formatWhen(payload.auth.data.createdAt), Clock],
                    ["Last sign-in", formatWhen(payload.auth.data.lastSignInAt), Clock],
                    ["Email confirmed", formatWhen(payload.auth.data.confirmedAt), Clock],
                  ] as const
                ).map(([label, val, Icon]) => (
                  <div key={label} className="flex gap-3 rounded-xl border border-border/50 bg-muted/10 px-3 py-3">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                      <p className="mt-0.5 text-sm break-all">{val ?? "—"}</p>
                    </div>
                  </div>
                ))}
                <div className="flex gap-3 rounded-xl border border-border/50 bg-muted/10 px-3 py-3 sm:col-span-2">
                  <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Anonymous session</p>
                    <p className="mt-0.5 text-sm">{payload.auth.data.isAnonymous ? "Yes" : "No"}</p>
                  </div>
                </div>
              </div>
            ))}
        </SectionCRM>

        <SectionCRM
          title="RecruitNC profile"
          description="Public directory / app settings for this account."
          icon={Building2}
          section={payload.profile}
        >
          {payload.profile.ok && <ProfileFields profile={payload.profile.data} />}
        </SectionCRM>
      </div>
    </>
  )

  const familySlot = (
    <>
      <SectionCRM
        title="Family — linked athletes"
        description="Who this login can manage on profile and fundraising."
        icon={Users}
        section={payload.linkedAthletes}
      >
        {payload.linkedAthletes.ok &&
          (payload.linkedAthletes.data.length === 0 ? (
            <EmptyQuiet>No athlete links on record.</EmptyQuiet>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {payload.linkedAthletes.data.map((a) => (
                <div
                  key={a.athleteId}
                  className="flex flex-col justify-between gap-3 rounded-2xl border border-border/50 bg-gradient-to-br from-card to-muted/20 p-4"
                >
                  <div>
                    <p className="font-semibold leading-tight">{a.name ?? "Athlete"}</p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">{a.athleteId}</p>
                    {a.profileVerified ? (
                      <Badge className="mt-2 bg-emerald-600/90 hover:bg-emerald-600">Verified</Badge>
                    ) : (
                      <Badge variant="secondary" className="mt-2">
                        Unverified
                      </Badge>
                    )}
                  </div>
                  <HardLink
                    href={`/view-profile?id=${encodeURIComponent(a.athleteId)}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Open public profile <ExternalLink className="h-3.5 w-3.5" />
                  </HardLink>
                </div>
              ))}
            </div>
          ))}
      </SectionCRM>

      <SectionCRM
        title="Orders"
        description="Store purchases matched by signed-in account and/or billing email."
        icon={ShoppingBag}
        section={payload.orders}
      >
        {payload.orders.ok && (
          <div className="space-y-3">
            {payload.orders.data.note ? (
              <Alert className="border-amber-500/40 bg-amber-500/5">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-900 dark:text-amber-100">Matching note</AlertTitle>
                <AlertDescription>{payload.orders.data.note}</AlertDescription>
              </Alert>
            ) : null}
            {payload.orders.data.rows.length === 0 ? (
              <EmptyQuiet>No orders matched this contact yet.</EmptyQuiet>
            ) : (
              <DataTableShell>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="font-medium">Date</TableHead>
                      <TableHead className="font-medium">Status</TableHead>
                      <TableHead className="font-medium">Channel</TableHead>
                      <TableHead className="font-medium">Match</TableHead>
                      <TableHead className="text-right font-medium">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payload.orders.data.rows.map((o) => (
                      <TableRow key={o.id} className="border-border/50">
                        <TableCell className="whitespace-nowrap text-sm">{formatWhen(o.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal capitalize">
                            {o.status ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{o.channel ?? "—"}</TableCell>
                        <TableCell className="text-sm">{matchSourceLabel(o.matchSource)}</TableCell>
                        <TableCell className="text-right text-sm font-semibold tabular-nums">
                          {o.total != null ? `$${Number(o.total).toFixed(2)}` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataTableShell>
            )}
          </div>
        )}
      </SectionCRM>

      <SectionCRM title="Blue signups" description="Simple Blue registration funnel." icon={ShieldCheck} section={payload.blueSignups}>
        {payload.blueSignups.ok &&
          (payload.blueSignups.data.length === 0 ? (
            <EmptyQuiet>No Blue signup rows matched.</EmptyQuiet>
          ) : (
            <DataTableShell>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium">Parent email</TableHead>
                    <TableHead className="font-medium">Submitted</TableHead>
                    <TableHead className="text-right font-medium">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payload.blueSignups.data.map((s) => (
                    <TableRow key={s.id} className="border-border/50">
                      <TableCell>
                        <Badge variant="secondary" className="font-normal capitalize">
                          {s.status ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px] break-all text-sm">{s.parent_email ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatWhen(s.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <HardLink
                          href={`/admin/blue/signups/${encodeURIComponent(s.id)}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary"
                        >
                          Open <ExternalLink className="h-3.5 w-3.5" />
                        </HardLink>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableShell>
          ))}
      </SectionCRM>
    </>
  )

  const programsSlot = (
    <>
      <SectionCRM title="Blue memberships" description="Subscription status per athlete." icon={ShieldCheck} section={payload.blueMemberships}>
        {payload.blueMemberships.ok &&
          (payload.blueMemberships.data.length === 0 ? (
            <EmptyQuiet>No Blue memberships for this payer.</EmptyQuiet>
          ) : (
            <DataTableShell>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium">Athlete</TableHead>
                    <TableHead className="font-medium">Stripe</TableHead>
                    <TableHead className="font-medium">Started</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payload.blueMemberships.data.map((m) => (
                    <TableRow key={m.id} className="border-border/50">
                      <TableCell>
                        <Badge variant="secondary" className="font-normal capitalize">
                          {m.status ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{m.athlete_id ?? "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate font-mono text-xs" title={m.stripe_subscription_id ?? ""}>
                        {m.stripe_subscription_id ?? "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{formatWhen(m.started_at ?? m.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableShell>
          ))}
      </SectionCRM>

      <SectionCRM title="Guild allocations" description="Credits allocated from Spartan / Guild flows." icon={Sparkles} section={payload.guildAllocations}>
        {payload.guildAllocations.ok &&
          (payload.guildAllocations.data.length === 0 ? (
            <EmptyQuiet>No Guild allocations.</EmptyQuiet>
          ) : (
            <DataTableShell>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-medium">Date</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium">Campaign</TableHead>
                    <TableHead className="font-medium">Athlete</TableHead>
                    <TableHead className="text-right font-medium">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payload.guildAllocations.data.map((g) => (
                    <TableRow key={g.id} className="border-border/50">
                      <TableCell className="whitespace-nowrap text-sm">{formatWhen(g.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {g.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{g.campaign}</TableCell>
                      <TableCell className="font-mono text-xs">{g.athlete_id}</TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">{formatMoneyCents(g.amount_cents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableShell>
          ))}
      </SectionCRM>

      <SectionCRM title="National team" description="NHSCA / national team registrations." icon={Flag} section={payload.nationalTeamRegistrations}>
        {payload.nationalTeamRegistrations.ok &&
          (payload.nationalTeamRegistrations.data.length === 0 ? (
            <EmptyQuiet>No national team registrations matched.</EmptyQuiet>
          ) : (
            <DataTableShell>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-medium">Event</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium">Matched</TableHead>
                    <TableHead className="font-medium">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payload.nationalTeamRegistrations.data.map((r) => (
                    <TableRow key={r.id} className="border-border/50">
                      <TableCell className="font-medium">{r.event_slug ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal capitalize">
                          {r.status ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.matchSource === "parent_user_id" ? "Account id" : "Email"}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{formatWhen(r.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableShell>
          ))}
      </SectionCRM>

      <SectionCRM title="Drop-ins" description="Practice drop-in requests." icon={Clock} section={payload.dropInRequests}>
        {payload.dropInRequests.ok &&
          (payload.dropInRequests.data.length === 0 ? (
            <EmptyQuiet>No drop-in requests.</EmptyQuiet>
          ) : (
            <DataTableShell>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-medium">Wrestler</TableHead>
                    <TableHead className="font-medium">Payment</TableHead>
                    <TableHead className="font-medium">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payload.dropInRequests.data.map((d) => (
                    <TableRow key={d.id} className="border-border/50">
                      <TableCell className="font-medium">{d.wrestler_name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal capitalize">
                          {d.payment_status ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatWhen(d.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableShell>
          ))}
      </SectionCRM>
    </>
  )

  const timelineSlot = (
    <>
      {!payload.crmSettings.ok ? (
        <Alert variant="warning" className="border-amber-500/40 bg-amber-500/5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Settings unavailable</AlertTitle>
          <AlertDescription className="text-sm">{payload.crmSettings.error}</AlertDescription>
        </Alert>
      ) : null}

      <SectionCRM
        title="Staff notes"
        description="Pinned notes sort to the top. Internal use only."
        icon={StickyNote}
        section={payload.crmNotes}
      >
        {payload.crmNotes.ok &&
          (payload.crmNotes.data.length === 0 ? (
            <EmptyQuiet>No notes — add one from Overview.</EmptyQuiet>
          ) : (
            <ul className="space-y-3">
              {payload.crmNotes.data.map((n) => (
                <li
                  key={n.id}
                  className="relative rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/15 p-4 shadow-sm"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {n.pinned ? (
                      <Badge className="bg-[#D3B574]/20 text-[#8a7040] hover:bg-[#D3B574]/30 dark:text-[#e8d5a8]">Pinned</Badge>
                    ) : null}
                    <span className="text-xs text-muted-foreground">{formatWhen(n.created_at)}</span>
                    <span className="text-xs text-muted-foreground">
                      · {actorLabels[n.author_user_id] ?? n.author_user_id.slice(0, 8) + "…"}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{n.body}</p>
                </li>
              ))}
            </ul>
          ))}
      </SectionCRM>

      <SectionCRM title="Activity" description="Hub views, note saves, and triage updates." icon={Clock} section={payload.crmAuditRecent}>
        {payload.crmAuditRecent.ok &&
          (payload.crmAuditRecent.data.length === 0 ? (
            <EmptyQuiet>No audit events yet.</EmptyQuiet>
          ) : (
            <div className="relative space-y-0 pl-4 before:absolute before:left-[7px] before:top-2 before:h-[calc(100%-12px)] before:w-px before:bg-border">
              {payload.crmAuditRecent.data.map((ev) => (
                <div key={ev.id} className="relative pb-6 pl-6 last:pb-0">
                  <div className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wide">
                      {ev.action.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatWhen(ev.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm">{actorLabels[ev.actor_user_id] ?? ev.actor_user_id.slice(0, 8) + "…"}</p>
                </div>
              ))}
            </div>
          ))}
      </SectionCRM>
    </>
  )

  return (
    <CrmHubLayout
      overviewSlot={overviewSlot}
      familySlot={familySlot}
      programsSlot={programsSlot}
      timelineSlot={timelineSlot}
    />
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
      <div className="admin-layout min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto flex min-h-screen max-w-lg items-center p-6">
          <Card className="w-full border-amber-500/50 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                <AlertCircle className="h-5 w-5" />
                Access denied
              </CardTitle>
              <CardDescription>CRM is restricted to staff administrators.</CardDescription>
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
      <div className="admin-layout min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto flex min-h-screen max-w-lg items-center p-6">
          <Card className="w-full border-destructive/40 shadow-lg">
            <CardHeader>
              <CardTitle>Could not load CRM</CardTitle>
              <CardDescription>Something went wrong building this contact.</CardDescription>
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

  const displayName =
    (payload.profile.ok &&
      payload.profile.data &&
      typeof payload.profile.data.full_name === "string" &&
      payload.profile.data.full_name.trim()) ||
    (displayEmail !== "—" ? displayEmail.split("@")[0] : "Contact")

  const roleLabel =
    payload.profile.ok && payload.profile.data && typeof payload.profile.data.role === "string"
      ? payload.profile.data.role.replace(/_/g, " ")
      : null

  const pri = payload.crmSettings.ok ? payload.crmSettings.data?.priority : null
  const assignedName = payload.crmSettings.ok ? assigneeLabelFromList(assignees, payload.crmSettings.data?.assigned_admin_user_id) : "—"

  return (
    <div className="admin-layout min-h-screen bg-[#f3f6fb] dark:bg-slate-950">
      <div className="border-b border-white/10 bg-gradient-to-br from-[#0a1628] via-[#0f2847] to-[#0a1628] text-white">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-1 gap-4">
              <Button
                variant="secondary"
                size="icon"
                className="h-10 w-10 shrink-0 border-0 bg-white/10 text-white hover:bg-white/20"
                asChild
              >
                <a href="/admin/users-dashboard" aria-label="Back to user management">
                  <ArrowLeft className="h-4 w-4" />
                </a>
              </Button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#D3B574]">Staff CRM</p>
                  {pri ? (
                    <Badge className={cn("border font-medium capitalize", priorityBadgeClass(pri))}>{pri}</Badge>
                  ) : null}
                  {payload.profile.ok && payload.profile.data?.is_admin ? (
                    <Badge variant="secondary" className="border-white/20 bg-white/10 text-white hover:bg-white/15">
                      Admin user
                    </Badge>
                  ) : null}
                </div>
                <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{displayName}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/80">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-[#D3B574]" />
                    {displayEmail}
                  </span>
                  {roleLabel ? (
                    <span className="inline-flex items-center gap-1.5 capitalize">
                      <User className="h-4 w-4 text-[#D3B574]" />
                      {roleLabel}
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-white/25 bg-black/20 font-mono text-[10px] text-white/90">
                    ID {userId}
                  </Badge>
                </div>
                <p className="mt-3 text-xs text-white/55">
                  Owner: <span className="text-white/85">{assignedName}</span>
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
              <HardLink
                href="/admin/users-dashboard"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                All users
              </HardLink>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
        <HubBody payload={payload} assignees={assignees} actorLabels={actorLabels} />
      </div>
    </div>
  )
}

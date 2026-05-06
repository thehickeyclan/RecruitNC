import { createAdminClient } from "@/lib/supabase/admin"
import { HardLink } from "@/components/hard-link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PlaybookMembersCsvButton, type PlaybookVisitRow } from "./playbook-members-csv-button"

function aggregateVisitsByDay(rows: PlaybookVisitRow[]): { day: string; count: number }[] {
  const m = new Map<string, number>()
  for (const r of rows) {
    const d = r.visited_at.slice(0, 10)
    m.set(d, (m.get(d) ?? 0) + 1)
  }
  return [...m.entries()]
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => (a.day < b.day ? 1 : -1))
    .slice(0, 45)
}

function rollupByUser(rows: PlaybookVisitRow[]) {
  const m = new Map<
    string,
    { user_id: string; user_name: string | null; user_email: string | null; user_role: string | null; visits: number; last: string }
  >()
  for (const r of rows) {
    const prev = m.get(r.user_id)
    const visited = r.visited_at
    if (!prev) {
      m.set(r.user_id, {
        user_id: r.user_id,
        user_name: r.user_name,
        user_email: r.user_email,
        user_role: r.user_role,
        visits: 1,
        last: visited,
      })
      continue
    }
    prev.visits += 1
    if (visited > prev.last) prev.last = visited
  }
  return [...m.values()].sort((a, b) => (a.last < b.last ? 1 : -1))
}

export default async function AdminFundraisingPlaybookMembersPage() {
  let rows: PlaybookVisitRow[] = []
  let loadError: string | null = null

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from("playbook_members_visits")
      .select("id, user_id, visited_at, referrer, user_name, user_email, user_role")
      .order("visited_at", { ascending: false })
      .limit(5000)

    if (error) {
      loadError = error.message
    } else {
      rows = (data ?? []) as PlaybookVisitRow[]
    }
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load"
  }

  const uniqueVisitors = new Set(rows.map((r) => r.user_id)).size
  const byDay = aggregateVisitsByDay(rows)
  const byUser = rollupByUser(rows)

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <HardLink href="/admin/fundraising" className="text-sm font-medium text-blue-600 underline-offset-4 hover:underline">
            ← Fundraising admin
          </HardLink>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">Playbook members · visits</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Logged views of <code className="rounded bg-muted px-1">/fundraising/playbook/members</code>. Create table via{" "}
            <code className="rounded bg-muted px-1">scripts/supabase-playbook-members-visits.sql</code> if empty or missing.
          </p>
        </div>
        <PlaybookMembersCsvButton rows={rows} />
      </div>

      {loadError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Could not load visits: {loadError}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total visits (loaded)</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{rows.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unique visitors</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{uniqueVisitors}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent days (top)</p>
          <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-sm">
            {byDay.slice(0, 7).map((d) => (
              <li key={d.day} className="flex justify-between gap-4 tabular-nums">
                <span>{d.day}</span>
                <span className="font-medium">{d.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Visitors</h2>
          <p className="text-xs text-muted-foreground">Visit counts from loaded rows (max 5,000).</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Visits</TableHead>
              <TableHead>Last visit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byUser.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No visits yet.
                </TableCell>
              </TableRow>
            ) : (
              byUser.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell>{u.user_name ?? "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate font-mono text-xs">{u.user_email ?? "—"}</TableCell>
                  <TableCell>{u.user_role ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{u.visits}</TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs">{u.last}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Recent visits</h2>
        </div>
        <div className="max-h-[480px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Referrer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 200).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs">{r.visited_at}</TableCell>
                  <TableCell className="max-w-[180px] truncate font-mono text-xs">{r.user_email ?? "—"}</TableCell>
                  <TableCell>{r.user_role ?? "—"}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{r.referrer ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

import { HardLink } from "@/components/hard-link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { listFundraisingActivationRequestsAdmin } from "@/app/actions/fundraising/fundraising-activation-actions"
import { ActivationRequestReviewButtons } from "./activation-request-review-buttons"

export default async function AdminFundraisingActivationRequestsPage() {
  const rows = await listFundraisingActivationRequestsAdmin()

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <div>
        <HardLink href="/admin/fundraising" className="text-sm font-medium text-blue-600 underline-offset-4 hover:underline">
          ← Fundraising admin
        </HardLink>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">Activation requests</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Any <strong>signed-in</strong> user can request activation from the athlete gift page — we store their{" "}
          <strong>account email</strong> and <code className="rounded bg-muted px-1">user_id</code> for your review. Approving resolves the
          athlete from the slug, creates <code className="rounded bg-muted px-1">parent_athlete_links</code> for that requester, and turns on
          checkout when possible. Reject bogus requests. Table script:{" "}
          <code className="rounded bg-muted px-1">scripts/supabase-fundraising-activation.sql</code>; email column:{" "}
          <code className="rounded bg-muted px-1">scripts/supabase-fundraising-activation-requester-email.sql</code>.
        </p>
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Created</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Requester email</TableHead>
              <TableHead>User id</TableHead>
              <TableHead>Athlete id</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No rows loaded — run the SQL script or wait for family submissions.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                    {new Date(r.created_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell>
                    <HardLink
                      href={`/fundraising/athletes/${encodeURIComponent(r.fundraising_slug)}`}
                      className="font-mono text-sm font-medium text-blue-600 underline-offset-4 hover:underline"
                    >
                      {r.fundraising_slug}
                    </HardLink>
                  </TableCell>
                  <TableCell className="max-w-[14rem] truncate text-xs text-muted-foreground">
                    {r.requester_email ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[10rem] truncate font-mono text-xs">{r.user_id}</TableCell>
                  <TableCell className="max-w-[10rem] truncate font-mono text-xs">{r.athlete_id ?? "—"}</TableCell>
                  <TableCell>
                    <span
                      className={
                        r.status === "pending"
                          ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950"
                          : r.status === "approved"
                            ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-950"
                            : "rounded-full bg-muted px-2 py-0.5 text-xs font-semibold"
                      }
                    >
                      {r.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "pending" ? (
                      <ActivationRequestReviewButtons requestId={r.id} fundraisingSlug={r.fundraising_slug} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

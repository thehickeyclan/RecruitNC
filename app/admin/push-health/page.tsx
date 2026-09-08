import Link from "next/link"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export default async function PushHealthPage() {
  const gate = await requireAdmin()
  if (!gate.ok) redirect(`/auth/signin?returnTo=${encodeURIComponent("/admin/push-health")}`)
  const admin = createAdminClient()
  const since = new Date(Date.now() - 30 * 86400000).toISOString()
  const [{ data: events }, { data: devices }, { data: sends }] = await Promise.all([
    admin.from("push_install_events").select("installation_id,event_type,permission_status,created_at").gte("created_at", since).limit(10000),
    admin.from("push_devices").select("expo_push_token,alert_toc,last_seen_at"),
    admin.from("push_notification_sends").select("id,category,title,targeted,accepted,failed,delivered,undelivered,pending,pruned,created_at").order("created_at", { ascending: false }).limit(30),
  ])

  const unique = (type?: string) => new Set((events ?? []).filter((e) => !type || e.event_type === type).map((e) => e.installation_id)).size
  const installs = unique()
  const granted = new Set((events ?? []).filter((e) => e.permission_status === "granted" || e.event_type === "permission_granted").map((e) => e.installation_id)).size
  const registered = unique("device_registered")
  const fmt = (value: number, base: number) => base ? `${value} (${Math.round(value / base * 100)}%)` : String(value)

  return <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
    <div className="mx-auto max-w-6xl space-y-8">
      <div><Link href="/admin" className="text-sm text-blue-300">← Admin</Link><h1 className="mt-3 text-3xl font-bold">iPhone push health</h1><p className="mt-2 text-slate-300">Observed app activity over the last 30 days. Apple’s App Store download total is a separate acquisition metric.</p></div>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Observed installs", installs, "Launched a telemetry-enabled build"],
          ["Permission granted", granted, fmt(granted, installs)],
          ["Registered this month", registered, fmt(registered, installs)],
          ["Active push tokens", devices?.length ?? 0, `${(devices ?? []).filter((d) => d.alert_toc).length} opted into TOC`],
        ].map(([label, value, note]) => <div key={String(label)} className="rounded-xl border border-slate-700 bg-slate-900 p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p><p className="mt-1 text-xs text-slate-400">{note}</p></div>)}
      </section>
      <div className="rounded-xl border border-amber-700/60 bg-amber-950/30 p-4 text-sm text-amber-100"><strong>App Store downloads are not push subscribers.</strong> Downloads include reinstalls and devices that never opened the app or declined notifications. Add App Store Connect API credentials before displaying Apple’s official total here.</div>
      <section><h2 className="mb-3 text-xl font-semibold">Notification sends</h2><div className="overflow-x-auto rounded-xl border border-slate-700"><table className="w-full text-left text-sm"><thead className="bg-slate-900 text-slate-300"><tr>{["Sent", "Notification", "Targeted", "Accepted", "Delivered", "Pending", "Failed", "Pruned"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{(sends ?? []).map((s) => <tr key={s.id} className="border-t border-slate-800"><td className="whitespace-nowrap p-3">{new Date(s.created_at).toLocaleString()}</td><td className="p-3"><div className="font-medium">{s.title}</div><div className="text-xs text-slate-400">{s.category}</div></td><td className="p-3">{s.targeted}</td><td className="p-3">{s.accepted}</td><td className="p-3 text-emerald-300">{s.delivered}</td><td className="p-3 text-amber-300">{s.pending}</td><td className="p-3 text-red-300">{s.failed + s.undelivered}</td><td className="p-3">{s.pruned}</td></tr>)}{!sends?.length && <tr><td colSpan={8} className="p-6 text-center text-slate-400">No instrumented sends yet.</td></tr>}</tbody></table></div></section>
    </div>
  </main>
}


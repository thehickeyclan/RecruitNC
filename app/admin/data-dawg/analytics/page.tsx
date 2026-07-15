"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { AdminHeader } from "@/components/admin-header"
import { HardLink } from "@/components/hard-link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react"
import type { AiQueryLogRow } from "@/lib/ai-query-logs"

type TimeRange = "24h" | "7d" | "30d" | "all"
type FeedbackFilter = "all" | "with_feedback" | "positive" | "negative" | "failed"

type NamedCount = { name: string; count: number }

type AnalyticsPayload = {
  ok?: boolean
  tableMissing?: boolean
  setupHint?: string | null
  timeRange: TimeRange
  sampleSize?: number
  sampleCapped?: boolean
  summary: {
    total: number
    successful: number
    failed: number
    successRate: number
    avgResponseTimeMs: number
    positiveFeedback: number
    negativeFeedback: number
    withFeedback: number
  } | null
  byHandler: NamedCount[]
  byQueryType: NamedCount[]
  byProject: NamedCount[]
  topQueries: NamedCount[]
  learningOpportunities: NamedCount[]
  logs: AiQueryLogRow[]
  total: number
  allTimeTotal?: number
  hasMore: boolean
  error?: string
}

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "all", label: "All" },
]

const FEEDBACK_FILTERS: { value: FeedbackFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "failed", label: "Failed" },
  { value: "with_feedback", label: "Feedback" },
  { value: "positive", label: "Positive" },
  { value: "negative", label: "Negative" },
]

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

function formatMs(ms: number) {
  if (!ms || !Number.isFinite(ms)) return "—"
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${ms}ms`
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  )
}

function RankList({
  title,
  items,
  empty,
  mono,
}: {
  title: string
  items: NamedCount[]
  empty: string
  mono?: boolean
}) {
  const max = items[0]?.count ?? 1
  return (
    <section className="rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      </div>
      <div className="divide-y divide-zinc-100">
        {items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-500">{empty}</p>
        ) : (
          items.map((item) => (
            <div key={item.name} className="relative px-4 py-2.5">
              <div
                className="pointer-events-none absolute inset-y-0 left-0 bg-zinc-50"
                style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }}
                aria-hidden
              />
              <div className="relative flex items-center justify-between gap-3">
                <span
                  className={`truncate text-sm text-zinc-800 ${mono ? "font-mono text-[12px]" : ""}`}
                  title={item.name}
                >
                  {mono ? item.name.replace(/_/g, " ") : item.name}
                </span>
                <span className="shrink-0 text-xs font-medium tabular-nums text-zinc-500">{item.count}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

export default function DataDawgAnalyticsPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth()
  const [timeRange, setTimeRange] = useState<TimeRange>("all")
  const [feedback, setFeedback] = useState<FeedbackFilter>("all")
  const [data, setData] = useState<AnalyticsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (opts?: { append?: boolean; currentLen?: number }) => {
      const append = Boolean(opts?.append)
      if (append) setLoadingMore(true)
      else {
        setLoading(true)
        setError(null)
      }
      try {
        const offset = append ? opts?.currentLen ?? 0 : 0
        const qs = new URLSearchParams({
          timeRange,
          feedback,
          limit: "50",
          offset: String(offset),
        })
        const res = await fetch(`/api/admin/data-dawg/analytics?${qs}`, {
          cache: "no-store",
          credentials: "include",
        })
        const json = (await res.json().catch(() => ({}))) as AnalyticsPayload & { error?: string }
        if (!res.ok) {
          throw new Error(json.error || "Failed to load analytics")
        }
        if (append) {
          setData((prev) =>
            prev
              ? {
                  ...json,
                  logs: [...prev.logs, ...(json.logs ?? [])],
                }
              : json,
          )
        } else {
          setData(json)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error")
        if (!append) setData(null)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [timeRange, feedback],
  )

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      window.location.href = `/auth/signin?redirectTo=${encodeURIComponent("/admin/data-dawg/analytics")}`
      return
    }
    if (!isAdmin) {
      window.location.href = "/"
      return
    }
    void load()
  }, [user, isAdmin, authLoading, load])

  const summary = data?.summary
  const logs = data?.logs ?? []

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900">
      <AdminHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <HardLink
              href="/admin"
              className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Admin
            </HardLink>
            <h1 className="text-2xl font-semibold tracking-tight">Data Dawg Analytics</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Every query — success, latency, handlers, and learning opportunities.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <HardLink
                href="/admin/data-dawg/analytics"
                className="rounded-md bg-zinc-900 px-2.5 py-1 font-medium text-white"
              >
                Analytics
              </HardLink>
              <HardLink
                href="/admin/data-dawg/feedback"
                className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Feedback queue
              </HardLink>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5">
              {TIME_RANGES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTimeRange(t.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    timeRange === t.value
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 border-zinc-200 bg-white"
              onClick={() => void load()}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {data?.tableMissing ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-6">
            <h2 className="text-sm font-semibold text-amber-950">Setup required</h2>
            <p className="mt-2 text-sm text-amber-900/80">
              The <code className="text-xs">ai_query_logs</code> table is missing. Run{" "}
              <code className="text-xs">scripts/ai-query-logs-table.sql</code> in the Supabase SQL Editor,
              then ask Data Dawg anything and refresh.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-md border border-amber-200/80 bg-white p-3 text-xs text-zinc-700 whitespace-pre-wrap">
              {data.setupHint || "scripts/ai-query-logs-table.sql"}
            </pre>
          </div>
        ) : null}

        {!data?.tableMissing && summary && summary.total === 0 ? (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-5 py-5 text-sm text-amber-950">
            <p className="font-semibold">No queries in this time range ({timeRange}).</p>
            {(data.allTimeTotal ?? 0) > 0 ? (
              <p className="mt-2 text-amber-900/90">
                There are <strong>{data.allTimeTotal}</strong> all-time log rows — switch the filter to{" "}
                <button
                  type="button"
                  className="underline font-semibold"
                  onClick={() => setTimeRange("all")}
                >
                  All
                </button>
                .
              </p>
            ) : (
              <div className="mt-2 space-y-2 text-amber-900/90">
                <p>
                  The table exists but has <strong>0</strong> rows. Inserts were failing with an ON CONFLICT
                  error until the schema fix. Do this:
                </p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>
                    Run <code className="text-xs bg-white px-1 rounded">scripts/ai-query-logs-table.sql</code>{" "}
                    in Supabase (adds PK + unique message_id).
                  </li>
                  <li>Ask Data Dawg any question on the live site.</li>
                  <li>Click refresh on this page.</li>
                </ol>
                <p className="text-xs text-amber-800/80">
                  API status: ok · allTimeTotal={data.allTimeTotal ?? 0} · rangeTotal={summary.total}
                </p>
              </div>
            )}
          </div>
        ) : null}

        {loading && !data ? (
          <div className="flex items-center gap-2 py-20 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading analytics…
          </div>
        ) : null}

        {summary ? (
          <>
            <div className="mb-6 grid grid-cols-2 gap-6 rounded-lg border border-zinc-200 bg-white px-5 py-5 sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Queries" value={summary.total.toLocaleString()} />
              <Stat
                label="Success"
                value={`${summary.successRate.toFixed(1)}%`}
                hint={`${summary.successful.toLocaleString()} ok`}
              />
              <Stat label="Failed" value={summary.failed.toLocaleString()} />
              <Stat label="Avg latency" value={formatMs(summary.avgResponseTimeMs)} />
              <Stat label="Positive" value={String(summary.positiveFeedback)} />
              <Stat label="Negative" value={String(summary.negativeFeedback)} />
            </div>

            {data?.sampleCapped ? (
              <p className="mb-4 text-xs text-zinc-500">
                Distribution charts use the latest {data.sampleSize?.toLocaleString()} queries in this range
                (totals above are exact).
              </p>
            ) : null}

            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <RankList title="Handlers" items={data?.byHandler ?? []} empty="No handler data yet" mono />
              <RankList title="Query types" items={data?.byQueryType ?? []} empty="No query types yet" mono />
              <RankList title="Projects" items={data?.byProject ?? []} empty="No project data yet" />
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <RankList title="Top queries" items={data?.topQueries ?? []} empty="No queries yet" />
              <RankList
                title="Learning opportunities"
                items={data?.learningOpportunities ?? []}
                empty="No failures or fallbacks in this range"
              />
            </div>

            <section className="rounded-lg border border-zinc-200 bg-white">
              <div className="flex flex-col gap-3 border-b border-zinc-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">Query log</h2>
                  <p className="text-xs text-zinc-500">
                    Showing {logs.length.toLocaleString()} of {data?.total.toLocaleString() ?? 0}
                  </p>
                </div>
                <div className="inline-flex flex-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
                  {FEEDBACK_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFeedback(f.value)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        feedback === f.value
                          ? "bg-white text-zinc-900 shadow-sm"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-zinc-100">
                {logs.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-zinc-500">
                    No queries in this range. Ask Data Dawg something to start the log.
                  </p>
                ) : (
                  logs.map((log) => (
                    <article key={log.id} className="px-4 py-3.5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-900">{log.query}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                log.success === false
                                  ? "bg-red-50 text-red-700"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {log.success === false ? "Failed" : "Ok"}
                            </span>
                            {log.project ? (
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                                {log.project}
                              </span>
                            ) : null}
                            {log.handler_name ? (
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[10px] text-zinc-600">
                                {log.handler_name.replace(/_/g, " ")}
                              </span>
                            ) : null}
                            {log.query_type ? (
                              <span className="rounded-full border border-zinc-200 px-2 py-0.5 font-mono text-[10px] text-zinc-500">
                                {log.query_type}
                              </span>
                            ) : null}
                            {log.response_time_ms != null ? (
                              <span className="text-[11px] tabular-nums text-zinc-400">
                                {formatMs(log.response_time_ms)}
                              </span>
                            ) : null}
                            {log.feedback === "positive" ? (
                              <span className="text-[11px] text-emerald-600">Positive</span>
                            ) : null}
                            {log.feedback === "negative" ? (
                              <span className="text-[11px] text-red-600">Negative</span>
                            ) : null}
                          </div>
                          {log.error_message ? (
                            <p className="mt-2 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-800">
                              {log.error_message}
                            </p>
                          ) : null}
                          {log.response && !log.error_message ? (
                            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500">{log.response}</p>
                          ) : null}
                        </div>
                        <time className="shrink-0 text-[11px] tabular-nums text-zinc-400">
                          {formatWhen(log.timestamp)}
                        </time>
                      </div>
                    </article>
                  ))
                )}
              </div>

              {data?.hasMore ? (
                <div className="border-t border-zinc-100 px-4 py-3 text-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-zinc-200"
                    disabled={loadingMore}
                    onClick={() => void load({ append: true, currentLen: logs.length })}
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Loading…
                      </>
                    ) : (
                      "Load more"
                    )}
                  </Button>
                </div>
              ) : null}
            </section>
          </>
        ) : null}
      </main>
    </div>
  )
}

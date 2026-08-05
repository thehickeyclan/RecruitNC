"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, Check, Copy, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

type Migration = {
  file: string
  title: string
  breaksWithout: string
  state: "applied" | "pending" | "unknown"
  missingColumns: string[]
  detail: string | null
  sql: string | null
  sqlPath: string
}

export function PendingMigrations() {
  const [migrations, setMigrations] = useState<Migration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedFile, setCopiedFile] = useState<string | null>(null)
  const [openFile, setOpenFile] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const response = await fetch("/api/admin/migrations", { credentials: "include", cache: "no-store" })
    const data = await response.json().catch(() => ({}))
    setLoading(false)
    if (!response.ok) {
      setError(data.error ?? "Unable to check the database.")
      return
    }
    setError(null)
    setMigrations(data.migrations ?? [])
    // A pending one is the reason you are here — open it rather than making you hunt.
    const firstPending = (data.migrations ?? []).find((m: Migration) => m.state === "pending")
    setOpenFile(firstPending?.file ?? null)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function copy(migration: Migration) {
    if (!migration.sql) return
    await navigator.clipboard.writeText(migration.sql)
    setCopiedFile(migration.file)
    window.setTimeout(() => setCopiedFile(null), 2500)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-sm border border-white/10 bg-[#071427]/70 p-6 text-white/70">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking the database…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-sm border border-red-400/40 bg-red-500/10 p-5 text-red-100">
        <h3 className="font-black">Unable to check the database</h3>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    )
  }

  const pending = migrations.filter((m) => m.state === "pending")

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {pending.length ? (
          <p className="flex items-center gap-2 font-bold text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            {pending.length} {pending.length === 1 ? "script has" : "scripts have"} not been run yet
          </p>
        ) : (
          <p className="flex items-center gap-2 font-bold text-emerald-200">
            <Check className="h-4 w-4" />
            The database is up to date
          </p>
        )}
        <Button
          variant="outline"
          onClick={() => void load()}
          className="rounded-sm border-white/15 bg-white/5 text-white hover:bg-white/10"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Re-check
        </Button>
      </div>

      <div className="space-y-2">
        {migrations.map((migration) => {
          const open = openFile === migration.file
          const isPending = migration.state === "pending"
          return (
            <div
              key={migration.file}
              className={`rounded-sm border bg-[#071427]/70 ${
                isPending ? "border-amber-400/40" : "border-white/10"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenFile(open ? null : migration.file)}
                className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-white/5"
              >
                <div className="min-w-0">
                  <div className="font-bold text-white">{migration.title}</div>
                  <div className="mt-0.5 text-sm text-white/45">{migration.sqlPath}</div>
                  {isPending ? (
                    <p className="mt-2 text-sm text-amber-100/90">{migration.breaksWithout}</p>
                  ) : null}
                  {migration.detail ? <p className="mt-1 text-xs text-white/40">{migration.detail}</p> : null}
                </div>
                <span
                  className={`shrink-0 rounded-sm px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
                    migration.state === "applied"
                      ? "bg-emerald-500/15 text-emerald-200"
                      : migration.state === "pending"
                        ? "bg-amber-500/20 text-amber-100"
                        : "bg-white/10 text-white/50"
                  }`}
                >
                  {migration.state === "applied" ? "Done" : migration.state === "pending" ? "Run this" : "Unknown"}
                </span>
              </button>

              {open ? (
                <div className="border-t border-white/10 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={() => void copy(migration)}
                      disabled={!migration.sql}
                      className="rounded-sm bg-[#CC0000] text-white hover:bg-[#a80000]"
                    >
                      {copiedFile === migration.file ? (
                        <Check className="mr-2 h-4 w-4" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}
                      {copiedFile === migration.file ? "Copied — paste into Supabase" : "Copy the SQL"}
                    </Button>
                    <a
                      href="https://supabase.com/dashboard/project/_/sql/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-[#D7B968] hover:underline"
                    >
                      Open the Supabase SQL editor →
                    </a>
                  </div>

                  {migration.sql ? (
                    <pre className="mt-3 max-h-80 overflow-auto rounded-sm bg-[#020b18] p-3 text-xs leading-5 text-white/70">
                      {migration.sql}
                    </pre>
                  ) : (
                    <p className="mt-3 text-sm text-white/50">
                      The file could not be read on the server. It is in the repo at {migration.sqlPath}.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <p className="text-xs leading-5 text-white/35">
        Each entry is checked against the live database, so this reflects what is actually there. Re-running a script
        is safe — they are all written to be repeatable.
      </p>
    </div>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"

/**
 * Coach logos - every college coach's program beside the exact logo Coach Home shows them.
 *
 * Look at this before any email goes to coaches. A logo is shown only when it is the program's own
 * upload or the site's logo for the same school; anything else is blank. What this page is for is
 * the case code cannot catch: the right name on the wrong picture.
 */
type Row = {
  schoolId: string
  name: string
  coaches: Array<{ name: string; email: string | null; joined: string }>
  logo: { url: string | null; source: "uploaded" | "matched" | "none" }
}

const SOURCE = { uploaded: "Program's own upload", matched: "Site logo for this school", none: "No logo" } as const

export default function CoachLogosPage() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [unattached, setUnattached] = useState<Row["coaches"]>([])
  const [error, setError] = useState<string | null>(null)
  const [show, setShow] = useState<"all" | "logo" | "none">("all")
  const [busy, setBusy] = useState<string | null>(null)

  const load = () =>
    fetch("/api/admin/coach-logos", { credentials: "include" })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(body.error ?? "Could not load.")
        setRows(body.programs ?? [])
        setUnattached(body.unattached ?? [])
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load."))
  useEffect(() => {
    void load()
  }, [])

  const removeUpload = async (row: Row) => {
    if (!window.confirm(`Remove the uploaded logo for ${row.name}? Its coaches will see the site's logo for that school, or none.`)) return
    setBusy(row.schoolId)
    try {
      await fetch("/api/admin/coach-logos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ schoolId: row.schoolId, action: "remove-upload" }),
      })
      await load()
    } finally {
      setBusy(null)
    }
  }

  const counts = useMemo(() => ({ logo: (rows ?? []).filter((r) => r.logo.url).length, none: (rows ?? []).filter((r) => !r.logo.url).length }), [rows])
  const shown = (rows ?? []).filter((r) => (show === "all" ? true : show === "logo" ? r.logo.url : !r.logo.url))

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold">Coach logos</h1>
      <p className="mt-1 max-w-3xl text-sm text-gray-600">
        Each college coach&apos;s program and the logo they see on Coach Home. Check every picture is that school before emailing coaches. A wrong
        one that is the program&apos;s own upload can be removed here.
      </p>
      {error ? <p className="mt-6 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      {!rows && !error ? <p className="mt-6 text-sm text-gray-500">Loading…</p> : null}
      {rows ? (
        <>
          <div className="mt-5 flex flex-wrap gap-2">
            {([
              ["all", `All programs (${rows.length})`],
              ["logo", `Showing a logo (${counts.logo})`],
              ["none", `No logo (${counts.none})`],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setShow(key)}
                aria-pressed={show === key}
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${show === key ? "border-[#003366] bg-[#003366] text-white" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((r) => (
              <li key={r.schoolId} className="flex flex-col rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex h-36 items-center justify-center rounded-lg bg-gray-50">
                  {r.logo.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.logo.url} alt={`Logo shown for ${r.name}`} className="max-h-32 max-w-full object-contain" />
                  ) : (
                    <span className="text-sm text-gray-400">No logo shown</span>
                  )}
                </div>
                <p className="mt-3 text-base font-bold text-gray-900">{r.name}</p>
                <p className={`text-xs font-semibold ${r.logo.source === "none" ? "text-gray-400" : r.logo.source === "uploaded" ? "text-amber-700" : "text-emerald-700"}`}>
                  {SOURCE[r.logo.source]}
                </p>
                <ul className="mt-2 flex-1 text-xs text-gray-600">
                  {r.coaches.map((c) => (
                    <li key={`${c.email}-${c.joined}`} className="truncate" title={c.email ?? ""}>
                      {c.name}
                    </li>
                  ))}
                </ul>
                {r.logo.source === "uploaded" ? (
                  <button
                    type="button"
                    onClick={() => removeUpload(r)}
                    disabled={busy === r.schoolId}
                    className="mt-3 rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {busy === r.schoolId ? "Removing…" : "Wrong picture: remove upload"}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {unattached.length ? (
            <p className="mt-8 text-sm text-gray-600">
              {unattached.length} coach {unattached.length === 1 ? "account has" : "accounts have"} no program attached and see no logo:{" "}
              {unattached.map((c) => c.name).join(", ")}.
            </p>
          ) : null}
        </>
      ) : null}
      </div>
    </main>
  )
}

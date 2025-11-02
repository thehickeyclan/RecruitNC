import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function FindAthleteIdPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const q = (searchParams?.q || "").trim()
  const supabase = createClient()

  let results:
    | { id: string; name: string | null; graduation_year: number | null }[]
    | null = null
  let errorMsg: string | null = null

  if (q) {
    const { data, error } = await supabase
      .from("athletes")
      .select("id,name,graduation_year")
      .ilike("name", `%${q}%`)
      .limit(20)

    if (error) {
      errorMsg = error.message
    } else {
      results = data
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Find Athlete UUID</h1>
      <form className="flex gap-2" action="" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by name (e.g., Liam Hickey)"
          className="flex-1 rounded border px-3 py-2"
        />
        <button type="submit" className="rounded bg-gray-900 text-white px-4 py-2">
          Search
        </button>
      </form>

      {errorMsg && <p className="text-red-600 text-sm">Error: {errorMsg}</p>}

      {results && results.length > 0 && (
        <ul className="divide-y rounded border">
          {results.map((r) => (
            <li key={r.id} className="p-3">
              <div className="font-mono text-xs text-gray-500">{r.id}</div>
              <div className="text-sm">
                {r.name || "Unnamed"} {r.graduation_year ? `(${r.graduation_year})` : ""}
              </div>
            </li>
          ))}
        </ul>
      )}

      {q && results && results.length === 0 && (
        <p className="text-sm text-gray-600">No athletes found for “{q}”.</p>
      )}

      <p className="text-xs text-gray-500">
        Tip: For Liam, try /debug/find-athlete-id?q=Liam%20Hickey
      </p>
    </main>
  )
}

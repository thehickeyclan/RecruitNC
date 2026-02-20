import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import Link from "next/link"

function norm(s: string) {
  return (s || "").trim().replace(/\s+/g, " ").toLowerCase()
}

function getFullName(row: Record<string, unknown>): string {
  const name = (row.name as string)?.trim()
  if (name) return name
  const first = (row.firstname ?? row.firstName ?? row.first_name) as string | undefined
  const last = (row.lastname ?? row.lastName ?? row.last_name) as string | undefined
  return [first, last].filter(Boolean).join(" ").trim() || ""
}

export default async function UnifiedProfileByNamePage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; school?: string; year?: string }>
}) {
  const params = await searchParams
  const name = (params.name || "").trim()
  const school = (params.school || "").trim()
  const year = params.year || "2028"
  const yearNum = parseInt(year, 10)

  if (!name) {
    return (
      <div className="container mx-auto p-8 text-center">
        <p className="text-gray-600">Missing name. Use ?name=First+Last&amp;school=School&amp;year=2028</p>
        <Link href="/public-rankings/2028" className="text-[#13294B] underline mt-4 inline-block">
          Back to 2028 rankings
        </Link>
      </div>
    )
  }

  const supabase = createAdminClient()

  const { data: athletes, error } = await supabase
    .from("athletes")
    .select("id, name, firstname, lastname, firstName, lastName, highschool")
    .in("graduationyear", [yearNum, year])

  if (error || !athletes?.length) {
    return (
      <div className="container mx-auto p-8 text-center">
        <p className="text-gray-600">No profile found for {name}{school ? ` at ${school}` : ""}.</p>
        <Link href="/create-profile" className="text-[#13294B] underline mt-4 inline-block">
          Create profile
        </Link>
        <span className="mx-2">|</span>
        <Link href="/public-rankings/2028" className="text-[#13294B] underline">
          Back to rankings
        </Link>
      </div>
    )
  }

  const wantName = norm(name)
  const wantSchool = norm(school)
  const match = athletes.find((a) => {
    const row = a as Record<string, unknown>
    const full = getFullName(row)
    if (norm(full) !== wantName) return false
    if (!wantSchool) return true
    const hs = norm((row.highschool as string) || "")
    return hs === wantSchool || hs.includes(wantSchool) || wantSchool.includes(hs)
  })

  const id = match ? (match as Record<string, unknown>).id as string : null
  if (id) redirect(`/unified-profile/${id}`)

  return (
    <div className="container mx-auto p-8 text-center">
      <p className="text-gray-600">No profile found for {name}{school ? ` at ${school}` : ""}.</p>
      <Link href="/create-profile" className="text-[#13294B] underline mt-4 inline-block">
        Create profile
      </Link>
      <span className="mx-2">|</span>
      <Link href="/public-rankings/2028" className="text-[#13294B] underline">
        Back to rankings
      </Link>
    </div>
  )
}

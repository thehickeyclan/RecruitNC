import { Suspense } from "react"
import { loadPublicAthleteProfile } from "@/lib/load-public-athlete-profile"
import { ViewProfileClient } from "./view-profile-client"

export const revalidate = 60

type ViewProfilePageProps = {
  searchParams: Promise<{ id?: string }>
}

async function ViewProfilePageInner({ searchParams }: ViewProfilePageProps) {
  const params = await searchParams
  const id = params.id?.trim() ?? ""

  if (!id) {
    return <ViewProfileClient id="" initialAthlete={null} initialError="Missing id. Use ?id= athlete-uuid" />
  }

  const result = await loadPublicAthleteProfile(id)

  return (
    <ViewProfileClient
      id={id}
      initialAthlete={result.ok ? result.athlete : null}
      initialError={result.ok ? null : result.error}
    />
  )
}

export default function ViewProfilePage(props: ViewProfilePageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0A1628] flex items-center justify-center p-6">
          <div className="text-[#D3B574] font-medium animate-pulse">Loading profile…</div>
        </main>
      }
    >
      <ViewProfilePageInner {...props} />
    </Suspense>
  )
}

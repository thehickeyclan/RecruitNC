import { createAdminClient } from "@/lib/supabase/admin"
import { fetchProspectDirectoryAll, yearFilterToApiParams } from "@/lib/prospects-directory"
import ProspectsAllClient from "./prospects-all-client"

export const revalidate = 120

export default async function ProspectsAllPage() {
  let initialProspects: Awaited<ReturnType<typeof fetchProspectDirectoryAll>> = []

  try {
    const supabase = createAdminClient()
    initialProspects = await fetchProspectDirectoryAll(supabase, yearFilterToApiParams("active"))
  } catch (error) {
    console.error("[prospects/all] SSR prefetch failed:", error)
  }

  return <ProspectsAllClient initialProspects={initialProspects as never[]} />
}

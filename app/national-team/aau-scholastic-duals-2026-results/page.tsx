import { AauScholasticDuals2026PublicResults } from "@/components/national-team/aau-scholastic-duals-2026-public-results"
import { getAauScholasticDuals2026RosterDisplayMaps } from "@/lib/content/aau-scholastic-duals-2026-profile-ids"

export const metadata = {
  title: "AAU Scholastic Duals 2026 Results | NC United",
  description:
    "NC United National Team dual meet results, individual records, and tournament recap from AAU Scholastic Duals 2026 in Fort Lauderdale.",
}

export default async function AauScholasticDuals2026ResultsPage() {
  const { profileIdMap, highSchoolMap } = await getAauScholasticDuals2026RosterDisplayMaps()
  return (
    <AauScholasticDuals2026PublicResults profileIdMap={profileIdMap} highSchoolMap={highSchoolMap} />
  )
}

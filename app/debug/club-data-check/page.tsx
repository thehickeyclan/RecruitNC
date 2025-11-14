import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ClubDataCheckPage() {
  // Fetch all athletes from the database
  const { data: athletes, error } = await supabase.from("athletes").select("*")

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Club Data Check</h1>
        <p className="text-red-500">Error fetching data: {error.message}</p>
      </div>
    )
  }

  // Extract all club-related fields for inspection
  const clubData = athletes.map((athlete) => ({
    id: athlete.id,
    name: athlete.name,
    wrestlingClub: athlete.wrestlingClub,
    wrestling_club: athlete.wrestling_club,
    club: athlete.club,
    team_affiliation: athlete.team_affiliation,
    team: athlete.team,
  }))

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Club Data Check</h1>
      <p className="mb-4">Total athletes: {athletes.length}</p>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="border px-4 py-2">ID</th>
              <th className="border px-4 py-2">Athlete Name</th>
              <th className="border px-4 py-2">wrestlingClub</th>
              <th className="border px-4 py-2">wrestling_club</th>
              <th className="border px-4 py-2">club</th>
              <th className="border px-4 py-2">team_affiliation</th>
              <th className="border px-4 py-2">team</th>
            </tr>
          </thead>
          <tbody>
            {clubData.map((data, index) => (
              <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                <td className="border px-4 py-2">{data.id}</td>
                <td className="border px-4 py-2">{data.name}</td>
                <td className="border px-4 py-2">{data.wrestlingClub || "-"}</td>
                <td className="border px-4 py-2">{data.wrestling_club || "-"}</td>
                <td className="border px-4 py-2">{data.club || "-"}</td>
                <td className="border px-4 py-2">{data.team_affiliation || "-"}</td>
                <td className="border px-4 py-2">{data.team || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

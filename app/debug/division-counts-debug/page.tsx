import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function DivisionCountsDebugPage() {
  // Get all athletes with college commitments
  const { data: athletes, error: athletesError } = await supabase
    .from("athletes")
    .select("id, name, college, division, graduationyear")
    .not("college", "is", null)

  if (athletesError) {
    return <div className="p-8 text-red-500">Error loading athletes: {athletesError.message}</div>
  }

  // Count divisions
  const divisionCounts: Record<string, number> = {}
  athletes.forEach((athlete) => {
    const division = athlete.division || "No Division"
    divisionCounts[division] = (divisionCounts[division] || 0) + 1
  })

  // Count by our categorization logic
  const categorizedCounts = {
    "NCAA Division I": 0,
    "NCAA Division II": 0,
    "NCAA Division III": 0,
    NAIA: 0,
    NJCAA: 0,
    Uncategorized: 0,
  }

  athletes.forEach((athlete) => {
    const division = (athlete.division || "").toLowerCase().trim()

    if (division === "ncaa division i" || division === "division i" || division === "d1" || division === "di") {
      categorizedCounts["NCAA Division I"]++
    } else if (
      division === "ncaa division ii" ||
      division === "division ii" ||
      division === "d2" ||
      division === "dii"
    ) {
      categorizedCounts["NCAA Division II"]++
    } else if (
      division === "ncaa division iii" ||
      division === "division iii" ||
      division === "d3" ||
      division === "diii"
    ) {
      categorizedCounts["NCAA Division III"]++
    } else if (division === "naia") {
      categorizedCounts["NAIA"]++
    } else if (division === "njcaa" || division === "juco" || division === "junior college") {
      categorizedCounts["NJCAA"]++
    } else {
      categorizedCounts["Uncategorized"]++
    }
  })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Division Counts Debug</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Total Athletes with College Commitments: {athletes.length}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Raw Division Values in Database</h2>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left pb-2">Division</th>
                <th className="text-right pb-2">Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(divisionCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([division, count]) => (
                  <tr key={division} className="border-t">
                    <td className="py-2">{division || "Empty String"}</td>
                    <td className="text-right py-2">{count}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Categorized Division Counts</h2>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left pb-2">Category</th>
                <th className="text-right pb-2">Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(categorizedCounts).map(([category, count]) => (
                <tr key={category} className="border-t">
                  <td className="py-2">{category}</td>
                  <td className="text-right py-2">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Athletes with Uncategorized Divisions</h2>
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left pb-2">Name</th>
              <th className="text-left pb-2">College</th>
              <th className="text-left pb-2">Division</th>
            </tr>
          </thead>
          <tbody>
            {athletes
              .filter((athlete) => {
                const division = (athlete.division || "").toLowerCase().trim()
                return !(
                  division === "ncaa division i" ||
                  division === "division i" ||
                  division === "d1" ||
                  division === "di" ||
                  division === "ncaa division ii" ||
                  division === "division ii" ||
                  division === "d2" ||
                  division === "dii" ||
                  division === "ncaa division iii" ||
                  division === "division iii" ||
                  division === "d3" ||
                  division === "diii" ||
                  division === "naia" ||
                  division === "njcaa" ||
                  division === "juco" ||
                  division === "junior college"
                )
              })
              .map((athlete) => (
                <tr key={athlete.id} className="border-t">
                  <td className="py-2">{athlete.name}</td>
                  <td className="py-2">{athlete.college}</td>
                  <td className="py-2">{athlete.division || "No Division"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

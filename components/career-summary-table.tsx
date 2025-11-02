"use client"

interface CareerSummary {
  totalWins?: number
  totalLosses?: number
  totalMatches?: number
  pins?: number
  techFalls?: number
  decisions?: number
  majorDecisions?: number
  winPercentage?: number
  finishingRate?: number
}

interface SeasonData {
  season: string
  wins: number
  losses: number
  matches: Array<{
    date?: string
    opponent?: string
    result?: string
    method?: string
  }>
}

interface CareerSummaryTableProps {
  careerSummary?: CareerSummary
  seasonData?: SeasonData[]
}

export function CareerSummaryTable({ careerSummary, seasonData = [] }: CareerSummaryTableProps) {
  // Handle undefined careerSummary
  if (!careerSummary) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Career Summary</h3>
        <p className="text-gray-600">No career data available</p>
      </div>
    )
  }

  const {
    totalWins = 0,
    totalLosses = 0,
    totalMatches = 0,
    pins = 0,
    techFalls = 0,
    decisions = 0,
    majorDecisions = 0,
    winPercentage = 0,
    finishingRate = 0,
  } = careerSummary

  return (
    <div className="space-y-6">
      {/* Career Totals */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Career Totals</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{totalWins}</div>
            <div className="text-sm text-gray-600">Wins</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{totalLosses}</div>
            <div className="text-sm text-gray-600">Losses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalMatches}</div>
            <div className="text-sm text-gray-600">Total Matches</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{winPercentage.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Win Rate</div>
          </div>
        </div>
      </div>

      {/* Win Methods Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Win Methods</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-red-500">{pins}</div>
            <div className="text-sm text-gray-600">Pins</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-orange-500">{techFalls}</div>
            <div className="text-sm text-gray-600">Tech Falls</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-500">{decisions}</div>
            <div className="text-sm text-gray-600">Decisions</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-500">{majorDecisions}</div>
            <div className="text-sm text-gray-600">Major Decisions</div>
          </div>
        </div>
      </div>

      {/* Season by Season */}
      {seasonData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Season by Season</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-4 font-medium text-gray-900">Season</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-900">Record</th>
                  <th className="text-left py-2 px-4 font-medium text-gray-900">Matches</th>
                </tr>
              </thead>
              <tbody>
                {seasonData.map((season, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-2 px-4">{season.season}</td>
                    <td className="py-2 px-4">
                      {season.wins}-{season.losses}
                    </td>
                    <td className="py-2 px-4">{season.matches.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

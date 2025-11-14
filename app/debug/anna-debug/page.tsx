"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function AnnaDebugPage() {
  const [annaData, setAnnaData] = useState<any>(null)
  const [rawData, setRawData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchAnnaData = async () => {
    setLoading(true)
    try {
      // Get processed data
      const processedResponse = await fetch("/api/match-records")
      const processedData = await processedResponse.json()
      const anna = processedData.wrestlers?.find((w: any) => w.first_name.toLowerCase().includes("anna"))
      setAnnaData(anna)

      // Get raw data
      const rawResponse = await fetch("/api/debug/match-data-raw")
      const rawDataResult = await rawResponse.json()
      const annaRaw = rawDataResult.records?.filter((r: any) => r.first_name?.toLowerCase().includes("anna"))
      setRawData(annaRaw)
    } catch (error) {
      console.error("Error fetching Anna's data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnnaData()
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Anna Debug Page</h1>

      <div className="space-y-6">
        <Button onClick={fetchAnnaData} disabled={loading}>
          {loading ? "Loading..." : "Refresh Anna's Data"}
        </Button>

        {annaData && (
          <Alert>
            <AlertDescription>
              <h3 className="font-bold mb-2">Processed Anna Data:</h3>
              <div className="bg-gray-100 p-4 rounded text-sm">
                <p>
                  <strong>Name:</strong> {annaData.first_name} {annaData.last_name}
                </p>
                <p>
                  <strong>High School:</strong> {annaData.high_school}
                </p>
                <p>
                  <strong>Career Record:</strong> {annaData.career_totals.wins}-{annaData.career_totals.losses}
                </p>
                <p>
                  <strong>Career Win %:</strong> {annaData.career_totals.win_percentage}%
                </p>
                <p>
                  <strong>Total Matches:</strong> {annaData.career_totals.total_matches}
                </p>

                <h4 className="font-bold mt-4 mb-2">Seasons:</h4>
                {Object.values(annaData.seasons).map((season: any, index: number) => (
                  <div key={index} className="ml-4 mb-2">
                    <p>
                      <strong>
                        {season.grade} ({season.season}):
                      </strong>
                    </p>
                    <p className="ml-4">
                      Record: {season.wins}-{season.losses}
                    </p>
                    <p className="ml-4">Total Matches: {season.total_matches}</p>
                    <p className="ml-4">Win %: {season.win_percentage.toFixed(1)}%</p>
                    <p className="ml-4">
                      <strong>Calculation:</strong> {season.wins} ÷ {season.total_matches} ={" "}
                      {season.win_percentage.toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {rawData && (
          <Alert>
            <AlertDescription>
              <h3 className="font-bold mb-2">Raw Database Records for Anna:</h3>
              <div className="bg-gray-100 p-4 rounded text-sm max-h-96 overflow-y-auto">
                {rawData.map((record: any, index: number) => (
                  <div key={index} className="mb-4 p-2 border-b">
                    <p>
                      <strong>Season:</strong> {record.season}
                    </p>
                    <p>
                      <strong>Grade:</strong> {record.grade}
                    </p>
                    <p>
                      <strong>Wins:</strong> {record.wins}
                    </p>
                    <p>
                      <strong>Losses:</strong> {record.losses}
                    </p>
                    <p>
                      <strong>Total Matches:</strong> {record.total_matches}
                    </p>
                    <p>
                      <strong>Expected Win %:</strong>{" "}
                      {record.wins && record.total_matches
                        ? ((record.wins / record.total_matches) * 100).toFixed(1)
                        : "N/A"}
                      %
                    </p>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!annaData && !loading && (
          <Alert>
            <AlertDescription>
              No Anna data found. Check if there are records for Anna in the database.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
